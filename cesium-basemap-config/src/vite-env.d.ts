/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Cesium 声明
declare module 'cesium'

// 全局变量声明
interface Window {
  CESIUM_BASE_URL: string;
  Cesium: any;
}

// Cesium相关全局变量
declare const CESIUM_BASE_URL: string;
