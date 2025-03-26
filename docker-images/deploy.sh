#!/bin/bash 
 
echo "=== 内网部署脚本 ===" 
 
# 加载镜像 
echo "正在加载Docker镜像..." 
docker load -i cesium-screenshot.tar 
docker load -i cesium-basemap-config.tar 
 
# 创建数据目录 
mkdir -p data 
 
# 启动服务 
echo "启动服务..." 
docker-compose up -d 
 
echo "服务已启动" 
echo "截图服务地址: http://localhost:3000" 
echo "底图配置工具地址: http://localhost:8080" 
