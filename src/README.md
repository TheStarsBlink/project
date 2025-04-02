# 截图服务模块化结构

本项目是一个基于 Express 和 Puppeteer 的截图服务，支持 URL、Cesium 和地理数据的截图。

## 项目结构

项目采用模块化的结构，主要包含以下部分：

```
src/
├── server.ts            # 主服务器入口文件
├── types.ts             # 类型定义
├── services/            # 服务模块目录
│   ├── queue.ts         # 截图队列服务
│   └── screenshot.ts    # 截图相关路由和处理函数
├── utils/               # 工具函数目录
│   └── geoData.ts       # 地理数据处理
├── tests/               # 测试目录
│   ├── queue.test.ts    # 队列服务测试
│   └── screenshot.test.ts # 截图服务测试
├── examples/            # 示例目录
│   └── example.ts       # 使用示例
└── README.md            # 项目文档
```

## 模块功能说明

### server.ts

主入口文件，负责：
- 创建 Express 应用实例
- 配置中间件
- 初始化截图队列
- 设置路由
- 启动服务器

### services/queue.ts

截图队列服务，主要功能：
- 管理浏览器实例
- 处理和调度截图任务
- 自动关闭不活动的浏览器实例
- 获取Chrome可执行文件路径

### services/screenshot.ts

截图相关功能服务，包含：
- URL截图路由和处理函数
- Cesium截图路由和处理函数
- 地理数据截图路由和处理函数
- 底图配置相关路由和处理函数

## 服务接口

### 状态接口

```
GET /status
```

返回队列状态信息，包括：
- `queueLength`: 等待处理的任务数量
- `processing`: 正在处理的任务数量
- `maxConcurrentJobs`: 最大并发任务数
- `browserActive`: 浏览器实例是否处于活动状态
- `lastActivity`: 最后活动时间

### 截图接口

#### URL截图

```
POST /screenshot/url
```

请求体参数：
```json
{
  "url": "https://example.com", // 必需：要截图的URL
  "width": 1920, // 可选：视口宽度
  "height": 1080, // 可选：视口高度
  "waitFor": 1000, // 可选：额外等待时间(毫秒)
  "selector": "#element", // 可选：要截取的元素选择器
  "timeout": 30000, // 可选：超时时间(毫秒)
  "options": { // 可选：截图选项
    "fullPage": true, // 是否截取整个页面
    "omitBackground": false // 是否忽略背景
  }
}
```

#### Cesium截图

```
GET /screenshot?basemapName=配置名称
```

查询参数：
- `basemapName`: 可选，使用的底图配置名称

#### 地理数据截图

```
POST /screenshot/geo
```

请求体参数：
```json
{
  "filePath": "/path/to/geo.geojson", // 必需：地理数据文件路径
  "options": { // 可选：配置选项
    "width": 1920, // 视口宽度
    "height": 1080, // 视口高度
    "csvOptions": { // CSV文件特有选项
      "longitudeColumn": "lon", // 经度列名
      "latitudeColumn": "lat" // 纬度列名
    }
  }
}
```

### 视频流 (截图流) 接口 (通过 Socket.IO)

本服务还提供了一个基于 Socket.IO 的接口，用于从无头浏览器中"流式传输"内容。注意：这目前是通过快速发送截图序列 (JPEG 格式) 来模拟视频流，而不是真正的 WebRTC 视频流。

**连接:** 客户端需要连接到运行截图服务的 Socket.IO 服务器 (通常与 HTTP 服务器在同一端口)。

**Socket.IO 事件:**

*   **客户端 -> 服务器:**
    *   `start-stream`: 请求开始推流。
        *   参数 (Object): `{ url: string, width?: number, height?: number }`
            *   `url`: 需要加载和推流的页面 URL。
            *   `width`, `height`: (可选) 无头浏览器视口大小，默认为 1280x720。
    *   `stop-stream`: 请求停止当前的推流。
*   **服务器 -> 客户端:**
    *   `stream-frame`: 发送视频流的一帧 (Base64 编码的 JPEG 图片)。客户端需要将其解码并显示。
    *   `stream-started`: 通知客户端流已成功开始（页面加载完成，截图循环已启动）。
    *   `stream-error`: 通知客户端在启动或推流过程中发生错误。
        *   参数 (string): 错误信息。
    *   `stream-stopped`: (隐式或显式) 通知客户端流已停止（例如，由于 `stop-stream` 请求或连接断开）。

