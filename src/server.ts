import express, { Request, Response } from 'express';
import path from 'path';
import os from 'os';
import cors from 'cors';
import { ScreenshotQueue, DEFAULT_BROWSER_CONFIG } from './services/queue';
import { setupScreenshotRoutes } from './services/screenshot';
import { BasemapDatabase } from './services/basemap-db';
import { setupBasemapRoutes } from './services/basemap-api';

// 设置环境变量和服务器配置
const app = express();
const port = process.env.PORT || 3000;
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS) || 5;
const DATA_DIR = process.env.DATA_DIR || './data';

// 记录Chrome配置信息
console.log(`操作系统: ${os.platform()}`);
console.log(`Chrome路径: ${DEFAULT_BROWSER_CONFIG.executablePath || '由Puppeteer自动查找'}`);
console.log(`数据存储目录: ${path.resolve(DATA_DIR)}`);

// 创建和启动截图队列
const screenshotQueue = new ScreenshotQueue(MAX_CONCURRENT_JOBS);
screenshotQueue.startBrowserMonitor();

// 初始化底图数据库
const basemapDb = new BasemapDatabase(DATA_DIR);
basemapDb.init().catch(err => {
  console.error('底图数据库初始化失败:', err);
  process.exit(1);
});

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

// 设置底图配置路由
setupBasemapRoutes(app, basemapDb);

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 