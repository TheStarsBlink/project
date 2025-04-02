import { Server as SocketIOServer, Socket } from 'socket.io';
import { ScreenshotQueue } from './queue';
import puppeteer, { Page } from 'puppeteer';
// import SimplePeer from 'simple-peer'; // simple-peer 不适用于 Node.js 后端直接捕获流

// 存储活动的 WebRTC 连接信息 (简化示例)
interface ActiveStream {
  socketId: string;
  page: Page | null;
  // peer: SimplePeer.Instance | null; // simple-peer 主要用于浏览器端
  intervalId?: NodeJS.Timeout;
}
const activeStreams: { [key: string]: ActiveStream } = {};

export function setupStreamingRoutes(io: SocketIOServer, screenshotQueue: ScreenshotQueue) {
  io.on('connection', (socket: Socket) => {
    console.log(`客户端连接: ${socket.id}`);

    // 客户端请求开始推流
    socket.on('start-stream', async (options: { url: string, width?: number, height?: number }) => {
      console.log(`[${socket.id}] 请求开始推流: ${options.url}`);
      if (activeStreams[socket.id]) {
        console.log(`[${socket.id}] 已经存在活动的流`);
        // 可以选择关闭旧的流或拒绝新的请求
        await stopStream(socket.id);
      }

      try {
        const browser = await screenshotQueue.getBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: options.width || 1280, height: options.height || 720 });
        await page.goto(options.url, { waitUntil: 'networkidle0' });

        activeStreams[socket.id] = { socketId: socket.id, page };
        console.log(`[${socket.id}] 页面加载成功: ${options.url}`);

        // --- WebRTC 集成难点 --- 
        // Puppeteer 本身不直接提供 MediaStream 输出
        // 需要使用其他方法，例如:
        // 1. 截屏并快速发送图片序列 (类似MJPEG)
        // 2. 使用 Chrome DevTools Protocol (CDP) 的 Screencast 功能
        // 3. 结合虚拟摄像头和屏幕录制工具 (如 FFmpeg) 将浏览器内容推送到 WebRTC

        // 简化实现：使用截图序列模拟视频流
        const streamInterval = setInterval(async () => {
          if (!activeStreams[socket.id] || !activeStreams[socket.id].page) {
            clearInterval(streamInterval);
            return;
          }
          try {
            const page = activeStreams[socket.id].page as Page;
            const screenshot = await page.screenshot({ type: 'jpeg', quality: 70 });
            socket.emit('stream-frame', screenshot.toString('base64'));
          } catch (err) {
             // 页面可能已关闭
            console.error(`[${socket.id}] 截图失败:`, err);
            await stopStream(socket.id); 
          }
        }, 100); // 每秒约10帧

        activeStreams[socket.id].intervalId = streamInterval;
        socket.emit('stream-started'); // 通知客户端流已开始 (模拟)

      } catch (error) {
        console.error(`[${socket.id}] 启动流失败:`, error);
        socket.emit('stream-error', '启动流失败');
        await stopStream(socket.id); // 确保清理
      }
    });

    // // WebRTC 信令处理 (simple-peer 通常在客户端之间使用，这里简化)
    // socket.on('signal', (data) => {
    //   const targetSocketId = Object.keys(activeStreams).find(id => id !== socket.id);
    //   if (targetSocketId) {
    //     io.to(targetSocketId).emit('signal', data);
    //   }
    // });

    // 客户端断开连接
    socket.on('disconnect', async () => {
      console.log(`客户端断开连接: ${socket.id}`);
      await stopStream(socket.id);
    });

    // 客户端请求停止推流
    socket.on('stop-stream', async () => {
      console.log(`[${socket.id}] 请求停止推流`);
      await stopStream(socket.id);
    });
  });
}

// 停止并清理指定客户端的流
async function stopStream(socketId: string) {
  const streamData = activeStreams[socketId];
  if (streamData) {
    if (streamData.intervalId) {
      clearInterval(streamData.intervalId);
    }
    if (streamData.page) {
      try {
        await streamData.page.close();
        console.log(`[${socketId}] 页面已关闭`);
      } catch (err) {
        console.error(`[${socketId}] 关闭页面失败:`, err);
      }
    }
    // if (streamData.peer) {
    //   streamData.peer.destroy();
    // }
    delete activeStreams[socketId];
    console.log(`[${socketId}] 流已停止并清理`);
  }
} 