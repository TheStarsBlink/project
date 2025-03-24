// 截图请求参数接口
export interface ScreenshotRequest {
  url: string;
  width?: number;
  height?: number;
  waitFor?: number;
  selector?: string;
  timeout?: number;
  options?: ScreenshotOptions;
}

// 截图选项接口
export interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  omitBackground?: boolean;
  encoding?: 'binary' | 'base64';
}

// 状态响应接口
export interface StatusResponse {
  queueLength: number;
  processing: number;
  maxConcurrentJobs: number;
  browserActive: boolean;
  lastActivity: string;
}

// 工作队列任务接口
export interface QueueTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

// 浏览器配置接口
export interface BrowserConfig {
  headless?: boolean | 'new';
  args?: string[];
  executablePath?: string;
}

// 页面配置接口
export interface PageConfig {
  width: number;
  height: number;
  timeout: number;
  navigationTimeout: number;
}

// 添加底图配置接口
export interface BasemapConfig {
  // 基本信息
  name: string;
  type: 'wmts' | 'wms' | 'xyz';
  url: string;
  
  // 服务参数
  params: {
    // WMTS 参数
    layer?: string;
    style?: string;
    format?: string;
    tileMatrixSetID?: string;
    maximumLevel?: number;
    
    // WMS 参数
    transparent?: boolean;
  };
} 