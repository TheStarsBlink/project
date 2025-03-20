# Cesium 截图服务

这是一个基于 Node.js 和 Puppeteer 的截图服务，支持 Cesium 地图截图和网页截图功能。

## 功能特点

- Cesium 地图截图
- 网页 URL 截图
- 支持高并发处理
- 支持自定义截图参数
- 提供状态监控接口
- TypeScript 支持
- Docker 支持

## 安装

### 本地安装

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产模式运行
npm run build
npm start
```

### Docker 安装

```bash
# 开发模式
docker-compose up

# 生产模式
docker build -t cesium-screenshot .
docker run -p 3000:3000 cesium-screenshot
```

## API 使用说明

### 1. Cesium 截图

```http
GET /screenshot?width=1920&height=1080
```

参数：
- `width`: 截图宽度（可选，默认 1920）
- `height`: 截图高度（可选，默认 1080）

### 2. URL 截图

```http
POST /screenshot/url
Content-Type: application/json

{
  "url": "https://example.com",
  "width": 1920,
  "height": 1080,
  "waitFor": 1000,
  "selector": "#target-element",
  "timeout": 30000,
  "options": {
    "fullPage": false,
    "clip": {
      "x": 0,
      "y": 0,
      "width": 800,
      "height": 600
    },
    "omitBackground": false,
    "encoding": "binary"
  }
}
```

参数说明：
- `url`: 要截图的网页 URL（必需）
- `width`: 浏览器窗口宽度（可选，默认 1920）
- `height`: 浏览器窗口高度（可选，默认 1080）
- `waitFor`: 等待时间（毫秒，可选，默认 1000）
- `selector`: 要截图的元素选择器（可选）
- `timeout`: 超时时间（毫秒，可选，默认 30000）
- `options`: 截图选项（可选）
  - `fullPage`: 是否截取完整页面
  - `clip`: 裁剪区域
  - `omitBackground`: 是否忽略背景
  - `encoding`: 编码方式

### 3. 状态监控

```http
GET /status
```

返回：
```json
{
  "queueLength": 0,
  "processingJobs": 0,
  "maxConcurrentJobs": 5,
  "browserActive": true,
  "lastActivity": "2024-03-20T12:00:00.000Z"
}
```

## 开发

### 本地开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 开发模式运行
npm run dev

# 代码检查
npm run lint
```

### Docker 开发

```bash
# 启动开发环境
docker-compose up

# 构建生产镜像
docker build -t cesium-screenshot .

# 运行生产镜像
docker run -p 3000:3000 cesium-screenshot
```

## 配置说明

### 环境变量

- `PORT`: 服务端口（默认 3000）
- `MAX_CONCURRENT_JOBS`: 最大并发任务数（默认 5）
- `BROWSER_TIMEOUT`: 浏览器超时时间（毫秒，默认 30000）
- `BROWSER_INACTIVE_TIMEOUT`: 浏览器不活动超时时间（毫秒，默认 300000）

### 浏览器配置

在 `src/server.ts` 中可以修改 `DEFAULT_BROWSER_CONFIG` 和 `DEFAULT_PAGE_CONFIG` 来自定义浏览器和页面配置。

## 注意事项

1. 确保服务器有足够的内存运行 Chrome 浏览器
2. 建议在生产环境中使用 Docker 部署
3. 根据服务器性能调整 `MAX_CONCURRENT_JOBS` 的值
4. 注意处理超时和错误情况

## 许可证

MIT