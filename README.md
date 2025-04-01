# Cesium 截图服务

这是一个基于 Node.js 和 Puppeteer 的截图服务，支持 Cesium 地图截图和网页截图功能。

最主要的是要在内网用，所以所有的依赖都要打包进docker中，写代码的时候不要忘记这个

## 功能特点

- Cesium 地图截图
- 网页 URL 截图
- 支持高并发处理
- 支持自定义截图参数
- 提供状态监控接口
- 底图配置管理与持久化
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

### 4. 底图配置管理

#### 获取所有底图配置

```http
GET /basemap
```

返回：
```json
[
  {
    "name": "默认天地图",
    "type": "wmts",
    "url": "https://example.com/wmts",
    "params": {
      "layer": "img",
      "style": "default",
      "format": "image/jpeg",
      "tileMatrixSetID": "GoogleMapsCompatible",
      "maximumLevel": 18
    }
  },
  {
    "name": "影像底图",
    "type": "wms",
    "url": "https://example.com/wms",
    "params": {
      "layer": "satellite",
      "transparent": true
    }
  }
]
```

#### 获取指定名称的底图配置

```http
GET /basemap/:name
```

参数：
- `name`: 底图配置名称

返回：
```json
{
  "name": "默认天地图",
  "type": "wmts",
  "url": "https://example.com/wmts",
  "params": {
    "layer": "img",
    "style": "default",
    "format": "image/jpeg",
    "tileMatrixSetID": "GoogleMapsCompatible",
    "maximumLevel": 18
  }
}
```

#### 保存底图配置

```http
POST /basemap
Content-Type: application/json

{
  "name": "新底图",
  "type": "xyz",
  "url": "https://example.com/xyz/{z}/{x}/{y}.png",
  "params": {
    "maximumLevel": 19
  }
}
```

返回：
```json
{
  "success": true,
  "id": 3
}
```

#### 删除底图配置

```http
DELETE /basemap/:name
```

参数：
- `name`: 底图配置名称

返回：
```json
{
  "success": true
}
```

#### 按类型获取底图配置

```http
GET /basemap/type/:type
```

参数：
- `type`: 底图类型 (wmts, wms, xyz)

返回：
```json
[
  {
    "name": "默认天地图",
    "type": "wmts",
    "url": "https://example.com/wmts",
    "params": {
      "layer": "img",
      "style": "default",
      "format": "image/jpeg",
      "tileMatrixSetID": "GoogleMapsCompatible",
      "maximumLevel": 18
    }
  },
  {
    "name": "基础地图",
    "type": "wmts",
    "url": "https://example.com/wmts2",
    "params": {
      "layer": "vec",
      "style": "default",
      "format": "image/png",
      "tileMatrixSetID": "GoogleMapsCompatible",
      "maximumLevel": 17
    }
  }
]
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
- `DATA_DIR`: 数据存储目录（默认 ./data）

### 浏览器配置

在 `src/server.ts` 中可以修改 `DEFAULT_BROWSER_CONFIG` 和 `DEFAULT_PAGE_CONFIG` 来自定义浏览器和页面配置。

## 数据持久化

服务使用SQLite数据库存储底图配置信息，配置文件保存在`DATA_DIR`指定的目录中（默认为`./data`）。在Docker环境中，这个目录被映射为数据卷，确保容器重启后数据不会丢失。

数据库表结构：
```sql
CREATE TABLE basemaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  config TEXT NOT NULL,
  createTime DATETIME NOT NULL,
  updateTime DATETIME NOT NULL
)
```

### 持久化实现细节

1. **SQLite3数据库**：使用`sqlite3`和`sqlite`模块实现持久化，数据库文件名为`basemaps.db`
2. **数据目录**：通过环境变量`DATA_DIR`配置，默认为项目根目录下的`./data`文件夹
3. **自动初始化**：服务启动时会自动检查数据库文件和表结构，如不存在则创建
4. **JSON序列化**：底图配置数据以JSON格式序列化后存储在数据库中
5. **并发支持**：SQLite支持多个并发连接，保证在高并发环境下的数据一致性

### Docker中的数据持久化

在Docker环境中，数据持久化通过卷映射实现：

```yaml
volumes:
  - screenshot-data:/app/data
