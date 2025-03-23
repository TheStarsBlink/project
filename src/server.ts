import express, { Request, Response } from 'express';
import * as puppeteer from 'puppeteer';
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
import { setTimeout } from 'timers/promises';
import os from 'os';

const app = express();
const port = process.env.PORT || 3000;
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS) || 5;

// 根据操作系统自动获取Chrome可执行文件路径
function getChromePath(): string | undefined {
  const platform = os.platform();
  
  // 如果有环境变量设置的路径，优先使用
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  // 根据不同操作系统返回默认Chrome路径
  switch(platform) {
    case 'win32': {
      // Windows 常见路径
      const windowsPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      ];
      for (const path of windowsPaths) {
        if (fs.existsSync(path)) {
          return path;
        }
      }
      break;
    }
    case 'linux': {
      // Linux 常见路径
      const linuxPaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      ];
      for (const path of linuxPaths) {
        if (fs.existsSync(path)) {
          return path;
        }
      }
      break;
    }
    case 'darwin': {
      // macOS 常见路径
      const macPaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      ];
      for (const path of macPaths) {
        if (fs.existsSync(path)) {
          return path;
        }
      }
      break;
    }
  }
  
  // 没有找到Chrome，返回undefined，让Puppeteer自己尝试查找
  console.log('未找到Chrome可执行文件路径，Puppeteer将尝试自动查找');
  return undefined;
}

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
  executablePath: getChromePath()
};

// 记录Chrome配置信息
console.log(`操作系统: ${os.platform()}`);
console.log(`Chrome路径: ${DEFAULT_BROWSER_CONFIG.executablePath || '由Puppeteer自动查找'}`);

// 默认页面配置
const DEFAULT_PAGE_CONFIG: PageConfig = {
  width: 1920,
  height: 1080,
  timeout: 30000,
  navigationTimeout: 60000
};

// 工作队列
class ScreenshotQueue {
  private browserInstance: puppeteer.Browser | null = null;
  private queue: QueueTask<Uint8Array>[] = [];
  private processing = 0;
  private active = false;
  private lastActivity = Date.now();
  private readonly maxConcurrentJobs: number;

  constructor(maxConcurrentJobs = MAX_CONCURRENT_JOBS) {
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browserInstance) {
      console.log('启动浏览器...');
      this.browserInstance = await puppeteer.launch(DEFAULT_BROWSER_CONFIG as puppeteer.LaunchOptions);
      this.active = true;
    }
    this.lastActivity = Date.now();
    return this.browserInstance;
  }

  async add(fn: () => Promise<Uint8Array>): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const task: QueueTask<Uint8Array> = {
        fn,
        resolve,
        reject
      };
      
      this.queue.push(task);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing >= this.maxConcurrentJobs || this.queue.length === 0) {
      return;
    }

    this.processing += 1;
    const task = this.queue.shift();

    try {
      const result = await task!.fn();
      task!.resolve(result);
    } catch (error) {
      task!.reject(error);
    } finally {
      this.processing -= 1;
      this.lastActivity = Date.now();
      this.processQueue();
    }
  }

  getStatus(): StatusResponse {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxConcurrentJobs: this.maxConcurrentJobs,
      browserActive: this.active,
      lastActivity: new Date(this.lastActivity).toISOString()
    };
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
});

// Cesium 截图接口
app.get('/screenshot', async (_req: Request, res: Response) => {
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
});

// 声明 window 的全局类型扩展
declare global {
  interface Window {
    viewer: {
      scene: {
        globe: object;
      };
    };
  }
}

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 