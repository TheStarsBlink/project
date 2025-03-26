# 内网部署说明

最主要的是要在内网用，所以所有的依赖都要打包进docker中。

## 底图配置持久化（SQLite）

本项目使用SQLite进行底图配置数据的持久化存储，针对内网环境做了以下特殊处理：

### 1. 依赖打包
- SQLite3模块和相关依赖全部打包在Docker镜像中
- 使用pnpm的离线镜像功能，确保不需要外网连接
- Alpine Linux基础镜像中额外安装了sqlite和sqlite-dev包
- 特别处理了SQLite3的二进制模块，确保在Alpine Linux中正常工作

### 2. 数据持久化实现
- 使用 `sqlite3` 和 `sqlite` 模块实现数据库操作
- 数据库文件命名为 `basemaps.db`，存储在 `DATA_DIR` 指定的目录中
- 数据表自动创建，包含 id、name、type、config、createTime和updateTime字段
- 底图配置信息以JSON格式序列化后存储
- 支持按名称、类型查询和删除配置

### 3. Docker卷配置
- 数据存储在容器内的`/app/data`目录
- 通过Docker卷映射确保数据不会因容器重启而丢失
- 配置了正确的文件权限，确保SQLite可以正常读写
- 在docker-compose.yml中定义了持久化卷：
  ```yaml
  volumes:
    screenshot-data:
      driver: local
  ```

## Docker镜像构建与部署

### 离线部署步骤

```bash
# 在可访问外网的环境中执行
# 1. 安装依赖并构建镜像
pnpm install -w
docker build -t cesium-screenshot:latest .
docker build -t cesium-basemap-config:latest ./cesium-basemap-config

# 2. 将镜像保存为文件
docker save -o cesium-screenshot.tar cesium-screenshot:latest
docker save -o cesium-basemap-config.tar cesium-basemap-config:latest

# 3. 将tar文件和部署文件复制到光盘或U盘
mkdir -p deploy-package
cp cesium-screenshot.tar cesium-basemap-config.tar docker-compose.yml cd-burn/deploy.sh cd-burn/UBUNTU-DEPLOY.md deploy-package/

# 在内网环境中执行
# 4. 将deploy-package目录内容复制到Ubuntu服务器
# 5. 给部署脚本增加执行权限
chmod +x deploy.sh

# 6. 执行部署脚本
./deploy.sh
```

### 内网服务器要求

1. **系统要求**：
   - 推荐 Ubuntu 20.04 LTS 或更高版本
   - 最低 4GB 内存（推荐 8GB 以上）
   - 最低 20GB 可用磁盘空间

2. **软件要求**：
   - Docker 20.10.0 或更高版本
   - Docker Compose 2.0.0 或更高版本

3. **网络要求**：
   - 内网服务器需开放3000端口（截图服务）
   - 如使用底图配置工具，需开放8080端口

## 部署文件说明

完整的部署包应包含以下文件：

1. **cesium-screenshot.tar** - 截图服务的Docker镜像
2. **cesium-basemap-config.tar** - 底图配置工具的Docker镜像
3. **docker-compose.yml** - Docker Compose配置文件
4. **deploy.sh** - 自动化部署脚本
5. **UBUNTU-DEPLOY.md** - Ubuntu服务器部署说明

## 数据备份与恢复

### 备份SQLite数据
```bash
# 1. 进入Docker容器
docker exec -it screenshot-service /bin/sh

# 2. 复制数据库文件
cp /app/data/basemaps.db /app/data/basemaps.db.bak

# 3. 退出容器
exit

# 4. 从主机将备份文件复制出来
docker cp screenshot-service:/app/data/basemaps.db.bak ./basemaps_backup_$(date +%Y%m%d).db
```

### 恢复SQLite数据
```bash
# 1. 将备份文件复制到容器
docker cp basemaps_backup.db screenshot-service:/app/data/

# 2. 进入容器
docker exec -it screenshot-service /bin/sh

# 3. 停止服务以避免数据库锁定
# 注意：这将暂时中断服务
pkill -f node

# 4. 恢复数据库
mv /app/data/basemaps.db /app/data/basemaps.db.old
mv /app/data/basemaps_backup.db /app/data/basemaps.db
chmod 644 /app/data/basemaps.db

# 5. 退出容器，服务将自动重启
exit
```

## 常见问题与排障

### SQLite相关问题

1. **权限错误**：
   - 错误信息：`SQLITE_CANTOPEN: unable to open database file`
   - 解决方案：检查DATA_DIR目录权限，确保用户有写入权限
   ```bash
   # 进入容器
   docker exec -it screenshot-service /bin/sh
   
   # 检查data目录权限
   ls -la /app/data
   
   # 修复权限
   chmod 755 /app/data
   chmod 644 /app/data/basemaps.db
   ```

2. **数据库锁定错误**：
   - 错误信息：`SQLITE_BUSY: database is locked`
   - 解决方案：这通常是由于同时有多个写入操作造成的
   ```bash
   # 重启服务以释放锁
   docker-compose restart screenshot-service
   
   # 如果问题持续，检查服务日志
   docker-compose logs screenshot-service
   ```

3. **数据库损坏**：
   - 错误信息：`SQLITE_CORRUPT: database disk image is malformed`
   - 解决方案：恢复最近的备份，或创建新数据库
   ```bash
   # 进入容器
   docker exec -it screenshot-service /bin/sh
   
   # 重命名损坏的数据库
   mv /app/data/basemaps.db /app/data/basemaps.db.corrupted
   
   # 服务下次启动会自动创建新的数据库
   exit
   
   # 重启服务
   docker-compose restart screenshot-service
   ```

### 服务无法启动

1. 检查服务日志：
   ```bash
   docker-compose logs --tail=100 screenshot-service
   ```

2. 确认数据目录权限：
   ```bash
   docker exec -it screenshot-service /bin/sh -c "ls -la /app/data"
   ```

3. 确认Docker镜像已正确加载：
   ```bash
   docker images | grep screenshot
   ```

4. 检查系统资源：
   ```bash
   # 检查磁盘空间
   df -h
   
   # 检查内存使用
   free -m
   ```

### 性能优化建议

1. **调整并发任务数**：
   在`docker-compose.yml`中修改`MAX_CONCURRENT_JOBS`环境变量：
   ```yaml
   environment:
     - MAX_CONCURRENT_JOBS=3  # 根据服务器CPU和内存调整
   ```

2. **SQLite优化**：
   SQLite默认配置适用于大多数场景，但对于高并发写入可能需要优化：
   ```bash
   # 进入容器
   docker exec -it screenshot-service /bin/sh
   
   # 检查数据库文件大小
   ls -lh /app/data/basemaps.db
   
   # 如果数据库文件过大，可以执行VACUUM操作
   sqlite3 /app/data/basemaps.db "VACUUM;"
   ```

3. **系统资源监控**：
   定期监控系统资源使用情况，尤其是内存和磁盘空间：
   ```bash
   # 创建简单的监控脚本
   cat > monitor.sh << 'EOF'
   #!/bin/bash
   echo "======== $(date) ========"
   echo "Docker容器状态:"
   docker ps
   echo -e "\n内存使用情况:"
   free -m
   echo -e "\n磁盘使用情况:"
   df -h
   EOF
   
   chmod +x monitor.sh
   
   # 每小时执行一次监控
   (crontab -l 2>/dev/null; echo "0 * * * * $(pwd)/monitor.sh >> $(pwd)/system_monitor.log") | crontab -
   ```