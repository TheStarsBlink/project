<template>
  <div class="basemap-config">
    <div class="nav-bar">
      <router-link to="/dashboard" class="nav-btn">服务首页</router-link>
      <router-link to="/scheduled" class="nav-btn">定期截图管理</router-link>
      <router-link to="/streaming" class="nav-btn">截图流测试</router-link>
    </div>
    
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
// 不再导入Cesium，使用全局对象
import { useBasemapStore } from '../stores/basemap'
import type { BasemapConfig } from '../stores/basemap'

// 声明全局Cesium类型以避免TypeScript错误
declare global {
  interface Window {
    Cesium: any;
  }
}

const store = useBasemapStore()

// 初始化默认配置
const defaultConfig: BasemapConfig = {
  url: '',
  type: 'wmts',
  name: '新底图',
  layer: 'default',
  style: 'default',
  format: 'tiles',
  tileMatrixSetID: 'default',
  maximumLevel: 18,
  transparent: true
}

// 确保currentConfig不为null
if (store.currentConfig === null) {
  store.setCurrentConfig(defaultConfig)
}

// 响应式引用基本参数 - 使用可选链和默认值防止null错误
const basemapUrl = ref(store.currentConfig?.url || '')
const basemapType = ref(store.currentConfig?.type || 'wmts')
const configName = ref(store.currentConfig?.name || '新底图')

// WMTS 参数
const wmtsParams = reactive({
  layer: store.currentConfig?.layer || 'default',
  style: store.currentConfig?.style || 'default',
  format: store.currentConfig?.format || 'tiles',
  tileMatrixSetID: store.currentConfig?.tileMatrixSetID || 'default',
  maximumLevel: store.currentConfig?.maximumLevel || 18
})

// WMS 参数
const wmsParams = reactive({
  layer: store.currentConfig?.layer || 'default',
  format: store.currentConfig?.format || 'image/png',
  transparent: store.currentConfig?.transparent !== undefined ? store.currentConfig.transparent : true
})

let viewer: any = null
// 使用全局Cesium
const Cesium = window.Cesium

// 初始化Cesium
const initCesium = () => {
  try {
    console.log('初始化Cesium...');
    
    // 确保元素存在
    const container = document.getElementById('cesiumContainer');
    if (!container) {
      console.error('找不到cesiumContainer元素');
      return null;
    }
    
    // 设置容器样式以确保全屏显示
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.overflow = 'hidden';
    
    // 使用正确的CDN路径
    window.CESIUM_BASE_URL = 'https://cdn.jsdelivr.net/npm/cesium@1.111.0/Build/Cesium/';
    
    // 使用最小配置，并禁用各种可能导致错误的功能
    viewer = new Cesium.Viewer('cesiumContainer', {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      timeline: false,
      selectionIndicator: false,
      infoBox: false,
      // 不使用默认底图提供者
      imageryProvider: false,
      // 禁用地形
      terrainProvider: undefined
    });
    
    // 设置场景相机视角
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000)
    });
    
    // 禁用各种可能导致错误的功能
    if (viewer.scene) {
      viewer.scene.sun = undefined;
      viewer.scene.moon = undefined;
      viewer.scene.skyBox = undefined;
      viewer.scene.skyAtmosphere = undefined;
      viewer.scene.globe.showGroundAtmosphere = false;
    
      // 禁用抗锯齿以提高性能
      viewer.scene.postProcessStages.fxaa.enabled = false;
    
      // 禁用深度测试，避免某些渲染问题
      viewer.scene.globe.depthTestAgainstTerrain = false;
    }
    
    // 添加一个简单的默认底图 - 使用正确的模板格式
    try {
      const osmProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maximumLevel: 19
      });
      viewer.imageryLayers.addImageryProvider(osmProvider);
    } catch (e) {
      console.error('默认底图加载失败:', e);
    }
    
    // 禁用导航说明
    if (viewer.cesiumWidget && viewer.cesiumWidget.screenSpaceEventHandler) {
      viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
    
    console.log('Cesium初始化成功');
    return viewer;
  } catch (error) {
    console.error('Cesium初始化失败:', error);
    return null;
  }
}

