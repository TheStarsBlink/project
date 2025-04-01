import * as puppeteer from 'puppeteer';
import { Request, Response } from 'express';
import { setTimeout } from 'timers/promises';
import path from 'path';
import fs from 'fs';
import {
  ScreenshotRequest,
  ScreenshotOptions,
  BasemapConfig,
  QueueTask,
  BrowserConfig,
  PageConfig
} from '../types';
import { ScreenshotQueue } from './queue';
import { GeoDataProcessor, GeoDataOptions } from '../utils/geoData-simple';

// 默认页面配置
const DEFAULT_PAGE_CONFIG: PageConfig = {
  width: 1920,
  height: 1080,
  timeout: 30000,
  navigationTimeout: 60000
};

// 底图配置存储
let basemapConfigurations: BasemapConfig[] = [];

/**
 * 设置基本的截图路由
 * @param app Express 应用实例
 * @param screenshotQueue 截图队列
 * @param port 服务器端口
 */
export function setupScreenshotRoutes(app: any, screenshotQueue: ScreenshotQueue, port: number | string) {
  // URL 截图接口
  app.post('/screenshot/url', handleUrlScreenshot(screenshotQueue));
  
  // Cesium 截图接口
  app.get('/screenshot', handleCesiumScreenshot(screenshotQueue, port));
  
  // 地理数据截图接口
  app.post('/screenshot/geo', handleGeoScreenshot(screenshotQueue, port));
  
  // 底图配置接口
  app.post('/basemap/config', handleBasemapConfigCreate);
  app.get('/basemap/config', handleBasemapConfigList);
  app.delete('/basemap/config/:name', handleBasemapConfigDelete);
}

/**
 * 处理 URL 截图请求
 */
