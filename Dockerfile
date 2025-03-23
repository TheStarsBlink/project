# 使用 Node.js 18 作为基础镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 安装必要的依赖项，包括 Chromium 和其他必须的库
RUN apt-get update && apt-get install -y --no-install-recommends \
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
    unzip \
    chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 设置环境变量，告诉 Puppeteer 使用已安装的 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium

# 复制 package.json 和 package-lock.json (或 yarn.lock)
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 确保 public/cesium 目录存在
RUN mkdir -p public/cesium/Cesium

# 如果 node_modules/cesium 存在，则复制到 public/cesium
RUN if [ -d "node_modules/cesium/Build/Cesium" ]; then \
      cp -r node_modules/cesium/Build/Cesium/* public/cesium/Cesium/ || true; \
    fi

# 编译 TypeScript
RUN npm run build

# 暴露服务端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/server.js"] 