import { createRouter, createWebHistory } from 'vue-router'
import BasemapConfig from '../components/BasemapConfig.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: BasemapConfig
    }
  ]
})

export default router 