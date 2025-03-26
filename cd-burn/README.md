# 内网部署说明

最主要的是要在内网用，所以所有的依赖都要打包进docker中，写代码的时候不要忘记这个

## 底图配置持久化（SQLite）

本项目使用SQLite进行底图配置数据的持久化存储，针对内网环境做了以下特殊处理：

### 1. 依赖打包

- SQLite3模块和相关依赖全部打包在Docker镜像中
- 使用pnpm的离线镜像功能，确保不需要外网连接
- Alpine Linux基础镜像中额外安装了sqlite和sqlite-dev包

### 2. 数据持久化

- 数据存储在容器内的`/app/data`目录
- 通过Docker卷映射确保数据不会因容器重启而丢失
- 配置了正确的文件权限，确保SQLite可以正常读写

### 3. 使用限制

- SQLite是文件型数据库，不支持多个容器同时写入同一数据库文件
- 如需扩展为多实例部署，需考虑使用其他数据库方案

## Docker镜像构建与部署

### 构建优化

1. **多阶段构建**：使用多阶段Dockerfile减小最终镜像大小
2. **依赖缓存**：通过npm-cache目录预先缓存所有依赖
3. **离线安装**：使用`--offline`和`--prefer-offline`参数确保不需要外网访问

### 离线部署步骤

```bash
# 在可访问外网的环境中执行
# 1. 安装依赖并构建镜像
pnpm install -w
docker build -t cesium-screenshot .

# 2. 将镜像保存为文件
docker save -o cesium-screenshot.tar cesium-screenshot

# 3. 将tar文件和docker-compose.yml文件拷贝到内网环境

# 在内网环境中执行
# 4. 加载镜像
docker load -i cesium-screenshot.tar

# 5. 启动服务
docker-compose up -d
```

## 常见问题与排障

### SQLite相关问题

1. **权限错误**：
   - 错误信息：`SQLITE_CANTOPEN: unable to open database file`
   - 解决方案：检查DATA_DIR目录权限，确保用户有写入权限

2. **版本兼容**：
   - 错误信息：`Error: The module was compiled against a different Node.js version...`
   - 解决方案：确保使用正确版本的Node.js运行时；如果在Docker中，重新构建镜像

3. **数据损坏**：
   - 错误信息：`SQLITE_CORRUPT: database disk image is malformed`
   - 解决方案：尝试恢复数据库或使用备份；确保不同进程没有同时写入同一数据库文件

### 服务无法启动

1. 检查服务日志：`docker logs cesium-screenshot`
2. 确认数据目录权限：`docker exec cesium-screenshot ls -la /app/data`
3. 尝试在交互模式下启动：`docker run -it --rm cesium-screenshot sh`

## 离线更新流程

1. 在外网环境修改代码并测试
2. 重新构建镜像并导出
3. 将新镜像传输到内网环境
4. 加载新镜像并重启服务（数据目录被挂载为卷，不会丢失）