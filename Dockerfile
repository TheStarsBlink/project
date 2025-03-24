FROM node:18-alpine AS builder

# 安装pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 设置工作目录
WORKDIR /app

# 复制pnpm相关文件
COPY pnpm-lock.yaml ./
COPY package.json ./

# 如果有workspace配置，也需要复制
COPY pnpm-workspace.yaml* ./

# 复制子项目的package.json
COPY cesium-basemap-config/package.json ./cesium-basemap-config/
COPY src/package.json ./src/

# 使用pnpm离线镜像模式安装依赖
RUN pnpm install --frozen-lockfile --prefer-offline

# 复制所有源代码
COPY . .

# 构建项目
RUN pnpm build

# 第二阶段：运行阶段
FROM node:18-alpine

# 安装Chrome依赖 (Puppeteer所需)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# 设置环境变量指向Alpine的Chromium
ENV CHROME_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 设置工作目录
WORKDIR /app

# 复制构建好的代码
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "src/server.js"] 