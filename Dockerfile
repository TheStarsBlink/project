# 使用官方 Node.js 作为基础镜像
FROM node:18-slim

# 安装必要的依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    libgtk-4-1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 创建工作目录
WORKDIR /app

# 复制 Chrome 安装包并安装
COPY resources/google-chrome-stable.deb /tmp/
RUN apt-get update && apt-get install -y /tmp/google-chrome-stable.deb --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && rm /tmp/google-chrome-stable.deb

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖，包括开发依赖
RUN npm ci

# 复制 TypeScript 配置文件
COPY tsconfig.json ./

# 复制 Cesium 库（如果需要）
COPY resources/Cesium-1.111.zip /tmp/
RUN mkdir -p /app/public/cesium \
    && unzip /tmp/Cesium-1.111.zip -d /app/public/cesium \
    && rm /tmp/Cesium-1.111.zip

# 复制源代码
COPY src/ ./src/
COPY public/ ./public/

# 编译 TypeScript
RUN npm run build

# 确保 public 目录存在
RUN mkdir -p /app/public

# 设置环境变量
ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/status || exit 1

# 启动服务
CMD ["node", "dist/server.js"] 