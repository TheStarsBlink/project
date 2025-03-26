FROM node:18-alpine AS builder

# 安装pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 设置工作目录
WORKDIR /app

# 设置pnpm环境变量以确保离线安装
ENV PNPM_HOME="/app/.pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 首先复制npmrc和pnpm-lock文件
COPY .npmrc pnpm-lock.yaml ./

# 如果存在npm缓存目录，复制它
COPY npm-cache ./npm-cache

# 复制package.json文件
COPY package.json ./

# 如果有workspace配置，也需要复制
COPY pnpm-workspace.yaml* ./

# 复制子项目的package.json
COPY cesium-basemap-config/package.json ./cesium-basemap-config/
COPY src/package.json ./src/

# 使用pnpm离线安装依赖
RUN pnpm install --offline --frozen-lockfile --prefer-offline

# 复制所有源代码
COPY . .

# 构建项目
RUN pnpm build

# 第二阶段：运行阶段
FROM node:18-alpine

# 安装Chrome依赖 (Puppeteer所需) 和 SQLite
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn \
    sqlite \
    sqlite-dev

# 设置环境变量指向Alpine的Chromium
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 设置工作目录
WORKDIR /app

# 复制构建好的代码和依赖
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

# 确保SQLite二进制文件被正确复制
COPY --from=builder /app/node_modules/sqlite3/build/Release/node_sqlite3.node ./node_modules/sqlite3/build/Release/node_sqlite3.node

# 创建数据目录
RUN mkdir -p /app/data
VOLUME /app/data

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "dist/server.js"]