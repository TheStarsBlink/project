# 内网Ubuntu部署说明

## 前置条件

- Ubuntu 18.04+/Debian系统
- 已安装Docker和Docker Compose

## 安装Docker和Docker Compose（如果尚未安装）

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER  # 添加当前用户到docker组，需要重新登录生效
```

## 光盘内容检查

在部署前，请检查光盘中是否包含以下文件：
- `deploy.sh`：部署脚本
- `docker-compose.yml`：Docker Compose配置文件
- `README.md`：内网部署说明
- `cesium-screenshot.tar`：截图服务Docker镜像 (必须)
- `cesium-basemap-config.tar`：底图配置工具Docker镜像 (必须)

**注意**：如果缺少Docker镜像文件 (*.tar)，请查看下面的"镜像构建说明"章节。

## 部署步骤

1. 将光盘中的所有文件复制到服务器的某个目录
2. 给部署脚本增加执行权限：
   ```bash
   chmod +x deploy.sh
   ```
3. 执行部署脚本：
   ```bash
   ./deploy.sh
   ```
4. 服务将自动启动，访问地址：
   - 截图服务: http://localhost:3000
   - 底图配置工具: http://localhost:8080

## 数据存储

数据存储在 `data` 目录中，确保此目录有适当的权限。请定期备份此目录。

## 镜像构建说明（仅当缺少镜像文件时）

如果光盘中缺少Docker镜像文件，您需要在能够访问互联网的环境中构建它们：

1. 构建截图服务镜像：

```bash
# 在包含项目代码的目录中执行
docker build -t cesium-screenshot:latest .
docker save -o cesium-screenshot.tar cesium-screenshot:latest
```

2. 构建底图配置工具镜像：

```bash
# 在cesium-basemap-config目录中执行
cd cesium-basemap-config
docker build -t cesium-basemap-config:latest .
docker save -o cesium-basemap-config.tar cesium-basemap-config:latest
```

3. 将生成的tar文件复制到与deploy.sh和docker-compose.yml相同的目录，然后继续执行部署步骤。

## 故障排除

1. **Docker镜像加载失败**：
   ```bash
   # 检查镜像文件是否存在
   ls -la *.tar
   
   # 尝试手动加载镜像
   docker load -i cesium-screenshot.tar
   docker load -i cesium-basemap-config.tar
   ```

2. **服务无法启动**：
   ```bash
   # 检查Docker日志
   docker-compose logs
   
   # 检查数据目录权限
   ls -la data
   sudo chmod -R 777 data  # 如有必要，修改权限
   ```

3. **数据库访问错误**：
   ```bash
   # 确认数据目录存在
   mkdir -p data
   
   # 重启服务
   docker-compose down
   docker-compose up -d
   ```
