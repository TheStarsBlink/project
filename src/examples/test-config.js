/**
 * 全局配置测试示例
 * 
 * 此脚本展示如何使用全局配置系统和环境变量
 * 运行方式: node test-config.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// 项目根目录
const ROOT_DIR = path.resolve(__dirname, '../../');

// 加载全局配置
const config = require(path.join(ROOT_DIR, 'config.js'));

console.log('==== 全局配置测试 ====');
console.log('加载的配置内容:');
console.log(JSON.stringify(config, null, 2));

// 检查后端配置
console.log('\n==== 后端配置 ====');
console.log(`端口: ${config.backend.port}`);
console.log(`URL: ${config.backend.url}`);
console.log(`最大并发任务数: ${config.backend.maxConcurrentJobs}`);
console.log(`数据目录: ${config.backend.dataDir}`);

// 检查前端配置
console.log('\n==== 前端配置 ====');
console.log(`端口: ${config.frontend.port}`);
console.log(`URL: ${config.frontend.url}`);

// 检查环境变量
console.log('\n==== 环境变量 ====');
console.log(`PORT: ${process.env.PORT || '未设置'}`);
console.log(`MAX_CONCURRENT_JOBS: ${process.env.MAX_CONCURRENT_JOBS || '未设置'}`);
console.log(`DATA_DIR: ${process.env.DATA_DIR || '未设置'}`);

// 测试后端服务是否可用
console.log('\n==== 测试后端服务 ====');
function testBackendService() {
  return new Promise((resolve) => {
    const req = http.request(
      `${config.backend.url}/status`,
      { method: 'GET' },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('后端服务状态: 可用');
            try {
              const statusData = JSON.parse(data);
              console.log(`队列长度: ${statusData.queueLength}`);
              console.log(`最大并发任务数: ${statusData.maxConcurrentJobs}`);
              console.log(`浏览器活动状态: ${statusData.browserActive ? '活动' : '不活动'}`);
            } catch (e) {
              console.log('解析响应失败:', e.message);
            }
          } else {
            console.log(`后端服务状态: 不可用 (HTTP ${res.statusCode})`);
          }
          resolve();
        });
      }
    );

    req.on('error', (error) => {
      console.log(`后端服务状态: 不可用 (${error.message})`);
      resolve();
    });

    req.end();
  });
}

// 检查环境变量文件
console.log('\n==== 检查环境文件 ====');
function checkEnvFiles() {
  const backendEnvPath = path.join(ROOT_DIR, 'src/.env');
  const frontendEnvPath = path.join(ROOT_DIR, 'cesium-basemap-config/.env.local');

  if (fs.existsSync(backendEnvPath)) {
    console.log('后端环境文件存在。内容:');
    console.log(fs.readFileSync(backendEnvPath, 'utf8'));
  } else {
    console.log('后端环境文件不存在');
  }

  if (fs.existsSync(frontendEnvPath)) {
    console.log('\n前端环境文件存在。内容:');
    console.log(fs.readFileSync(frontendEnvPath, 'utf8'));
  } else {
    console.log('\n前端环境文件不存在');
  }
}

// 生成测试报告
async function generateReport() {
  await testBackendService();
  checkEnvFiles();
  
  console.log('\n==== 配置测试总结 ====');
  console.log('全局配置系统已验证。');
  console.log('如需更改端口或其他配置，请修改 config.js 文件。');
  console.log('使用 node start-services.js 启动所有服务。');
}

generateReport(); 