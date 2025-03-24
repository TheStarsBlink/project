import * as puppeteer from 'puppeteer';
import { QueueTask, StatusResponse, BrowserConfig } from '../types';
import fs from 'fs';
import os from 'os';

// 根据操作系统自动获取Chrome可执行文件路径
export function getChromePath(): string | undefined {
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
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
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

/**
 * 截图队列类，用于管理和执行截图任务
 */
export class ScreenshotQueue {
  private browserInstance: puppeteer.Browser | null = null;
  private queue: QueueTask<Uint8Array>[] = [];
  private processing = 0;
  private active = false;
  private lastActivity = Date.now();
  private readonly maxConcurrentJobs: number;

  constructor(maxConcurrentJobs = 5) {
    this.maxConcurrentJobs = maxConcurrentJobs;
  }

  /**
   * 获取浏览器实例，如果不存在则创建
   */
  async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browserInstance) {
      console.log('启动浏览器...');
      this.browserInstance = await puppeteer.launch(DEFAULT_BROWSER_CONFIG as puppeteer.LaunchOptions);
      this.active = true;
    }
    this.lastActivity = Date.now();
    return this.browserInstance;
  }

  /**
   * 添加任务到队列
   */
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

  /**
   * 处理队列中的任务
   */
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

  /**
   * 获取队列状态
   */
  getStatus(): StatusResponse {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxConcurrentJobs: this.maxConcurrentJobs,
      browserActive: this.active,
      lastActivity: new Date(this.lastActivity).toISOString()
    };
  }

  /**
   * 启动浏览器监控，自动关闭长时间不活动的浏览器
   */
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