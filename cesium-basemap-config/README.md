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

## 技术栈

- Vue 3 + TypeScript
- Pinia (状态管理)
- Vue Router (路由管理)
- Cesium (地图引擎)
- localStorage (数据持久化)

## 开发与构建

### 安装依赖

```bash
pnpm install
```

### 开发服务器

```bash
pnpm dev
```

### 构建项目

```bash
pnpm build
```

### 预览构建结果

```bash
pnpm preview
```

## 使用说明

1. 选择底图服务类型 (WMTS/WMS/XYZ)
2. 输入服务地址和相关参数
3. 右侧地图会实时显示预览效果
4. 输入配置名称并点击"保存配置"按钮保存当前设置
5. 已保存的配置可以随时加载或删除

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
   - 数据通过SQLite数据库持久化存储在截图服务的`DATA_DIR`目录中
   - 使用`basemaps.db`数据库文件
   - 数据以JSON格式序列化后存储
   - 支持按名称或类型查询

3. **配置同步**：
   - 可以从服务器加载保存的配置到前端工具中
   - 支持将本地配置批量发送到服务器
   - 服务器配置优先级高于本地配置

### 加载服务器配置

使用以下接口从服务器获取配置：

```
GET http://localhost:3000/basemap
GET http://localhost:3000/basemap/配置名称
GET http://localhost:3000/basemap/type/wmts
```

## 与截图服务集成

本工具可以与 Cesium 截图服务集成，允许用户将配置好的底图服务发送到截图服务器。

### 使用方法

1. 配置好底图服务参数
2. 点击"发送到服务器"按钮将配置发送到截图服务
3. 发送成功后，可以使用截图服务的接口生成截图

### 截图接口

使用发送到服务器的配置生成截图：

```
GET http://localhost:3000/screenshot?basemapName=配置名称
```

响应将是一个 PNG 格式的图片。

### 内网部署注意事项

在内网环境部署时：

1. **服务器地址配置**：
   - 修改`.env`文件中的`VITE_SERVER_URL`环境变量为内网服务器地址
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
