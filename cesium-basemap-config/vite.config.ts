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
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/data': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/screenshot': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/status': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/basemap': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: ['cesium']
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
