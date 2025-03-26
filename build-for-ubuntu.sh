#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 内网部署打包脚本 ===${NC}"
echo -e "${BLUE}此脚本将创建完全自包含的Docker镜像，适用于内网环境${NC}"

# 确保目录存在
mkdir -p npm-cache
mkdir -p data

# 安装pnpm（如果需要）
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}未找到pnpm，正在安装...${NC}"
    npm install -g pnpm
fi

# 确保依赖已下载并缓存
echo -e "${BLUE}安装并缓存所有依赖...${NC}"
pnpm install -w --prefer-offline

# 构建主项目
echo -e "${BLUE}构建主项目...${NC}"
pnpm build

# 构建截图服务的Docker镜像
echo -e "${BLUE}构建截图服务Docker镜像...${NC}"
docker build -t cesium-screenshot:latest .

# 构建底图配置工具的Docker镜像
echo -e "${BLUE}构建底图配置工具Docker镜像...${NC}"
docker build -t cesium-basemap-config:latest ./cesium-basemap-config

# 创建导出目录
mkdir -p docker-images

# 保存镜像到文件
echo -e "${BLUE}保存镜像到tar文件...${NC}"
docker save -o docker-images/cesium-screenshot.tar cesium-screenshot:latest
docker save -o docker-images/cesium-basemap-config.tar cesium-basemap-config:latest

# 打包必要的配置文件
echo -e "${BLUE}打包配置文件...${NC}"
cp docker-compose.yml docker-images/
cp INTRANET.md docker-images/README.md

# 创建内网部署脚本
cat > docker-images/deploy.sh << 'EOF'
#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== 内网部署脚本 ===${NC}"

# 加载镜像
echo -e "${BLUE}正在加载Docker镜像...${NC}"
docker load -i cesium-screenshot.tar
docker load -i cesium-basemap-config.tar

# 创建数据目录
mkdir -p data

# 启动服务
echo -e "${BLUE}启动服务...${NC}"
docker-compose up -d

echo -e "${GREEN}服务已启动${NC}"
echo -e "${GREEN}截图服务地址: http://localhost:3000${NC}"
echo -e "${GREEN}底图配置工具地址: http://localhost:8080${NC}"
EOF

# 设置部署脚本权限
chmod +x docker-images/deploy.sh

# 创建最终的zip包
echo -e "${BLUE}创建最终部署包...${NC}"
cd docker-images && zip -r ../cesium-screenshot-package.zip * && cd ..

echo -e "${GREEN}完成！${NC}"
echo -e "${GREEN}部署包已创建: cesium-screenshot-package.zip${NC}"
echo -e "${YELLOW}请将此包传输到内网环境，解压后运行 ./deploy.sh${NC}" 