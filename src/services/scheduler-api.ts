import { Request, Response } from 'express';
import path from 'path';
import { ScreenshotScheduler, ScheduledScreenshotConfig } from './scheduler';

/**
 * 设置定期截图路由
 * @param app Express应用实例
 * @param scheduler 截图调度器实例
 * @param dataDir 数据存储目录
 */
export function setupSchedulerRoutes(app: any, scheduler: ScreenshotScheduler, dataDir: string) {
  // 创建定期截图任务
  app.post('/screenshot/scheduled', handleCreateScheduledTask(scheduler, dataDir));
  
  // 获取所有截图任务状态
  app.get('/screenshot/scheduled', handleListScheduledTasks(scheduler));
  
  // 获取特定截图任务状态
  app.get('/screenshot/scheduled/:id', handleGetScheduledTask(scheduler));
  
  // 停止截图任务
  app.post('/screenshot/scheduled/:id/stop', handleStopScheduledTask(scheduler));
  
  // 重启截图任务
  app.post('/screenshot/scheduled/:id/restart', handleRestartScheduledTask(scheduler, dataDir));
}

/**
 * 处理创建定期截图任务请求
 */
function handleCreateScheduledTask(scheduler: ScreenshotScheduler, dataDir: string) {
  return async (req: Request<Record<string, never>, unknown, Partial<ScheduledScreenshotConfig>>, res: Response) => {
    const { url, interval, id, width, height, selector, options, maxScreenshots } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL是必需的参数' });
    }
    
    // 设置默认值
    const taskInterval = interval || 5000; // 默认5秒
    const taskId = id || `scheduled_${Date.now()}`;
    const outputDir = path.join(dataDir, 'scheduled', taskId);
    
    try {
      const config: ScheduledScreenshotConfig = {
        id: taskId,
        url,
        interval: taskInterval,
        outputDir,
        width,
        height,
        selector,
        options,
        maxScreenshots
      };
      
      const createdTaskId = await scheduler.startTask(config);
      res.status(201).json({
        id: createdTaskId,
        message: '定期截图任务已创建',
        status: scheduler.getTaskStatus(createdTaskId)
      });
    } catch (error) {
      console.error('创建定期截图任务失败:', error);
      res.status(500).json({
        error: `创建任务失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  };
}

/**
 * 处理获取所有截图任务状态请求
 */
function handleListScheduledTasks(scheduler: ScreenshotScheduler) {
  return (_req: Request, res: Response) => {
    const tasks = scheduler.getAllTaskStatus();
    res.json(tasks);
  };
}

/**
 * 处理获取特定截图任务状态请求
 */
function handleGetScheduledTask(scheduler: ScreenshotScheduler) {
  return (req: Request, res: Response) => {
    const { id } = req.params;
    const task = scheduler.getTaskStatus(id);
    
    if (!task) {
      return res.status(404).json({ error: `任务ID ${id} 不存在` });
    }
    
    res.json(task);
  };
}

/**
 * 处理停止截图任务请求
 */
function handleStopScheduledTask(scheduler: ScreenshotScheduler) {
  return (req: Request, res: Response) => {
    const { id } = req.params;
    const success = scheduler.stopTask(id);
    
    if (!success) {
      return res.status(404).json({ error: `任务ID ${id} 不存在` });
    }
    
    res.json({ message: `任务 ${id} 已停止` });
  };
}

/**
 * 处理重启截图任务请求
 */
function handleRestartScheduledTask(scheduler: ScreenshotScheduler, dataDir: string) {
  return async (req: Request, res: Response) => {
    const { id } = req.params;
    const oldTask = scheduler.getTaskStatus(id);
    
    if (!oldTask) {
      return res.status(404).json({ error: `任务ID ${id} 不存在` });
    }
    
    // 先停止旧任务
    scheduler.stopTask(id);
    
    try {
      // 从请求体获取新的配置，如果有
      const { interval, width, height, selector, options, maxScreenshots } = req.body;
      
      // 构建新的任务配置
      const config: ScheduledScreenshotConfig = {
        id,
        url: oldTask.url,
        interval: interval || oldTask.interval,
        outputDir: oldTask.outputDir,
        width,
        height,
        selector,
        options,
        maxScreenshots
      };
      
      // 启动新任务
      await scheduler.startTask(config);
      res.json({
        message: `任务 ${id} 已重启`,
        status: scheduler.getTaskStatus(id)
      });
    } catch (error) {
      console.error(`重启任务 ${id} 失败:`, error);
      res.status(500).json({
        error: `重启任务失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  };
} 