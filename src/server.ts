import express, { Request, Response } from 'express';
import puppeteer, { Browser, Page } from 'puppeteer';
import {
  ScreenshotRequest,
  ScreenshotOptions,
  StatusResponse,
  QueueTask,
  BrowserConfig,
  PageConfig
} from './types';
import { GeoDataProcessor, GeoDataOptions } from './utils/geoData';
import path from 'path';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 3000;
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS) || 5;

// 默认浏览器配置
const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process'
  ],
  executablePath: process.env.CHROME_PATH
};

// 默认页面配置
const DEFAULT_PAGE_CONFIG: PageConfig = {
  width: 1920,
  height: 1080,
  timeout: 30000,
  navigationTimeout: 60000
};

// 工作队列
class ScreenshotQueue {
  private queue: QueueTask<Buffer>[] = [];
  private processing = 0;
  private maxConcurrent: number;
  private browserInstance: Browser | null = null;
  private lastActivity: number = Date.now();

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browserInstance) {
      console.log('启动新的浏览器实例...');
      this.browserInstance = await puppeteer.launch(DEFAULT_BROWSER_CONFIG);
      console.log('浏览器实例启动成功');
    }
    this.lastActivity = Date.now();
    return this.browserInstance;
  }

  startBrowserMonitor(): void {
    setInterval(async () => {
      if (this.browserInstance && this.processing === 0 && Date.now() - this.lastActivity > 300000) {
        console.log('浏览器长时间不活动，关闭以节省资源');
        await this.browserInstance.close();
        this.browserInstance = null;
      }
    }, 60000);
  }

  async add(task: () => Promise<Buffer>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const { task, resolve, reject } = this.queue.shift()!;

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.processing--;
      this.processQueue();
    }
  }

  getStatus(): StatusResponse {
    return {
      queueLength: this.queue.length,
      processingJobs: this.processing,
      maxConcurrentJobs: this.maxConcurrent,
      browserActive: !!this.browserInstance,
      lastActivity: this.lastActivity
    };
  }
}

const screenshotQueue = new ScreenshotQueue(MAX_CONCURRENT_JOBS);
screenshotQueue.startBrowserMonitor();

// 中间件
app.use(express.static('public'));
app.use(express.json());

// 状态接口
app.get('/status', (_req: Request, res: Response) => {
  res.json(screenshotQueue.getStatus());
});

