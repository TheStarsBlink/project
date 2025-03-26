@echo off
rem 设置UTF-8编码
chcp 65001
echo.

echo === 内网部署打包脚本（Windows版本）===
echo 此脚本将创建完全自包含的Docker镜像，适用于内网环境
echo.

rem 检查Docker是否正在运行
docker info > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Docker未运行或未安装。请确保Docker Desktop已启动。
    echo.
    pause
    exit /b 1
)

rem 确保目录存在
if not exist npm-cache mkdir npm-cache
if not exist data mkdir data

rem 检查pnpm是否安装
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 未找到pnpm，正在安装...
    npm install -g pnpm
)

rem 确保依赖已下载并缓存
echo 安装并缓存所有依赖...
call pnpm install -w --prefer-offline

rem 构建主项目 - 注意：仅尝试构建，但即使失败也继续
echo 构建主项目...
call pnpm build
if %ERRORLEVEL% NEQ 0 (
    echo [警告] 构建失败，但将继续后续步骤...
    echo.
)

rem 创建导出目录
if not exist docker-images mkdir docker-images

rem 创建光盘刻录目录
if not exist cd-burn mkdir cd-burn

rem 检查Docker镜像是否存在，没有就构建
docker images cesium-screenshot:latest --format "{{.Repository}}" | findstr /i "cesium-screenshot" > nul
if %ERRORLEVEL% NEQ 0 (
    echo 构建截图服务Docker镜像...
    docker build -t cesium-screenshot:latest .
) else (
    echo 截图服务Docker镜像已存在，跳过构建...
)

rem 检查底图配置工具Docker镜像是否存在
docker images cesium-basemap-config:latest --format "{{.Repository}}" | findstr /i "cesium-basemap-config" > nul
if %ERRORLEVEL% NEQ 0 (
    echo 构建底图配置工具Docker镜像...
    docker build -t cesium-basemap-config:latest ./cesium-basemap-config
) else (
    echo 底图配置工具Docker镜像已存在，跳过构建...
)

rem 保存镜像到文件
echo 保存镜像到tar文件...
docker save -o docker-images\cesium-screenshot.tar cesium-screenshot:latest
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 保存cesium-screenshot镜像失败
    echo.
    pause
    exit /b 1
)

docker save -o docker-images\cesium-basemap-config.tar cesium-basemap-config:latest
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 保存cesium-basemap-config镜像失败
    echo.
    pause
    exit /b 1
)

rem 打包必要的配置文件
echo 打包配置文件...
copy docker-compose.yml docker-images\
copy INTRANET.md docker-images\README.md

rem 创建内网部署脚本 (使用UTF-8编码)
echo 创建部署脚本...
(
    echo #!/bin/bash
    echo 
    echo echo "=== 内网部署脚本 ==="
    echo 
    echo # 加载镜像
    echo echo "正在加载Docker镜像..."
    echo docker load -i cesium-screenshot.tar
    echo docker load -i cesium-basemap-config.tar
    echo 
    echo # 创建数据目录
    echo mkdir -p data
    echo 
    echo # 启动服务
    echo echo "启动服务..."
    echo docker-compose up -d
    echo 
    echo echo "服务已启动"
    echo echo "截图服务地址: http://localhost:3000"
    echo echo "底图配置工具地址: http://localhost:8080"
) > docker-images\deploy.sh

rem 创建说明文档
echo 创建部署说明文档...
(
    echo # 内网Ubuntu部署说明
    echo 
    echo ## 前置条件
    echo 
    echo - Ubuntu 18.04+/Debian系统
    echo - 已安装Docker和Docker Compose
    echo 
    echo ## 安装Docker和Docker Compose（如果尚未安装）
    echo 
    echo ```bash
    echo sudo apt update
    echo sudo apt install -y docker.io docker-compose
    echo sudo systemctl enable docker
    echo sudo systemctl start docker
    echo sudo usermod -aG docker $USER  # 添加当前用户到docker组，需要重新登录生效
    echo ```
    echo 
    echo ## 部署步骤
    echo 
    echo 1. 将光盘中的所有文件复制到服务器的某个目录
    echo 2. 给部署脚本增加执行权限：
    echo    ```bash
    echo    chmod +x deploy.sh
    echo    ```
    echo 3. 执行部署脚本：
    echo    ```bash
    echo    ./deploy.sh
    echo    ```
    echo 4. 服务将自动启动，访问地址：
    echo    - 截图服务: http://localhost:3000
    echo    - 底图配置工具: http://localhost:8080
    echo 
    echo ## 数据存储
    echo 
    echo 数据存储在 `data` 目录中，确保此目录有适当的权限。请定期备份此目录。
) > docker-images\UBUNTU-DEPLOY.md

rem 复制文件到刻录目录
echo 复制文件到光盘刻录目录...
copy docker-images\*.* cd-burn\

echo.
echo 完成！
echo.
echo 请将cd-burn目录中的所有文件刻录到光盘，并带到Ubuntu服务器上安装。
echo 在Ubuntu服务器上，请按照UBUNTU-DEPLOY.md文件中的说明进行操作。
echo.
pause 