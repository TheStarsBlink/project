<template>
  <div class="basemap-config">
    <div class="config-form">
      <h2>底图服务配置</h2>
      
      <div class="form-section">
        <h3>基本设置</h3>
        <div class="form-group">
          <label for="name">配置名称：</label>
          <input 
            type="text" 
            id="name" 
            v-model="configName" 
            placeholder="请输入配置名称"
          >
        </div>
        
        <div class="form-group">
          <label for="url">服务地址：</label>
          <input 
            type="text" 
            id="url" 
            v-model="basemapUrl" 
            placeholder="请输入底图服务地址"
            @input="updateBasemap"
          >
        </div>
        
        <div class="form-group">
          <label for="type">服务类型：</label>
          <select id="type" v-model="basemapType" @change="updateBasemap">
            <option value="wmts">WMTS</option>
            <option value="wms">WMS</option>
            <option value="xyz">XYZ</option>
          </select>
        </div>
      </div>
      
      <div class="form-section" v-if="basemapType === 'wmts'">
        <h3>WMTS 参数</h3>
        <div class="form-group">
          <label for="layer">图层名：</label>
          <input 
            type="text" 
            id="layer" 
            v-model="wmtsParams.layer" 
            @input="updateBasemap"
          >
        </div>
        <div class="form-group">
          <label for="style">样式：</label>
          <input 
            type="text" 
            id="style" 
            v-model="wmtsParams.style" 
            @input="updateBasemap"
          >
        </div>
        <div class="form-group">
          <label for="tileMatrixSetID">瓦片矩阵集：</label>
          <input 
            type="text" 
            id="tileMatrixSetID" 
            v-model="wmtsParams.tileMatrixSetID" 
            @input="updateBasemap"
          >
        </div>
        <div class="form-group">
          <label for="format">格式：</label>
          <input 
            type="text" 
            id="format" 
            v-model="wmtsParams.format" 
            @input="updateBasemap"
          >
        </div>
        <div class="form-group">
          <label for="maximumLevel">最大级别：</label>
          <input 
            type="number" 
            id="maximumLevel" 
            v-model="wmtsParams.maximumLevel" 
            @input="updateBasemap"
          >
        </div>
      </div>
      
      <div class="form-section" v-if="basemapType === 'wms'">
        <h3>WMS 参数</h3>
        <div class="form-group">
          <label for="wmsLayer">图层名：</label>
          <input 
            type="text" 
            id="wmsLayer" 
            v-model="wmsParams.layer" 
            @input="updateBasemap"
          >
        </div>
        <div class="form-group">
          <label for="wmsFormat">格式：</label>
          <input 
            type="text" 
            id="wmsFormat" 
            v-model="wmsParams.format" 
            @input="updateBasemap"
          >
        </div>
        <div class="form-group">
          <label for="transparent">透明：</label>
          <input 
            type="checkbox" 
            id="transparent" 
            v-model="wmsParams.transparent" 
            @change="updateBasemap"
          >
        </div>
      </div>
      
      <div class="button-group">
        <button class="btn" @click="saveConfig">保存配置</button>
        <button class="btn" @click="exportConfig">导出配置</button>
        <button class="btn" @click="sendToServer">发送到服务器</button>
      </div>
      
      <div class="form-section saved-configs" v-if="store.savedConfigs.length > 0">
        <h3>已保存的配置</h3>
        <div class="config-list">
          <div 
            v-for="(config, index) in store.savedConfigs" 
            :key="index" 
            class="config-item"
          >
            <span>{{ config.name }}</span>
            <div class="config-actions">
              <button class="btn-sm" @click="loadConfig(index)">加载</button>
              <button class="btn-sm btn-danger" @click="deleteConfig(index)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="cesiumContainer" class="map-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useBasemapStore } from '../stores/basemap'
import type { BasemapConfig } from '../stores/basemap'

const store = useBasemapStore()

// 响应式引用基本参数
const basemapUrl = ref(store.currentConfig.url)
const basemapType = ref(store.currentConfig.type)
const configName = ref(store.currentConfig.name)

// WMTS 参数
const wmtsParams = reactive({
  layer: store.currentConfig.layer || 'default',
  style: store.currentConfig.style || 'default',
  format: store.currentConfig.format || 'tiles',
  tileMatrixSetID: store.currentConfig.tileMatrixSetID || 'default',
  maximumLevel: store.currentConfig.maximumLevel || 18
})

// WMS 参数
const wmsParams = reactive({
  layer: store.currentConfig.layer || 'default',
  format: store.currentConfig.format || 'image/png',
  transparent: store.currentConfig.transparent !== undefined ? store.currentConfig.transparent : true
})

let viewer: Cesium.Viewer | null = null

const initCesium = async () => {
  viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    timeline: false
  })
}

const updateBasemap = () => {
  if (!viewer || !basemapUrl.value) return

  // 根据底图类型更新配置
  const configUpdate: Partial<BasemapConfig> = {
    url: basemapUrl.value,
    type: basemapType.value as 'wmts' | 'wms' | 'xyz',
    name: configName.value
  }

  // 添加特定服务类型的参数
  if (basemapType.value === 'wmts') {
    Object.assign(configUpdate, {
      layer: wmtsParams.layer,
      style: wmtsParams.style,
      format: wmtsParams.format,
      tileMatrixSetID: wmtsParams.tileMatrixSetID,
      maximumLevel: wmtsParams.maximumLevel
    })
  } else if (basemapType.value === 'wms') {
    Object.assign(configUpdate, {
      layer: wmsParams.layer,
      format: wmsParams.format,
      transparent: wmsParams.transparent
    })
  }

  // 更新 store
  store.updateCurrentConfig(configUpdate)

  // 更新地图
  updateCesiumBasemap()
}

