#!/bin/bash

# 颜色设置
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 内网部署脚本 ===${NC}"
echo ""

# 检查Docker是否已安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker未安装!${NC}"
    echo -e "请先安装Docker:"
    echo -e "    sudo apt update"
    echo -e "    sudo apt install -y docker.io docker-compose"
    echo -e "    sudo systemctl enable docker"
    echo -e "    sudo systemctl start docker"
    exit 1
fi

# 检查Docker是否正在运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker未运行!${NC}"
    echo -e "请启动Docker服务:"
    echo -e "    sudo systemctl start docker"
    exit 1
fi

# 检查必要的文件是否存在
echo -e "${BLUE}检查必要文件...${NC}"
missing_files=false

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}错误: 未找到docker-compose.yml文件${NC}"
    missing_files=true
fi

if [ ! -f "cesium-screenshot.tar" ]; then
    echo -e "${RED}错误: 未找到cesium-screenshot.tar镜像文件${NC}"
    missing_files=true
fi

if [ ! -f "cesium-basemap-config.tar" ]; then
    echo -e "${RED}错误: 未找到cesium-basemap-config.tar镜像文件${NC}"
    missing_files=true
fi

if [ "$missing_files" = true ]; then
    echo -e "${RED}缺少必要文件，无法继续部署。${NC}"
    echo -e "请检查是否已将所有文件复制到当前目录。"
    echo -e "参考UBUNTU-DEPLOY-NEW.md文件的'镜像构建说明'部分进行处理。"
    exit 1
fi

# 加载镜像
echo -e "${BLUE}正在加载Docker镜像...${NC}"
echo -e "正在加载cesium-screenshot镜像（可能需要几分钟）..."
docker load -i cesium-screenshot.tar
if [ $? -ne 0 ]; then
    echo -e "${RED}加载cesium-screenshot镜像失败${NC}"
    exit 1
fi

echo -e "正在加载cesium-basemap-config镜像（可能需要几分钟）..."
docker load -i cesium-basemap-config.tar
if [ $? -ne 0 ]; then
    echo -e "${RED}加载cesium-basemap-config镜像失败${NC}"
    exit 1
fi

# 创建数据目录
echo -e "${BLUE}创建数据目录...${NC}"
mkdir -p data
chmod 777 data

# 启动服务
echo -e "${BLUE}启动服务...${NC}"
docker-compose up -d

# 验证服务是否正常启动
echo -e "${BLUE}验证服务状态...${NC}"
sleep 5

docker-compose ps | grep -q "Up"
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}警告: 服务可能未正常启动，请检查日志:${NC}"
    echo -e "    docker-compose logs"
    echo ""
else
    echo -e "${GREEN}服务已成功启动!${NC}"
fi

# 显示访问信息
echo -e "${GREEN}=== 部署完成 ===${NC}"
echo ""
echo -e "您可以通过以下地址访问服务:"
echo -e "  截图服务: ${BLUE}http://localhost:3000${NC}"
echo -e "  底图配置工具: ${BLUE}http://localhost:8080${NC}"
echo ""
echo -e "数据存储在 ${YELLOW}data${NC} 目录中，请定期备份。"
echo -e "如需查看服务日志，请运行: ${YELLOW}docker-compose logs${NC}"
echo -e "如需停止服务，请运行: ${YELLOW}docker-compose down${NC}" 