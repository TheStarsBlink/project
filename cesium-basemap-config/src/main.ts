import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// 全局配置Cesium
window.CESIUM_BASE_URL = '/'

// 初始化应用
const app = createApp(App)

// 使用插件
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 安装全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('应用错误:', err)
  console.error('错误位置:', info)
}

// 挂载应用
app.mount('#app')
