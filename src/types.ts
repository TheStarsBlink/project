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
  processingJobs: number;
  maxConcurrentJobs: number;
  browserActive: boolean;
  lastActivity: number;
}

// 工作队列任务接口
export interface QueueTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

// 浏览器配置接口
export interface BrowserConfig {
  headless: 'new' | boolean;
  args: string[];
  executablePath?: string;
}

// 页面配置接口
export interface PageConfig {
  width: number;
  height: number;
  timeout: number;
  navigationTimeout: number;
} 