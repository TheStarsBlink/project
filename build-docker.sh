#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始构建Docker镜像...${NC}"

# 确保目录结构
mkdir -p data

# 检查pnpm-lock.yaml文件是否存在
if [ ! -f "pnpm-lock.yaml" ]; then
  echo -e "${BLUE}未找到pnpm-lock.yaml文件，正在创建...${NC}"
  pnpm install
fi

# 检查cesium-basemap-config中的pnpm-lock.yaml
if [ ! -f "cesium-basemap-config/pnpm-lock.yaml" ]; then
  echo -e "${BLUE}未找到cesium-basemap-config/pnpm-lock.yaml文件，正在创建...${NC}"
  cd cesium-basemap-config && pnpm install && cd ..
fi

# 构建截图服务
echo -e "${BLUE}构建截图服务Docker镜像...${NC}"
docker build -t screenshot-service:latest .

# 构建底图配置工具
echo -e "${BLUE}构建底图配置工具Docker镜像...${NC}"
docker build -t cesium-basemap-config:latest ./cesium-basemap-config

# 使用docker-compose启动服务
echo -e "${BLUE}使用docker-compose启动服务...${NC}"
docker-compose up -d

# 显示运行状态
echo -e "${BLUE}服务状态:${NC}"
docker-compose ps

echo -e "${GREEN}服务已启动。${NC}"
echo -e "${GREEN}截图服务地址: http://localhost:3000${NC}"
echo -e "${GREEN}底图配置工具地址: http://localhost:8080${NC}" 