# Cesium 底图配置工具

这是一个基于 Vue 3 + TypeScript + Cesium 的底图配置工具，用于方便用户配置各种地图服务，如 WMTS、WMS 和 XYZ 等。

## 功能特点

- 支持配置多种地图服务类型：WMTS、WMS、XYZ
- 每种服务类型的特定参数可单独配置
- 实时预览底图效果
- 支持保存多个底图配置方案
- 数据本地持久化存储
- 支持导出配置为 JSON 文件
- 支持将配置发送到截图服务器
- **新增**：支持通过截图序列实现模拟视频流功能
- **新增**：集中式端口和服务配置管理

## 技术栈

- Vue 3 + TypeScript
- Pinia (状态管理)
- Vue Router (路由管理)
- Cesium (地图引擎)
- localStorage (数据持久化)
- Socket.IO (实时通信)

## 开发与构建

### 安装依赖

```bash
pnpm install
```

### 开发服务器

单独启动前端开发服务器：
```bash
pnpm dev
```

或使用统一启动脚本同时启动前端和后端服务：
```bash
# 项目根目录下
node start-services.js
```

### 构建项目

```bash
pnpm build
```

### 预览构建结果

```bash
pnpm preview
```

## 全局配置系统

本项目引入了集中式配置管理，所有服务的端口、URL和其他配置项都集中在项目根目录下的 `config.js` 文件中：

```javascript
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
  
  // 其他配置...
}
```

### 配置优先级

配置加载顺序（优先级从高到低）：
1. 运行时环境变量
2. `.env.local` 文件（由 `start-services.js` 动态生成）
3. `.env.development` 或 `.env.production` 文件
4. 代码中的默认值

### 配置使用方式

前端应用中通过环境变量获取配置：

```typescript
// 从环境变量获取服务器URL
const serverUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000';
```

### 自定义配置

如需更改端口或其他配置，只需修改根目录下的 `config.js` 文件，然后使用 `node start-services.js` 启动所有服务。

## 使用说明

1. 选择底图服务类型 (WMTS/WMS/XYZ)
2. 输入服务地址和相关参数
3. 右侧地图会实时显示预览效果
4. 输入配置名称并点击"保存配置"按钮保存当前设置
5. 已保存的配置可以随时加载或删除

## 页面说明

本应用包含以下页面：

### 1. 底图配置页面 (/)

主页面，用于配置、保存和测试各种地图服务。包含完整的底图参数配置面板和预览窗口，支持WMTS、WMS和XYZ格式配置。

### 2. 定期截图管理页面 (/scheduled)

管理定期截图任务的页面，可以设置截图频率、存储位置等参数，并查看截图任务的执行状态。

### 3. 服务首页 (/dashboard)

应用的入口仪表板，展示系统状态和各功能入口。

### 4. 截图流测试页面 (/streaming)

集成到Vue应用的截图流功能测试页面。此页面用于实时测试无头浏览器渲染并通过Socket.IO传输的网页截图流，具有以下特点：

- 支持输入任意URL，后端将加载并实时推送渲染内容
- 自动连接到后端Socket.IO服务，并优雅处理连接错误
- 提供直观的连接状态和流状态指示器
- 使用全局配置中的服务URL，确保连接到正确的后端服务
- 包含离线模式说明，当后端服务不可用时提供帮助信息
- 完全响应式设计，适配各种屏幕尺寸

**访问方式：** 点击导航栏中的"截图流测试"链接即可访问。

## 数据持久化

所有配置数据都保存在浏览器的 localStorage 中，包括：
- 当前正在编辑的配置
- 所有已保存的配置列表

### 服务端持久化

当使用"发送到服务器"功能时，底图配置会被发送到截图服务后端，并通过SQLite数据库持久化存储：

1. **前端发送方式**：
   ```typescript
   // 通过API发送配置到服务器
   async function saveToServer(config: BasemapConfig) {
     try {
       const response = await fetch(`${serverUrl}/basemap`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(config)
       });
       return await response.json();
     } catch (error) {
       console.error('保存到服务器失败:', error);
       throw error;
     }
   }
   ```

