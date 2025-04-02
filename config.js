/**
 * 全局服务配置文件
 * 所有相关的服务端口和URL配置都集中在这里
 */

module.exports = {
  // 后端服务配置
  backend: {
    port: 3000,                             // 后端服务端口
    url: 'http://localhost:3000',           // 后端服务URL
    maxConcurrentJobs: 5,                   // 最大并发任务数
    dataDir: './data',                      // 数据目录
  },
  
  // 前端服务配置
  frontend: {
    port: 5173,                             // 前端开发服务器端口
    url: 'http://localhost:5173',           // 前端开发服务器URL
  },
  
  // 环境配置
  env: {
    isDevelopment: process.env.NODE_ENV !== 'production',
  },
  
  // 功能特性配置
  features: {
    enableStreaming: true,                  // 是否启用流式传输功能
    enableScheduledScreenshots: true,       // 是否启用定时截图功能
  },
  
  // 日志配置
  logging: {
    level: 'info',                          // 日志级别
    saveToFile: false,                      // 是否保存日志到文件
  }
}; 