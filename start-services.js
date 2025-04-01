const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 定义要启动的两个项目目录
const SCREENSHOT_SERVICE_DIR = path.join(__dirname, 'src');
const BASEMAP_CONFIG_DIR = path.join(__dirname, 'cesium-basemap-config');

// 检查目录是否存在
if (!fs.existsSync(SCREENSHOT_SERVICE_DIR)) {
  console.error(`截图服务目录不存在: ${SCREENSHOT_SERVICE_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(BASEMAP_CONFIG_DIR)) {
  console.error(`底图配置目录不存在: ${BASEMAP_CONFIG_DIR}`);
  process.exit(1);
}

// 定义启动命令
const commands = [
  {
    name: '截图服务',
    dir: SCREENSHOT_SERVICE_DIR,
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    color: '\x1b[32m' // 绿色
  },
  {
    name: '底图配置',
    dir: BASEMAP_CONFIG_DIR,
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    color: '\x1b[36m' // 青色
  }
];

// 启动所有服务
console.log('\x1b[34m%s\x1b[0m', '=== 正在启动所有服务 ===');

commands.forEach(service => {
  console.log(`${service.color}启动 ${service.name}...\x1b[0m`);
  
  // 使用spawn启动子进程
  const proc = spawn(service.cmd, service.args, {
    cwd: service.dir,
    stdio: 'pipe',
    shell: true
  });
  
  // 添加前缀的日志输出功能
  const prefixLog = (data, isError = false) => {
    const lines = data.toString().trim().split('\n');
    const stream = isError ? process.stderr : process.stdout;
    
    lines.forEach(line => {
      if (line.trim()) {
        stream.write(`${service.color}[${service.name}]\x1b[0m ${line}\n`);
      }
    });
  };
  
  // 处理标准输出
  proc.stdout.on('data', data => prefixLog(data));
  
  // 处理标准错误
  proc.stderr.on('data', data => prefixLog(data, true));
  
  // 子进程退出处理
  proc.on('close', code => {
    if (code !== 0) {
      console.log(`${service.color}[${service.name}] 进程异常退出，退出码: ${code}\x1b[0m`);
    } else {
      console.log(`${service.color}[${service.name}] 已结束\x1b[0m`);
    }
  });
  
  // 保存进程引用，用于退出时清理
  process[service.name] = proc;
});

// 处理主进程退出
const cleanup = () => {
  console.log('\n\x1b[33m%s\x1b[0m', '正在关闭所有服务...');
  
  commands.forEach(service => {
    if (process[service.name]) {
      process[service.name].kill();
    }
  });
};

// 捕获退出信号
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 