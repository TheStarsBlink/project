import * as puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { ScreenshotQueue } from './queue';
import { ScreenshotOptions } from '../types';

// 定期截图任务配置接口
export interface ScheduledScreenshotConfig {
  id: string;
  url: string;
  interval: number; // 截图间隔，单位为毫秒
  outputDir: string; // 输出目录
  width?: number;
  height?: number;
  selector?: string;
  options?: ScreenshotOptions;
  maxScreenshots?: number; // 最大截图数量，超过后会覆盖最旧的截图
}

// 定期截图任务状态
export interface ScheduledScreenshotStatus {
  id: string;
  url: string;
  interval: number;
  outputDir: string;
  isRunning: boolean;
  lastScreenshot: string | null;
  screenshotCount: number;
  startTime: string;
}

/**
 * 定期截图调度器
 */
export class ScreenshotScheduler {
  private tasks: Map<string, {
    config: ScheduledScreenshotConfig,
    status: ScheduledScreenshotStatus,
    stopFlag: boolean
  }> = new Map();
  
  private screenshotQueue: ScreenshotQueue;
  
  constructor(screenshotQueue: ScreenshotQueue) {
    this.screenshotQueue = screenshotQueue;
  }
  
  /**
   * 开始定期截图任务
   */
  async startTask(config: ScheduledScreenshotConfig): Promise<string> {
    // 确保任务ID唯一
    const taskId = config.id || `task_${Date.now()}`;
    
    // 检查是否已存在同ID任务
    if (this.tasks.has(taskId)) {
      throw new Error(`任务ID ${taskId} 已存在`);
    }
    
    // 确保输出目录存在
    const outputDir = path.resolve(config.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 初始化任务状态
    const status: ScheduledScreenshotStatus = {
      id: taskId,
      url: config.url,
      interval: config.interval,
      outputDir: outputDir,
      isRunning: true,
      lastScreenshot: null,
      screenshotCount: 0,
      startTime: new Date().toISOString()
    };
    
    // 保存任务配置和状态
    this.tasks.set(taskId, {
      config,
      status,
      stopFlag: false
    });
    
    // 启动截图循环
    this.runScreenshotLoop(taskId).catch(error => {
      console.error(`任务 ${taskId} 发生错误:`, error);
      const task = this.tasks.get(taskId);
      if (task) {
        task.status.isRunning = false;
      }
    });
    
    return taskId;
  }
  
  /**
   * 停止定期截图任务
   */
  stopTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }
    
    task.stopFlag = true;
    return true;
  }
  
  /**
   * 获取所有任务状态
   */
  getAllTaskStatus(): ScheduledScreenshotStatus[] {
    return Array.from(this.tasks.values()).map(task => task.status);
  }
  
  /**
   * 获取单个任务状态
   */
  getTaskStatus(taskId: string): ScheduledScreenshotStatus | null {
    const task = this.tasks.get(taskId);
    return task ? task.status : null;
  }
  
  /**
   * 运行截图循环
   */
  private async runScreenshotLoop(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }
    
    const { config, status } = task;
    
    while (!task.stopFlag) {
      try {
        // 执行截图
        const timestamp = Date.now();
        const filename = `screenshot_${taskId}_${timestamp}.png`;
        const filePath = path.join(config.outputDir, filename);
        
        const screenshot = await this.screenshotQueue.add(async () => {
          let page: puppeteer.Page | null = null;
          try {
            console.log(`[${taskId}] 开始定期截图: ${config.url}`);
            const browser = await this.screenshotQueue.getBrowser();
            
            // 创建新页面
            page = await browser.newPage();
            
            // 设置视口大小
            await page.setViewport({
              width: config.width || 1920,
              height: config.height || 1080
            });
            
            // 设置用户代理
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // 导航到指定URL
            await page.goto(config.url, {
              waitUntil: 'networkidle0',
              timeout: 60000
            });
            
            // 等待特定元素
            if (config.selector) {
              await page.waitForSelector(config.selector, { timeout: 30000 });
            }
            
            // 获取截图元素
            const element = config.selector ? await page.$(config.selector) : page;
            if (!element) {
              throw new Error('无法找到指定的元素');
            }
            
            // 执行截图
            const screenshotOptions: puppeteer.ScreenshotOptions = {
              ...(config.options || {}),
              encoding: 'binary'
            };
            return await element.screenshot(screenshotOptions);
          } finally {
            if (page) {
              await page.close();
            }
          }
        });
        
        // 保存截图
        fs.writeFileSync(filePath, screenshot);
        
        // 更新状态
        status.lastScreenshot = filePath;
        status.screenshotCount += 1;
        
        // 如果设置了最大截图数量，删除多余的旧截图
        if (config.maxScreenshots && status.screenshotCount > config.maxScreenshots) {
          const files = fs.readdirSync(config.outputDir)
            .filter(file => file.startsWith(`screenshot_${taskId}_`))
            .sort();
          
          const excessCount = files.length - config.maxScreenshots;
          if (excessCount > 0) {
            for (let i = 0; i < excessCount; i++) {
              const oldFile = path.join(config.outputDir, files[i]);
              fs.unlinkSync(oldFile);
            }
          }
        }
        
        console.log(`[${taskId}] 截图完成: ${filePath}`);
        
        // 等待下一次截图
        await setTimeout(config.interval);
      } catch (error) {
        console.error(`[${taskId}] 截图失败:`, error);
        // 出错后等待5秒再重试
        await setTimeout(5000);
      }
    }
    
    // 任务结束，更新状态
    status.isRunning = false;
    console.log(`[${taskId}] 任务已停止`);
  }
} 