const updateCesiumBasemap = () => {
  if (!viewer) return

  viewer.imageryLayers.removeAll()
  
  let imageryProvider: any
  
  switch (basemapType.value) {
    case 'wmts':
      imageryProvider = new Cesium.WebMapTileServiceImageryProvider({
        url: basemapUrl.value,
        layer: wmtsParams.layer,
        style: wmtsParams.style,
        format: wmtsParams.format,
        tileMatrixSetID: wmtsParams.tileMatrixSetID,
        maximumLevel: wmtsParams.maximumLevel
      })
      break
    case 'wms':
      imageryProvider = new Cesium.WebMapServiceImageryProvider({
        url: basemapUrl.value,
        layers: wmsParams.layer,
        parameters: {
          format: wmsParams.format,
          transparent: wmsParams.transparent
        }
      })
      break
    case 'xyz':
      imageryProvider = new Cesium.UrlTemplateImageryProvider({
        url: basemapUrl.value
      })
      break
    default:
      return
  }

  viewer.imageryLayers.addImageryProvider(imageryProvider)
}

// 保存当前配置
const saveConfig = () => {
  store.saveCurrentConfig()
}

// 加载已保存的配置
const loadConfig = (index: number) => {
  store.loadConfig(index)
  
  // 更新本地响应式状态
  const config = store.currentConfig
  basemapUrl.value = config.url
  basemapType.value = config.type
  configName.value = config.name
  
  if (config.type === 'wmts') {
    wmtsParams.layer = config.layer || 'default'
    wmtsParams.style = config.style || 'default'
    wmtsParams.format = config.format || 'tiles'
    wmtsParams.tileMatrixSetID = config.tileMatrixSetID || 'default'
    wmtsParams.maximumLevel = config.maximumLevel || 18
  } else if (config.type === 'wms') {
    wmsParams.layer = config.layer || 'default'
    wmsParams.format = config.format || 'image/png'
    wmsParams.transparent = config.transparent !== undefined ? config.transparent : true
  }
  
  // 更新地图
  updateCesiumBasemap()
}

// 删除配置
const deleteConfig = (index: number) => {
  store.deleteConfig(index)
}

// 监听 store 变化
watch(() => store.currentConfig, (newConfig) => {
  basemapUrl.value = newConfig.url
  basemapType.value = newConfig.type
  configName.value = newConfig.name
  
  if (newConfig.type === 'wmts') {
    wmtsParams.layer = newConfig.layer || 'default'
    wmtsParams.style = newConfig.style || 'default'
    wmtsParams.format = newConfig.format || 'tiles'
    wmtsParams.tileMatrixSetID = newConfig.tileMatrixSetID || 'default'
    wmtsParams.maximumLevel = newConfig.maximumLevel || 18
  } else if (newConfig.type === 'wms') {
    wmsParams.layer = newConfig.layer || 'default'
    wmsParams.format = newConfig.format || 'image/png'
    wmsParams.transparent = newConfig.transparent !== undefined ? newConfig.transparent : true
  }
  
  updateCesiumBasemap()
}, { deep: true })

// 在 script 部分添加导出功能
const exportConfig = () => {
  // 创建导出对象
  const exportData = {
    name: configName.value,
    type: basemapType.value,
    url: basemapUrl.value,
    params: basemapType.value === 'wmts' 
      ? { ...wmtsParams } 
      : basemapType.value === 'wms' 
        ? { ...wmsParams }
        : {}
  }
  
  // 转换为 JSON 并下载
  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  // 创建下载链接
  const link = document.createElement('a')
  link.href = url
  link.download = `${configName.value || 'basemap'}-config.json`
  document.body.appendChild(link)
  link.click()
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

// 添加发送到服务器的功能
const sendToServer = async () => {
  if (!basemapUrl.value) {
    alert('请先配置底图服务')
    return
  }
  
  try {
    // 创建配置对象
    const configData = {
      name: configName.value || `底图配置-${new Date().toISOString().slice(0, 10)}`,
      type: basemapType.value,
      url: basemapUrl.value,
      params: basemapType.value === 'wmts' 
        ? { ...wmtsParams } 
        : basemapType.value === 'wms' 
          ? { ...wmsParams }
          : {}
    }
    
    // 发送到服务器
    const serverUrl = 'http://localhost:3000'
    const response = await fetch(`${serverUrl}/basemap/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      alert('配置已成功发送到服务器！')
    } else {
      throw new Error(result.message || '发送失败')
    }
  } catch (error) {
    console.error('发送配置到服务器失败:', error)
    alert(`发送失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

onMounted(() => {
  initCesium()
  if (basemapUrl.value) {
    updateCesiumBasemap()
  }
})

onUnmounted(() => {
  if (viewer) {
    viewer.destroy()
    viewer = null
  }
})
</script>

<style scoped>
.basemap-config {
  display: flex;
  height: 100vh;
}

.config-form {
  width: 350px;
  padding: 20px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ddd;
}

.form-section:last-child {
  border-bottom: none;
}

h2 {
  margin-bottom: 20px;
  color: #333;
}

h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #555;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 14px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.btn {
  padding: 8px 16px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn:hover {
  background-color: #3367d6;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 3px;
  background-color: #4285f4;
  color: white;
  border: none;
  cursor: pointer;
}

.btn-danger {
  background-color: #ea4335;
}

.btn-danger:hover {
  background-color: #d33426;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.config-actions {
  display: flex;
  gap: 5px;
}

.map-container {
  flex: 1;
  height: 100%;
}
</style> 