// URL 截图接口
app.post('/screenshot/url', async (req: Request<Record<string, never>, unknown, ScreenshotRequest>, res: Response) => {
  const { url, width, height, waitFor, selector, timeout, options } = req.body;

  if (!url) {
    return res.status(400).send('URL 是必需的参数');
  }

  try {
    const screenshot = await screenshotQueue.add(async () => {
      let page: Page | null = null;
      try {
        console.log(`开始处理 URL 截图请求: ${url}`);
        const browser = await screenshotQueue.getBrowser();
        
        // 创建新页面
        page = await browser.newPage();
        console.log('新页面创建成功');
        
        // 设置视口大小
        await page.setViewport({
          width: width || DEFAULT_PAGE_CONFIG.width,
          height: height || DEFAULT_PAGE_CONFIG.height
        });
        console.log('视口设置完成');

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
          await page.waitForTimeout(waitFor);
        }

        // 截图
        console.log('开始截图...');
        const screenshotOptions: ScreenshotOptions = {
          fullPage: true,
          ...options
        };
        const screenshot = await page.screenshot(screenshotOptions);
        console.log('截图完成');

        return screenshot as Buffer;
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
});

// Cesium 截图接口
app.get('/screenshot', async (_req: Request, res: Response) => {
  try {
    const screenshot = await screenshotQueue.add(async () => {
      let page: Page | null = null;
      try {
        console.log('开始 Cesium 截图流程...');
        const browser = await screenshotQueue.getBrowser();

        // 创建新页面
        page = await browser.newPage();
        console.log('新页面创建成功');
        
        // 设置视口大小
        await page.setViewport({
          width: DEFAULT_PAGE_CONFIG.width,
          height: DEFAULT_PAGE_CONFIG.height
        });
        console.log('视口设置完成');

        // 设置超时时间
        page.setDefaultNavigationTimeout(DEFAULT_PAGE_CONFIG.navigationTimeout);
        page.setDefaultTimeout(DEFAULT_PAGE_CONFIG.timeout);

        // 加载包含 Cesium 的页面
        console.log('开始加载页面...');
        await page.goto(`http://localhost:${port}/index.html`, {
          waitUntil: 'networkidle0'
        });
        console.log('页面加载完成');

        // 等待 Cesium 场景加载完成
        console.log('等待 Cesium 场景加载...');
        await page.waitForFunction(() => {
          return window.viewer && window.viewer.scene && window.viewer.scene.globe;
        }, { timeout: DEFAULT_PAGE_CONFIG.timeout });
        console.log('Cesium 场景加载完成');

        // 等待一段时间确保场景完全渲染
        await page.waitForTimeout(5000);
        console.log('等待额外渲染时间完成');

        // 截图
        console.log('开始截图...');
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: true
        });
        console.log('截图完成');

        return screenshot as Buffer;
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
});

// 添加地理数据截图接口
app.post('/screenshot/geo', async (req: Request<Record<string, never>, unknown, { filePath: string; options?: GeoDataOptions }>, res: Response) => {
  try {
    const { filePath, options } = req.body;

    if (!filePath) {
      return res.status(400).send('文件路径是必需的参数');
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('文件不存在');
    }

    // 根据文件扩展名选择处理方法
    const ext = path.extname(filePath).toLowerCase();
    let geoData;
    switch (ext) {
      case '.json':
      case '.geojson':
        geoData = await GeoDataProcessor.readGeoJSON(filePath);
        break;
      case '.shp':
        geoData = await GeoDataProcessor.readSHP(filePath);
        break;
      case '.kml':
        geoData = await GeoDataProcessor.readKML(filePath);
        break;
      case '.gml':
        geoData = await GeoDataProcessor.readGML(filePath);
        break;
      case '.topojson':
        geoData = await GeoDataProcessor.readTopoJSON(filePath);
        break;
      case '.csv':
        if (!options?.csvOptions?.longitudeColumn || !options?.csvOptions?.latitudeColumn) {
          return res.status(400).send('CSV 文件需要指定经度和纬度列名');
        }
        geoData = await GeoDataProcessor.readCSV(filePath, options.csvOptions);
        break;
      default:
        return res.status(400).send('不支持的文件格式');
    }

    // 生成 Cesium 场景配置
    const html = GeoDataProcessor.generateCesiumConfig(geoData, options);

    // 创建临时 HTML 文件
    const tempHtmlPath = path.join(__dirname, '../public/temp.html');
    await fs.promises.writeFile(tempHtmlPath, html);

    // 使用现有的截图队列处理截图
    const requestOptions: ScreenshotRequest = {
      url: `http://localhost:${port}/temp.html`,
      width: typeof options?.width === 'number' ? options.width : 1920,
      height: typeof options?.height === 'number' ? options.height : 1080,
      waitFor: 2000, // 等待地图加载
      options: {
        fullPage: true
      }
    };

    const imageBuffer = await screenshotQueue.add(async () => {
      const browser = await screenshotQueue.getBrowser();
      const page = await browser.newPage();
      try {
        await page.setViewport({
          width: requestOptions.width || DEFAULT_PAGE_CONFIG.width,
          height: requestOptions.height || DEFAULT_PAGE_CONFIG.height
        });

        await page.goto(requestOptions.url, {
          waitUntil: 'networkidle0',
          timeout: requestOptions.timeout || 30000
        });

        if (requestOptions.waitFor) {
          await page.waitForTimeout(requestOptions.waitFor);
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

        return await element.screenshot(screenshotOptions);
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
});

// 声明 window 的全局类型扩展
declare global {
  interface Window {
    viewer: {
      scene: {
        globe: any;
      };
    };
  }
}

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 