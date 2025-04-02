const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// 检查是否为测试模式
const isTestMode = process.argv.includes('--test');

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

// 将端口配置写入临时环境变量文件
const backendEnvContent = `PORT=${config.backend.port}\nMAX_CONCURRENT_JOBS=${config.backend.maxConcurrentJobs}\nDATA_DIR=${config.backend.dataDir}`;
fs.writeFileSync(path.join(SCREENSHOT_SERVICE_DIR, '.env'), backendEnvContent);

const frontendEnvContent = `VITE_API_ENDPOINT=${config.backend.url}\nVITE_SERVER_PORT=${config.frontend.port}\nVITE_SERVER_URL=${config.backend.url}`;
fs.writeFileSync(path.join(BASEMAP_CONFIG_DIR, '.env.local'), frontendEnvContent);

console.log('\x1b[34m%s\x1b[0m', '=== 服务配置信息 ===');
console.log(`后端服务将运行在: ${config.backend.url}`);
console.log(`前端服务将运行在: http://localhost:${config.frontend.port}`);
console.log('\x1b[34m%s\x1b[0m', '==================');

// 如果是测试模式，此时退出，不实际启动服务
if (isTestMode) {
  console.log('\x1b[33m%s\x1b[0m', '测试模式：仅生成环境文件，不启动服务');
  process.exit(0);
}

// 定义启动命令
const commands = [
  {
    name: '截图服务',
    dir: SCREENSHOT_SERVICE_DIR,
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
    color: '\x1b[32m', // 绿色
    env: { 
      ...process.env,
      PORT: config.backend.port,
      MAX_CONCURRENT_JOBS: config.backend.maxConcurrentJobs,
      DATA_DIR: config.backend.dataDir
    }
  },
  {
    name: '底图配置',
    dir: BASEMAP_CONFIG_DIR,
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev', '--', '--port', config.frontend.port],
    color: '\x1b[36m', // 青色
    env: {
      ...process.env,
      VITE_API_ENDPOINT: config.backend.url,
      VITE_SERVER_URL: config.backend.url
    }
  }
];

// 启动所有服务
console.log('\x1b[34m%s\x1b[0m', '=== 正在启动所有服务 ===');

commands.forEach(service => {
  console.log(`${service.color}启动 ${service.name}...\x1b[0m`);
  
  // 使用spawn启动子进程，并传入环境变量
  const proc = spawn(service.cmd, service.args, {
    cwd: service.dir,
    stdio: 'pipe',
    shell: true,
    env: service.env
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
  
  // 清理临时环境变量文件
  try {
    fs.unlinkSync(path.join(SCREENSHOT_SERVICE_DIR, '.env'));
    fs.unlinkSync(path.join(BASEMAP_CONFIG_DIR, '.env.local'));
  } catch (err) {
    // 忽略文件删除错误
  }
};

// 捕获退出信号
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup); 