2. **服务端存储**：
   - 数据通过SQLite数据库持久化存储在截图服务的`DATA_DIR`目录中（由全局配置指定）
   - 使用`basemaps.db`数据库文件
   - 数据以JSON格式序列化后存储
   - 支持按名称或类型查询

3. **配置同步**：
   - 可以从服务器加载保存的配置到前端工具中
   - 支持将本地配置批量发送到服务器
   - 服务器配置优先级高于本地配置

### 加载服务器配置

使用以下接口从服务器获取配置（URL基于全局配置）：

```
GET ${serverUrl}/basemap
GET ${serverUrl}/basemap/配置名称
GET ${serverUrl}/basemap/type/wmts
```

## 与截图服务集成

本工具可以与 Cesium 截图服务集成，允许用户将配置好的底图服务发送到截图服务器。

### 使用方法

1. 配置好底图服务参数
2. 点击"发送到服务器"按钮将配置发送到截图服务
3. 发送成功后，可以使用截图服务的接口生成截图

### 截图接口

使用发送到服务器的配置生成截图（URL基于全局配置）：

```
GET ${serverUrl}/screenshot?basemapName=配置名称
```

响应将是一个 PNG 格式的图片。

### 视频流 (截图流) 功能

项目提供两种访问截图流功能的方式：

#### 1. 集成的 Vue 页面

**路径：** `/streaming`（在导航栏点击"截图流测试"）

**特点：**
- 集成到 Vue 应用的导航系统
- 提供美观的用户界面和状态指示
- 自动处理连接错误和服务不可用情况
- 离线模式下提供有用的帮助信息
- 响应式设计，支持移动设备访问
- 使用全局配置中的服务URL，确保连接到正确的后端

**技术细节：**
- 使用 Vue 3 Composition API 实现
- 直接导入 socket.io-client 库，使用 TypeScript 类型定义
- 包含完整的错误状态管理和重连机制

#### 2. 独立的静态 HTML 页面

**路径：** `/webrtc-test.html`（直接访问URL）

**特点：**
- 零依赖的静态HTML实现
- 轻量级，无需完整Vue应用支持
- 适合嵌入到其他应用或作为独立测试工具
- 同样提供错误处理和状态指示

**访问方式：**
1. 确保后端截图服务正在运行（使用 `node start-services.js` 或分别启动服务）
2. 在浏览器中访问 `http://localhost:[前端端口]/webrtc-test.html`

**注意事项：** 无论使用哪种方式，这都不是真正的 WebRTC 视频流，而是通过 Socket.IO 快速传输截图序列实现的模拟流。真正的 WebRTC 实现需要额外的开发工作。

### 离线工作模式

当后端服务不可用时，应用提供以下功能：

1. **优雅的错误处理**：显示友好的错误消息而非控制台错误
2. **故障排除指南**：提供启动后端服务的步骤说明
3. **替代方案建议**：如HTML2Canvas等客户端截图方法的提示

### 内网部署注意事项

在内网环境部署时：

1. **服务器地址配置**：
   - 修改项目根目录下的 `config.js` 文件中的服务URL配置：
   ```javascript
   module.exports = {
     backend: {
       port: 3000,
       url: 'http://内网IP:3000',  // 修改为内网IP或主机名
       // ...
     },
     frontend: {
       port: 8080,
       url: 'http://内网IP:8080', // 修改为内网IP或主机名
       // ...
     }
   }
   ```
   - 或在Docker运行时通过环境变量覆盖：
     ```bash
     docker run -p 8080:80 -e VITE_SERVER_URL=http://内网IP:3000 cesium-basemap-config
     ```

2. **数据备份**：
   - 尽管前端有localStorage存储，但关键配置应定期从服务器备份
   - 参考主项目文档中的SQLite数据库备份方法

3. **权限设置**：
   - 在生产环境中，可能需要配置适当的访问权限控制
   - 当前版本不包含用户认证功能，如需要请自行扩展
