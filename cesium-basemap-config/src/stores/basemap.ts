import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BasemapConfig } from '../../../src/types'

// 定义底图配置类型
export interface BasemapConfig {
  url: string
  type: 'wmts' | 'wms' | 'xyz'
  // 添加更多服务参数
  layer?: string
  style?: string
  format?: string
  tileMatrixSetID?: string
  maximumLevel?: number
  transparent?: boolean
  // 添加服务标识
  name: string
}

interface BasemapState {
  currentConfig: BasemapConfig
  savedConfigs: BasemapConfig[]
}

// 初始配置
const defaultConfig: BasemapConfig = {
  url: '',
  type: 'wmts',
  layer: 'default',
  style: 'default',
  format: 'tiles',
  tileMatrixSetID: 'default',
  maximumLevel: 18,
  transparent: true,
  name: '新底图'
}

export const useBasemapStore = defineStore('basemap', () => {
  // 状态
  const currentConfig = ref<BasemapConfig | null>(null)
  const savedConfigs = ref<BasemapConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // API基础URL
  const apiBaseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'
  
  // 计算属性
  const configsByType = computed(() => {
    const result: Record<string, BasemapConfig[]> = {
      wmts: [],
      wms: [],
      xyz: []
    }
    
    savedConfigs.value.forEach(config => {
      if (config.type in result) {
        result[config.type].push(config)
      }
    })
    
    return result
  })
  
  // 方法
  // 获取所有底图配置
  async function fetchAllConfigs() {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${apiBaseUrl}/basemap`)
      if (!response.ok) throw new Error(`获取底图配置失败：HTTP ${response.status}`)
      
      savedConfigs.value = await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('获取底图配置失败:', err)
    } finally {
      loading.value = false
    }
  }
  
  // 获取指定名称的底图配置
  async function fetchConfig(name: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${apiBaseUrl}/basemap/${encodeURIComponent(name)}`)
      if (!response.ok) {
        if (response.status === 404) {
          error.value = '未找到指定的底图配置'
          currentConfig.value = null
          return null
        }
        throw new Error(`获取底图配置失败：HTTP ${response.status}`)
      }
      
      const config = await response.json()
      currentConfig.value = config
      return config
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('获取底图配置失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 保存底图配置
  async function saveConfig(config: BasemapConfig) {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${apiBaseUrl}/basemap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      
      if (!response.ok) throw new Error(`保存底图配置失败：HTTP ${response.status}`)
      
      // 保存成功后刷新列表
      await fetchAllConfigs()
      currentConfig.value = config
      return await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('保存底图配置失败:', err)
      return null
    } finally {
      loading.value = false
    }
  }
  
  // 删除底图配置
  async function deleteConfig(name: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`${apiBaseUrl}/basemap/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          error.value = '未找到指定的底图配置'
          return false
        }
        throw new Error(`删除底图配置失败：HTTP ${response.status}`)
      }
      
      // 删除成功后刷新列表
      await fetchAllConfigs()
      if (currentConfig.value?.name === name) {
        currentConfig.value = null
      }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('删除底图配置失败:', err)
      return false
    } finally {
      loading.value = false
    }
  }
  
  // 设置当前底图配置（不保存到服务器）
  function setCurrentConfig(config: BasemapConfig | null) {
    currentConfig.value = config
  }
  
  // 创建新的配置
  function createNewConfig(): BasemapConfig {
    return {
      name: '',
      type: 'wmts',
      url: '',
      params: {}
    }
  }
  
  // 初始化
  function init() {
    fetchAllConfigs()
  }
  
  return {
    // 状态
    currentConfig,
    savedConfigs,
    loading,
    error,
    configsByType,
    
    // 方法
    fetchAllConfigs,
    fetchConfig,
    saveConfig,
    deleteConfig,
    setCurrentConfig,
    createNewConfig,
    init
  }
}) 