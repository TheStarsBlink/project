// 简化版地理数据处理工具
import fs from 'fs';
import path from 'path';

export interface GeoDataOptions {
  targetSRS?: string;
  outputFormat?: 'geojson' | 'topojson';
}

/**
 * 简化版地理数据处理器
 * 不依赖于外部库，只处理基本的GeoJSON文件
 */
export class GeoDataProcessor {
  
  /**
   * 处理地理数据
   * @param filePath 数据文件路径
   * @param options 处理选项
   * @returns 处理后的GeoJSON数据
   */
  async processFile(filePath: string, options?: GeoDataOptions): Promise<any> {
    console.log(`使用简化版处理器处理文件: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    const ext = path.extname(filePath).toLowerCase();
    
    // 只处理GeoJSON文件
    if (ext === '.json' || ext === '.geojson') {
      const content = fs.readFileSync(filePath, 'utf8');
      try {
        return JSON.parse(content);
      } catch (err) {
        throw new Error(`解析GeoJSON文件失败: ${err}`);
      }
    } else {
      throw new Error(`不支持的文件格式: ${ext}，简化版处理器只支持GeoJSON文件`);
    }
  }
  
  /**
   * 将GeoJSON保存为文件
   * @param data GeoJSON数据
   * @param outputPath 输出路径
   */
  saveToFile(data: any, outputPath: string): void {
    const dirPath = path.dirname(outputPath);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`数据已保存到: ${outputPath}`);
  }
} 