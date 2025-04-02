import { createRouter, createWebHistory } from 'vue-router'
import BasemapConfig from '../components/BasemapConfig.vue'
import ScheduledScreenshot from '../components/ScheduledScreenshot.vue'
import HomePage from '../components/HomePage.vue'
import StreamingTest from '../components/StreamingTest.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: BasemapConfig
    },
    {
      path: '/scheduled',
      name: 'scheduled',
      component: ScheduledScreenshot
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: HomePage
    },
    {
      path: '/streaming',
      name: 'streaming',
      component: StreamingTest
    }
  ]
})

export default router 