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