function handleUrlScreenshot(screenshotQueue: ScreenshotQueue) {
  return async (req: Request<Record<string, never>, unknown, ScreenshotRequest>, res: Response) => {
    const { url, width, height, waitFor, selector, timeout, options } = req.body;
  
    if (!url) {
      return res.status(400).send('URL 是必需的参数');
    }
  
    try {
      const screenshot = await screenshotQueue.add(async () => {
        let page: puppeteer.Page | null = null;
        try {
          console.log(`开始处理 URL 截图请求: ${url}`);
          const browser = await screenshotQueue.getBrowser();
          
          // 创建新页面
          page = await browser.newPage();
          console.log('新页面创建成功');
          
          // 设置视口大小
          if (page) {
            await page.setViewport({
              width: width || DEFAULT_PAGE_CONFIG.width,
              height: height || DEFAULT_PAGE_CONFIG.height
            });
            console.log('视口设置完成');
          }
  
          // 设置超时时间
          const pageTimeout = timeout || DEFAULT_PAGE_CONFIG.timeout;
          page.setDefaultNavigationTimeout(pageTimeout);
          page.setDefaultTimeout(pageTimeout);
  
          // 设置用户代理
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
          // 导航到指定 URL
          console.log(`导航到 URL: ${url}`);
          await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: pageTimeout
          });
          console.log('页面加载完成');
  
          // 等待特定元素
          if (selector) {
            console.log(`等待选择器: ${selector}`);
            await page.waitForSelector(selector, { timeout: pageTimeout });
            console.log('元素加载完成');
          }
  
          // 等待额外时间，确保页面完全渲染
          if (waitFor && waitFor > 0) {
            console.log(`等待额外时间: ${waitFor}ms`);
            await setTimeout(waitFor);
          }
  
          // 获取截图元素
          const element = selector ? await page.$(selector) : page;
          if (!element) {
            throw new Error('无法找到指定的元素');
          }
  
          // 根据选项进行截图
          console.log('开始截图...');
          const screenshotOptions: ScreenshotOptions = {
            ...options,
            encoding: 'binary'
          };
          return await element.screenshot(screenshotOptions as puppeteer.ScreenshotOptions);
        } finally {
          if (page) {
            await page.close();
            console.log('页面已关闭');
          }
        }
      });
  
      // 发送截图
      res.setHeader('Content-Type', 'image/png');
      res.send(screenshot);
      console.log('图片已发送到客户端');
    } catch (error) {
      console.error('截图过程中发生错误:', error);
      console.error('错误堆栈:', error instanceof Error ? error.stack : '');
      res.status(500).send(`截图失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
}

/**
 * 处理 Cesium 截图请求
 */
function handleCesiumScreenshot(screenshotQueue: ScreenshotQueue, port: number | string) {
  return async (req: Request, res: Response) => {
    const { basemapName } = req.query;
    let basemapConfig: BasemapConfig | undefined;
    
    if (basemapName && typeof basemapName === 'string') {
      basemapConfig = basemapConfigurations.find(c => c.name === basemapName);
    }
  
    try {
      const screenshot = await screenshotQueue.add(async () => {
        let page: puppeteer.Page | null = null;
        try {
          console.log('开始 Cesium 截图流程...');
          const browser = await screenshotQueue.getBrowser();
  
          // 创建新页面
          page = await browser.newPage();
          console.log('新页面创建成功');
          
          // 设置视口大小
          if (page) {
            await page.setViewport({
              width: DEFAULT_PAGE_CONFIG.width,
              height: DEFAULT_PAGE_CONFIG.height
            });
            console.log('视口设置完成');
          }
  
          // 设置更长的超时时间
          const extendedTimeout = 120000; // 两分钟
          page.setDefaultNavigationTimeout(extendedTimeout);
          page.setDefaultTimeout(extendedTimeout);
  
          // 加载包含 Cesium 的页面
          console.log('开始加载页面...');
          try {
            // 使用file协议直接加载文件，避免本地服务器问题
            const htmlPath = path.resolve(process.cwd(), 'public/cesium.html');
            await page.goto(`file://${htmlPath}`, {
              waitUntil: 'domcontentloaded' // 使用更宽松的等待条件
            });
            console.log('页面加载完成 (使用文件协议)');
          } catch (loadError) {
            console.log('文件协议加载失败，尝试使用HTTP协议...');
            // 如果文件协议失败，回退到HTTP
            await page.goto(`http://localhost:${port}/cesium.html`, {
              waitUntil: 'domcontentloaded'
            });
            console.log('页面加载完成 (使用HTTP协议)');
          }
          
          // 注入检测代码，用于检查Cesium加载状态
          console.log('等待页面内容渲染...');
          await page.waitForSelector('#cesiumContainer', { timeout: 10000 })
            .catch(() => console.log('未找到cesiumContainer元素，继续执行'));
  
          // 如果有底图配置，注入配置代码
          if (basemapConfig) {
            console.log(`使用底图配置: ${basemapConfig.name}`);
            // 注入底图配置代码
            await page.evaluate((config) => {
              if (window.viewer && window.viewer.scene) {
                // 移除默认图层
                window.viewer.imageryLayers.removeAll();
                
                // 根据配置类型创建图层
                let imageryProvider;
                const { type, url, params } = config;
                
                switch (type) {
                  case 'wmts':
                    imageryProvider = new window.Cesium.WebMapTileServiceImageryProvider({
                      url: url,
                      layer: params.layer || 'default',
                      style: params.style || 'default',
                      format: params.format || 'tiles',
                      tileMatrixSetID: params.tileMatrixSetID || 'default',
                      maximumLevel: params.maximumLevel || 18
                    });
                    break;
                  case 'wms':
                    imageryProvider = new window.Cesium.WebMapServiceImageryProvider({
                      url: url,
                      layers: params.layer || 'default',
                      parameters: {
                        format: params.format || 'image/png',
                        transparent: params.transparent !== undefined ? params.transparent : true
                      }
                    });
                    break;
                  case 'xyz':
                    imageryProvider = new window.Cesium.UrlTemplateImageryProvider({
                      url: url
                    });
                    break;
                }
                
                // 添加图层
                if (imageryProvider) {
                  window.viewer.imageryLayers.addImageryProvider(imageryProvider);
                }
              }
            }, basemapConfig);
          }
  
          // 等待一段时间确保渲染
          console.log('等待页面渲染...');
          await setTimeout(8000);
          
          // 尝试等待Cesium加载，但如果失败也继续执行
          try {
            console.log('等待 Cesium 场景加载...');
            await page.waitForFunction(() => {
              return window.viewer && window.viewer.scene;
            }, { timeout: 10000 });
            console.log('Cesium 场景加载完成');
            
            // 再等待额外时间让地球渲染
            await setTimeout(5000);
          } catch (cesiumError) {
            console.log('Cesium场景等待超时，但仍将尝试截图');
          }
  
          // 截图
          console.log('开始截图...');
          return await page.screenshot({
            fullPage: true,
            encoding: 'binary'
          } as puppeteer.ScreenshotOptions);
        } finally {
          if (page) {
            await page.close();
            console.log('页面已关闭');
          }
        }
      });
  
      // 发送截图
      res.setHeader('Content-Type', 'image/png');
      res.send(screenshot);
      console.log('图片已发送到客户端');
    } catch (error) {
      console.error('截图过程中发生错误:', error);
      console.error('错误堆栈:', error instanceof Error ? error.stack : '');
      res.status(500).send(`截图失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
}

/**
 * 处理地理数据截图请求
 */
function handleGeoScreenshot(screenshotQueue: ScreenshotQueue, port: number | string) {
  return async (req: Request<Record<string, never>, unknown, { filePath: string; options?: GeoDataOptions }>, res: Response) => {
    try {
      const { filePath, options } = req.body;
  
      if (!filePath) {
        return res.status(400).send('文件路径是必需的参数');
      }
  
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('文件不存在');
      }

      // 使用简化版处理器处理文件
      const processor = new GeoDataProcessor();
      let geoData;
      try {
        geoData = await processor.processFile(filePath, options);
      } catch (error) {
        return res.status(400).send(`文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
      
      // 创建简单的HTML以显示数据
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>GeoJSON Viewer</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
    #map { width: 100%; height: 100%; }
    pre { padding: 10px; background: #f5f5f5; overflow: auto; max-height: 500px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const geoData = ${JSON.stringify(geoData)};
    console.log('GeoData loaded:', geoData);
    document.getElementById('map').innerHTML = '<pre>' + JSON.stringify(geoData, null, 2) + '</pre>';
  </script>
</body>
</html>`;

      // 创建临时 HTML 文件
      const tempHtmlPath = path.join(__dirname, '../../public/temp.html');
      await fs.promises.writeFile(tempHtmlPath, html);
  
      // 使用现有的截图队列处理截图
      const requestOptions: ScreenshotRequest = {
        url: `http://localhost:${port}/temp.html`,
        width: 1920,
        height: 1080,
        waitFor: 1000,
        options: {
          fullPage: true
        }
      };
  
      const imageBuffer = await screenshotQueue.add(async () => {
        const browser = await screenshotQueue.getBrowser();
        const page = await browser.newPage();
        try {
          if (page) {
            await page.setViewport({
              width: requestOptions.width || DEFAULT_PAGE_CONFIG.width,
              height: requestOptions.height || DEFAULT_PAGE_CONFIG.height
            });
          }
  
          await page.goto(requestOptions.url, {
            waitUntil: 'networkidle0',
            timeout: requestOptions.timeout || 30000
          });
  
          if (requestOptions.waitFor) {
            await setTimeout(requestOptions.waitFor);
          }
  
          if (requestOptions.selector) {
            await page.waitForSelector(requestOptions.selector);
          }
  
          const element = requestOptions.selector
            ? await page.$(requestOptions.selector)
            : page;
  
          if (!element) {
            throw new Error('无法找到指定的元素');
          }
  
          const screenshotOptions: ScreenshotOptions = {
            ...requestOptions.options,
            encoding: 'binary'
          };
  
          return await element.screenshot(screenshotOptions as puppeteer.ScreenshotOptions);
        } finally {
          await page.close();
        }
      });
  
      // 删除临时文件
      await fs.promises.unlink(tempHtmlPath);
  
      res.setHeader('Content-Type', 'image/png');
      res.send(imageBuffer);
    } catch (error) {
      console.error('地理数据截图失败:', error);
      res.status(500).send('地理数据截图失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };
}

/**
 * 创建底图配置
 */
function handleBasemapConfigCreate(req: Request<Record<string, never>, unknown, BasemapConfig>, res: Response) {
  const config = req.body;
  
  if (!config || !config.name || !config.type || !config.url) {
    return res.status(400).send('底图配置缺少必要参数');
  }
  
  // 添加或更新配置
  const existingIndex = basemapConfigurations.findIndex(c => c.name === config.name);
  if (existingIndex >= 0) {
    basemapConfigurations[existingIndex] = config;
  } else {
    basemapConfigurations.push(config);
  }
  
  res.status(200).json({ success: true, message: '配置已保存' });
}

/**
 * 获取底图配置列表
 */
function handleBasemapConfigList(_req: Request, res: Response) {
  res.status(200).json(basemapConfigurations);
}

/**
 * 删除底图配置
 */
function handleBasemapConfigDelete(req: Request, res: Response) {
  const { name } = req.params;
  const initialLength = basemapConfigurations.length;
  
  basemapConfigurations = basemapConfigurations.filter(c => c.name !== name);
  
  if (basemapConfigurations.length < initialLength) {
    res.status(200).json({ success: true, message: '配置已删除' });
  } else {
    res.status(404).json({ success: false, message: '未找到配置' });
  }
}

/**
 * 获取底图配置服务
 */
export function getBasemapConfigurations(): BasemapConfig[] {
  return basemapConfigurations;
}

/**
 * 声明 window 的全局类型扩展
 */
declare global {
  interface Window {
    viewer: {
      scene: {
        globe: object;
      };
      imageryLayers: {
        removeAll: () => void;
        addImageryProvider: (provider: any) => void;
      };
    };
    Cesium: {
      WebMapTileServiceImageryProvider: any;
      WebMapServiceImageryProvider: any;
      UrlTemplateImageryProvider: any;
    };
  }
} 