import { defineStore } from 'pinia'

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

export const useBasemapStore = defineStore('basemap', {
  state: (): BasemapState => {
    // 从 localStorage 获取配置
    const savedCurrentConfig = localStorage.getItem('basemap-current-config')
    const savedConfigs = localStorage.getItem('basemap-saved-configs')
    
    return {
      currentConfig: savedCurrentConfig ? JSON.parse(savedCurrentConfig) : {...defaultConfig},
      savedConfigs: savedConfigs ? JSON.parse(savedConfigs) : []
    }
  },
  
  actions: {
    // 更新当前配置
    updateCurrentConfig(config: Partial<BasemapConfig>) {
      this.currentConfig = { ...this.currentConfig, ...config }
      this.saveToLocalStorage()
    },
    
    // 保存当前配置到配置列表
    saveCurrentConfig(name?: string) {
      if (name) {
        this.currentConfig.name = name
      }
      
      // 检查是否已存在同名配置，如果存在则更新
      const existingIndex = this.savedConfigs.findIndex(
        config => config.name === this.currentConfig.name
      )
      
      if (existingIndex >= 0) {
        this.savedConfigs[existingIndex] = { ...this.currentConfig }
      } else {
        this.savedConfigs.push({ ...this.currentConfig })
      }
      
      this.saveToLocalStorage()
    },
    
    // 加载已保存的配置
    loadConfig(index: number) {
      if (index >= 0 && index < this.savedConfigs.length) {
        this.currentConfig = { ...this.savedConfigs[index] }
        this.saveToLocalStorage()
      }
    },
    
    // 删除保存的配置
    deleteConfig(index: number) {
      if (index >= 0 && index < this.savedConfigs.length) {
        this.savedConfigs.splice(index, 1)
        this.saveToLocalStorage()
      }
    },
    
    // 保存到 localStorage
    saveToLocalStorage() {
      localStorage.setItem('basemap-current-config', JSON.stringify(this.currentConfig))
      localStorage.setItem('basemap-saved-configs', JSON.stringify(this.savedConfigs))
    }
  },
  
  getters: {
    // 获取 URL 和类型的快捷访问
    url: state => state.currentConfig.url,
    type: state => state.currentConfig.type
  }
}) 