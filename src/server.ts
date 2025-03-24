import express, { Request, Response } from 'express';
import path from 'path';
import os from 'os';
import cors from 'cors';
import { ScreenshotQueue, DEFAULT_BROWSER_CONFIG } from './services/queue';
import { setupScreenshotRoutes } from './services/screenshot';

// 设置环境变量和服务器配置
const app = express();
const port = process.env.PORT || 3000;
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS) || 5;

// 记录Chrome配置信息
console.log(`操作系统: ${os.platform()}`);
console.log(`Chrome路径: ${DEFAULT_BROWSER_CONFIG.executablePath || '由Puppeteer自动查找'}`);

// 创建和启动截图队列
const screenshotQueue = new ScreenshotQueue(MAX_CONCURRENT_JOBS);
screenshotQueue.startBrowserMonitor();

// 中间件
app.use(express.static('public'));
app.use(express.json());
app.use(cors());

// 设置状态接口
app.get('/status', (_req: Request, res: Response) => {
  res.json(screenshotQueue.getStatus());
});

// 设置截图路由
setupScreenshotRoutes(app, screenshotQueue, port);

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 