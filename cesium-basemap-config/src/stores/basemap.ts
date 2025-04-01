import { defineStore } from 'pinia'
import { ref } from 'vue'

// 定义底图配置类型
export interface BasemapConfig {
  url: string
  type: 'wmts' | 'wms' | 'xyz'
  name: string
  layer?: string
  style?: string
  format?: string
  tileMatrixSetID?: string
  maximumLevel?: number
  transparent?: boolean
}

// 初始配置
const defaultConfig: BasemapConfig = {
  url: '',
  type: 'wmts',
  name: '默认底图',
  layer: 'default',
  style: 'default',
  format: 'image/png',
  tileMatrixSetID: 'default',
  maximumLevel: 18,
  transparent: true
}

export const useBasemapStore = defineStore('basemap', () => {
  // 状态
  const currentConfig = ref<BasemapConfig | null>(null)
  const savedConfigs = ref<BasemapConfig[]>([])
  
  // 方法
  // 设置当前底图配置
  function setCurrentConfig(config: BasemapConfig | null) {
    currentConfig.value = config
  }
  
  // 更新当前配置（部分更新）
  function updateCurrentConfig(configUpdate: Partial<BasemapConfig>) {
    if (currentConfig.value === null) {
      // 如果当前配置为空，则创建一个新的
      currentConfig.value = {
        ...defaultConfig,
        ...configUpdate
      }
    } else {
      // 更新现有配置
      currentConfig.value = { ...currentConfig.value, ...configUpdate }
    }
  }
  
  // 保存当前配置到本地存储
  function saveCurrentConfig() {
    if (!currentConfig.value) return false
    
    // 检查是否已经存在同名配置
    const existingIndex = savedConfigs.value.findIndex(
      config => config.name === currentConfig.value?.name
    )
    
    if (existingIndex >= 0) {
      // 更新现有配置
      savedConfigs.value[existingIndex] = { ...currentConfig.value }
    } else {
      // 添加新配置
      savedConfigs.value.push({ ...currentConfig.value })
    }
    
    // 保存到localStorage
    localStorage.setItem('basemapConfigs', JSON.stringify(savedConfigs.value))
    return true
  }
  
  // 从本地存储加载配置
  function loadSavedConfigs() {
    const saved = localStorage.getItem('basemapConfigs')
    if (saved) {
      try {
        savedConfigs.value = JSON.parse(saved)
      } catch (e) {
        console.error('解析保存的配置失败:', e)
        savedConfigs.value = []
      }
    }
  }
  
  // 加载指定索引的配置
  function loadConfig(index: number) {
    if (index >= 0 && index < savedConfigs.value.length) {
      setCurrentConfig({ ...savedConfigs.value[index] })
      return true
    }
    return false
  }
  
  // 删除配置
  function deleteConfig(index: number) {
    if (index >= 0 && index < savedConfigs.value.length) {
      savedConfigs.value.splice(index, 1)
      localStorage.setItem('basemapConfigs', JSON.stringify(savedConfigs.value))
      return true
    }
    return false
  }
  
  // 初始化
  function init() {
    loadSavedConfigs()
    if (currentConfig.value === null) {
      setCurrentConfig({ ...defaultConfig })
    }
  }
  
  return {
    currentConfig,
    savedConfigs,
    setCurrentConfig,
    updateCurrentConfig,
    saveCurrentConfig,
    loadSavedConfigs,
    loadConfig,
    deleteConfig,
    init
  }
}) 