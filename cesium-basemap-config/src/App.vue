<!--
 * @Author: liwentao 132535285+TheStarsBlink@users.noreply.github.com
 * @Date: 2025-03-24 22:48:33
 * @LastEditors: liwentao 132535285+TheStarsBlink@users.noreply.github.com
 * @LastEditTime: 2025-03-24 23:58:00
 * @FilePath: \project\cesium-basemap-config\src\App.vue
 * @Description: 
 * 
 * Copyright (c) 2025 by liwentao 132535285+TheStarsBlink@users.noreply.github.com, All Rights Reserved. 
-->
<script setup lang="ts">
import { ref, onMounted, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const isLoading = ref(true)
const hasError = ref(false)
const errorMessage = ref('')

const router = useRouter()

onMounted(() => {
  console.log('App 组件已加载')
  setTimeout(() => {
    isLoading.value = false
  }, 800)
})

onErrorCaptured((err) => {
  console.error('捕获到错误:', err)
  hasError.value = true
  errorMessage.value = err instanceof Error ? err.message : String(err)
  return false
})

const retryRoute = () => {
  hasError.value = false
  errorMessage.value = ''
  router.go(0)
}
</script>

<template>
  <div class="app-container">
    <div v-if="isLoading" class="loading-screen">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
    <div v-else-if="hasError" class="error-screen">
      <h2>出错了</h2>
      <p>{{ errorMessage || '应用加载时发生错误' }}</p>
      <button @click="retryRoute">重试</button>
    </div>
    <router-view v-else></router-view>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  overflow-y: auto;
}

.app-container {
  min-height: 100vh;
  width: 100vw;
  overflow-y: auto;
  position: relative;
}

.loading-screen,
.error-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background-color: #f5f5f5;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.error-screen h2 {
  color: #e74c3c;
  margin-bottom: 10px;
}

.error-screen button {
  margin-top: 20px;
  padding: 8px 16px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