**注意:** 要使用此功能，需要在客户端包含 Socket.IO 客户端库。

### 底图配置接口

#### 创建/更新底图配置

```
POST /basemap/config
```

请求体参数：
```json
{
  "name": "地图配置名称", // 必需：配置名称
  "type": "wmts", // 必需：服务类型(wmts/wms/xyz)
  "url": "http://example.com/wmts", // 必需：服务URL
  "params": { // 服务参数
    "layer": "layer_name", // WMTS/WMS图层名
    "style": "default", // WMTS样式
    "format": "image/png", // 图像格式
    "tileMatrixSetID": "GoogleMapsCompatible", // WMTS矩阵集ID
    "maximumLevel": 18, // 最大缩放级别
    "transparent": true // WMS透明度
  }
}
```

#### 获取所有底图配置

```
GET /basemap/config
```

#### 删除底图配置

```
DELETE /basemap/config/:name
```

路径参数：
- `name`: 要删除的配置名称

## 与底图配置工具集成

本服务支持与 Cesium 底图配置工具集成，用户可以：

1. 在底图配置工具中配置底图
2. 将配置发送到截图服务
3. 使用截图接口进行截图，并指定使用哪个底图配置

示例：
```
GET /screenshot?basemapName=配置名称
```

## 测试

项目包含针对主要服务的单元测试：

1. `queue.test.ts`: 测试截图队列服务功能，包括：
   - 浏览器实例管理
   - 任务队列处理
   - 状态报告
   - Chrome路径检测

2. `screenshot.test.ts`: 测试截图服务功能，包括：
   - 路由设置
   - 底图配置API功能

运行测试：
```bash
npm test
```

## 使用示例

项目包含了使用示例，位于 `examples/example.ts`，提供了以下示例：

1. URL截图示例：
   ```bash
   ts-node examples/example.ts url
   ```

2. Cesium截图示例：
   ```bash
   ts-node examples/example.ts cesium
   ```

3. 地理数据截图示例：
   ```bash
   ts-node examples/example.ts geo
   ```

4. 底图配置示例：
   ```bash
   ts-node examples/example.ts config
   ```

示例代码演示了如何使用服务API进行各种操作，包括：
- 发送HTTP请求到各个接口
- 处理响应数据
- 保存截图结果到本地文件

## Docker部署

本项目支持使用Docker进行部署，已配置多阶段构建以优化镜像大小和构建过程。

### 文件结构

```
├── Dockerfile              # 截图服务Docker构建文件
├── docker-compose.yml      # Docker Compose配置
├── .dockerignore           # Docker忽略文件
└── cesium-basemap-config/  # 底图配置工具
    ├── Dockerfile          # 底图配置工具Docker构建文件
    ├── .dockerignore       # 底图配置工具Docker忽略文件
    └── nginx.conf          # Nginx配置文件
```

### 使用pnpm的多阶段构建

项目使用pnpm作为包管理器，在Docker中进行构建时：

1. 第一阶段（构建阶段）：
   - 使用node:18-alpine作为基础镜像
   - 安装pnpm
   - 复制pnpm锁文件和package.json
   - 使用`--frozen-lockfile --prefer-offline`选项安装依赖，确保使用离线镜像
   - 复制源代码并构建项目

2. 第二阶段（运行阶段）：
   - 使用更小的Alpine镜像
   - 安装运行时必需的依赖（如Chromium）
   - 从构建阶段复制构建结果和依赖

### 部署步骤

1. 确保安装了Docker和Docker Compose

2. 构建和启动服务：
   ```bash
   docker-compose up -d
   ```

3. 验证服务是否运行：
   ```bash
   # 检查截图服务
   curl http://localhost:3000/status
   
   # 检查底图配置工具
   curl http://localhost:8080
   ```

4. 停止服务：
   ```bash
   docker-compose down
   ```

### 自定义配置

可以通过修改`docker-compose.yml`文件中的环境变量来自定义服务配置：

```yaml
environment:
  - NODE_ENV=production
  - MAX_CONCURRENT_JOBS=5       # 最大并发任务数
  - CHROME_PATH=/usr/bin/chromium-browser
```

### 数据持久化

服务使用命名卷来持久化数据：

```yaml
volumes:
  - screenshot-data:/app/data
```

这确保在容器重启后数据仍然保留。 