```

这确保了即使容器被删除，数据库文件也会保留在Docker卷中。在`docker-compose.yml`中已经定义了名为`screenshot-data`的卷：

```yaml
volumes:
  screenshot-data:
    driver: local
```

### 内网环境下的持久化

由于内网环境可能无法访问外部资源，本项目已经做了以下优化：

1. **离线依赖包**：通过配置`.npmrc`文件并使用pnpm的离线镜像功能，确保所有依赖包（包括SQLite）都被预先下载并打包到镜像中
2. **SQLite打包**：SQLite的二进制模块已经被特别处理，确保在Alpine Linux环境中也能正常运行
3. **数据持久化**：使用Docker卷挂载确保数据在容器重启后不会丢失
4. **自动权限处理**：Dockerfile中已配置正确的用户权限，确保数据目录可写

在完全离线的内网环境中部署时，建议按照以下步骤操作：

```bash
# 1. 在能访问外网的环境中构建镜像
docker build -t cesium-screenshot .

# 2. 保存镜像为tar文件
docker save -o cesium-screenshot.tar cesium-screenshot

# 3. 将tar文件传输到内网环境

# 4. 在内网环境中加载镜像
docker load -i cesium-screenshot.tar

# 5. 运行容器，确保挂载数据卷
docker run -d -p 3000:3000 -v screenshot-data:/app/data --name cesium-screenshot cesium-screenshot
```

### 常见问题排查

- **数据库权限错误**：确保`DATA_DIR`目录有正确的读写权限
- **数据库锁定**：SQLite一次只允许一个写入操作，如出现"database is locked"错误，检查是否有并发写入冲突
- **数据持久化失败**：检查Docker卷是否正确挂载，可通过`docker volume ls`和`docker volume inspect screenshot-data`命令检查
- **内网环境SQLite问题**：确保SQLite二进制模块与运行环境兼容，尤其是在Alpine Linux环境中

## 注意事项

1. 确保服务器有足够的内存运行 Chrome 浏览器
2. 建议在生产环境中使用 Docker 部署
3. 根据服务器性能调整 `MAX_CONCURRENT_JOBS` 的值
4. 注意处理超时和错误情况
5. 在内网环境部署时，确保SQLite数据目录有正确的读写权限

## 许可证

MIT

# 截图服务与底图配置系统

这个项目包含两个部分：
1. 截图服务 - 提供网页截图和定期截图功能
2. 底图配置 - 管理Cesium底图配置

## 系统需求

- Node.js v16+
- npm 或 pnpm 包管理器

## 快速启动

### 方法一：使用启动脚本（推荐）

**Windows用户**:
双击 `start.bat` 文件或在命令行运行：
```
npm run start
```

**Linux/Mac用户**:
```bash
chmod +x start.sh  # 只需第一次运行前执行
./start.sh
```
或者使用npm命令：
```bash
npm run start
```

### 方法二：单独启动服务

**启动截图服务**:
```bash
npm run start:screenshot
```

**启动底图配置**:
```bash
npm run start:basemap
```

## 访问服务

启动后，你可以通过以下地址访问各个服务：

- 截图服务API: http://localhost:3000
- 底图配置管理界面: http://localhost:5173

截图服务现已集成到底图配置界面中，你可以通过以下路径访问：
- 首页: http://localhost:5173/dashboard
- 底图配置: http://localhost:5173/
- 定期截图管理: http://localhost:5173/scheduled

## 服务说明

### 截图服务

提供以下功能：
- 单次URL截图
- Cesium地图截图
- 地理数据可视化截图
- 定期自动截图

### 底图配置

提供以下功能：
- WMTS/WMS/XYZ底图配置管理
- 底图预览
- 配置导出与导入