const updateBasemap = () => {
  if (!viewer) return
  
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

// 更简化的底图更新函数
const updateCesiumBasemap = () => {
  if (!viewer) return;

  try {
    // 清除现有图层
    viewer.imageryLayers.removeAll();
    
    // 如果URL为空，使用默认底图
    if (!basemapUrl.value) {
      console.log('使用默认底图');
      
      try {
        // 使用OpenStreetMap作为默认底图
        const osmProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19
        });
        viewer.imageryLayers.addImageryProvider(osmProvider);
      } catch (e) {
        console.error('默认底图加载失败:', e);
      }
      
      return;
    }
    
    // 根据类型加载底图
    let imageryProvider;
    
    switch (basemapType.value) {
      case 'wmts':
        try {
          imageryProvider = new Cesium.WebMapTileServiceImageryProvider({
            url: basemapUrl.value,
            layer: wmtsParams.layer,
            style: wmtsParams.style,
            format: wmtsParams.format,
            tileMatrixSetID: wmtsParams.tileMatrixSetID,
            maximumLevel: wmtsParams.maximumLevel
          });
          viewer.imageryLayers.addImageryProvider(imageryProvider);
        } catch (e) {
          console.error('WMTS底图加载失败:', e);
          // 使用OSM作为默认底图
          const osmProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            maximumLevel: 19
          });
          viewer.imageryLayers.addImageryProvider(osmProvider);
        }
        break;
      case 'wms':
        try {
          imageryProvider = new Cesium.WebMapServiceImageryProvider({
            url: basemapUrl.value,
            layers: wmsParams.layer,
            parameters: {
              format: wmsParams.format,
              transparent: wmsParams.transparent
            }
          });
          viewer.imageryLayers.addImageryProvider(imageryProvider);
        } catch (e) {
          console.error('WMS底图加载失败:', e);
          // 使用OSM作为默认底图
          const osmProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            maximumLevel: 19
          });
          viewer.imageryLayers.addImageryProvider(osmProvider);
        }
        break;
      case 'xyz':
        try {
          // 对于XYZ，我们使用UrlTemplateImageryProvider
          imageryProvider = new Cesium.UrlTemplateImageryProvider({
            url: basemapUrl.value
          });
          viewer.imageryLayers.addImageryProvider(imageryProvider);
        } catch (e) {
          console.error('XYZ底图加载失败:', e);
          // 使用OSM作为默认底图
          const osmProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            maximumLevel: 19
          });
          viewer.imageryLayers.addImageryProvider(osmProvider);
        }
        break;
      default:
        // 添加OSM作为默认底图
        const osmProvider = new Cesium.UrlTemplateImageryProvider({
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19
        });
        viewer.imageryLayers.addImageryProvider(osmProvider);
        return;
    }
  } catch (error) {
    console.error('底图加载失败:', error);
    // 加载备用底图
    try {
      // 使用OSM作为备用底图
      const backupProvider = new Cesium.UrlTemplateImageryProvider({
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maximumLevel: 19
      });
      viewer.imageryLayers.addImageryProvider(backupProvider);
    } catch (e) {
      console.error('备用底图加载失败:', e);
    }
  }
}

// 保存当前配置
const saveConfig = () => {
  store.saveCurrentConfig()
}

// 加载已保存的配置
const loadConfig = (index: number) => {
  store.loadConfig(index)
  
  // 更新本地响应式状态
  const config = store.currentConfig || defaultConfig
  basemapUrl.value = config.url || ''
  basemapType.value = config.type || 'wmts'
  configName.value = config.name || '新底图'
  
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
  if (!newConfig) return
  
  basemapUrl.value = newConfig.url || ''
  basemapType.value = newConfig.type || 'wmts'
  configName.value = newConfig.name || '新底图'
  
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
  try {
    // 初始化 store
    store.init()
    
    // 初始化 Cesium
    initCesium()
    
    // 如果URL存在，更新底图
    if (basemapUrl.value) {
      updateCesiumBasemap()
    }
  } catch (error) {
    console.error('组件挂载失败:', error)
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
  width: 100vw;
  position: absolute;
  top: 0;
  left: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.nav-bar {
  position: absolute;
  top: 0;
  left: 0;
  padding: 10px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  z-index: 10;
}

.nav-btn {
  display: block;
  padding: 8px 16px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 10px;
  text-decoration: none;
  text-align: center;
}

.nav-btn:hover {
  background-color: #3367d6;
}

.config-form {
  position: absolute;
  top: 0;
  left: 0;
  width: 350px;
  max-width: 30%;
  height: 100%;
  padding: 20px;
  border-right: 1px solid #ddd;
  overflow-y: auto;
  background-color: white;
  z-index: 5;
  box-sizing: border-box;
}

.map-container {
  position: absolute;
  top: 0;
  left: 350px;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  z-index: 1;
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
  box-sizing: border-box;
}

.button-group {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
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

/* 确保cesium容器占满div */
#cesiumContainer {
  width: 100% !important;
  height: 100% !important;
}

@media (max-width: 768px) {
  .basemap-config {
    flex-direction: column;
  }
  
  .config-form {
    position: relative;
    width: 100%;
    max-width: 100%;
    height: 50%;
    border-right: none;
    border-bottom: 1px solid #ddd;
  }
  
  .map-container {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    height: 50%;
  }
}
</style> 