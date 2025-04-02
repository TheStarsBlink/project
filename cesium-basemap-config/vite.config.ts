import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'node_modules/cesium/Build/Cesium/Workers/**'),
          dest: 'Workers'
        },
        {
          src: path.resolve(__dirname, 'node_modules/cesium/Build/Cesium/ThirdParty/**'),
          dest: 'ThirdParty'
        },
        {
          src: path.resolve(__dirname, 'node_modules/cesium/Build/Cesium/Assets/**'),
          dest: 'Assets'
        },
        {
          src: path.resolve(__dirname, 'node_modules/cesium/Build/Cesium/Widgets/**'),
          dest: 'Widgets'
        }
      ]
    })
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify('')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'cesium': path.resolve(__dirname, 'node_modules/cesium')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // 服务不可用时的错误处理
            res.writeHead(503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ 
              error: true, 
              message: '后端服务不可用，请确保服务已启动' 
            }));
          });
        }
      },
      '/data': {
        target: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            res.writeHead(503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ 
              error: true, 
              message: '后端服务不可用，请确保服务已启动' 
            }));
          });
        }
      },
      '/screenshot': {
        target: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            res.writeHead(503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ 
              error: true, 
              message: '后端服务不可用，请确保服务已启动' 
            }));
          });
        }
      },
      '/status': {
        target: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            res.writeHead(503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ 
              error: true, 
              message: '后端服务不可用，请确保服务已启动' 
            }));
          });
        }
      },
      '/basemap': {
        target: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            res.writeHead(503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ 
              error: true, 
              message: '后端服务不可用，请确保服务已启动' 
            }));
          });
        }
      },
      '/socket.io': {
        target: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // 如果是 WebSocket 请求，无法直接响应
            if (!res.writeHead) return;
            
            res.writeHead(503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({ 
              error: true, 
              message: '后端服务不可用，请确保服务已启动' 
            }));
          });
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['cesium'],
    include: ['socket.io-client']
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      external: ['cesium'],
      output: {
        // Prevent the bundler from splitting Cesium into multiple chunks
        manualChunks(id) {
          if (id.includes('cesium')) {
            return 'cesium';
          }
        },
        globals: {
          cesium: 'Cesium'
        }
      }
    }
  }
})
