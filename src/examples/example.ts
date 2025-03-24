/**
 * 截图服务使用示例
 * 
 * 本文件提供了服务接口的使用示例，可以通过命令行参数选择要运行的示例：
 * ts-node example.ts url       # 运行URL截图示例
 * ts-node example.ts cesium    # 运行Cesium截图示例
 * ts-node example.ts geo       # 运行地理数据截图示例
 * ts-node example.ts config    # 运行底图配置示例
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

// 服务器URL
const SERVER_URL = 'http://localhost:3000';

/**
 * URL截图示例
 */
async function urlScreenshotExample() {
  console.log('运行URL截图示例...');
  
  const response = await fetch(`${SERVER_URL}/screenshot/url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://www.baidu.com',
      width: 1280,
      height: 720,
      waitFor: 500,
      options: {
        fullPage: true
      }
    })
  });
  
  if (response.ok) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const outputPath = path.resolve(__dirname, 'baidu_screenshot.png');
    await fs.writeFile(outputPath, buffer);
    console.log(`截图已保存到: ${outputPath}`);
  } else {
    console.error(`截图失败: ${response.statusText}`);
  }
}

/**
 * Cesium截图示例
 */
async function cesiumScreenshotExample() {
  console.log('运行Cesium截图示例...');
  
  // 先创建底图配置
  await fetch(`${SERVER_URL}/basemap/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'tianditu-vec',
      type: 'wmts',
      url: 'http://t0.tianditu.gov.cn/vec_w/wmts?tk=你的天地图密钥',
      params: {
        layer: 'vec',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18
      }
    })
  });
  
  // 使用底图配置进行截图
  const response = await fetch(`${SERVER_URL}/screenshot?basemapName=tianditu-vec`);
  
  if (response.ok) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const outputPath = path.resolve(__dirname, 'cesium_screenshot.png');
    await fs.writeFile(outputPath, buffer);
    console.log(`截图已保存到: ${outputPath}`);
  } else {
    console.error(`截图失败: ${response.statusText}`);
  }
}

/**
 * 地理数据截图示例
 */
async function geoDataScreenshotExample() {
  console.log('运行地理数据截图示例...');
  
  // 创建一个简单的GeoJSON文件用于测试
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [116.3912, 39.9067]  // 北京
        }
      },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [121.4737, 31.2304]  // 上海
        }
      }
    ]
  };
  
  const geojsonPath = path.resolve(__dirname, 'test.geojson');
  await fs.writeFile(geojsonPath, JSON.stringify(geojson, null, 2));
  
  // 发送请求
  const response = await fetch(`${SERVER_URL}/screenshot/geo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filePath: geojsonPath,
      options: {
        width: 1280,
        height: 720
      }
    })
  });
  
  if (response.ok) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const outputPath = path.resolve(__dirname, 'geo_screenshot.png');
    await fs.writeFile(outputPath, buffer);
    console.log(`截图已保存到: ${outputPath}`);
    
    // 清理临时文件
    await fs.unlink(geojsonPath);
  } else {
    console.error(`截图失败: ${response.statusText}`);
  }
}

/**
 * 底图配置示例
 */
async function basemapConfigExample() {
  console.log('运行底图配置示例...');
  
  // 创建底图配置
  const createResponse = await fetch(`${SERVER_URL}/basemap/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'osm',
      type: 'xyz',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      params: {}
    })
  });
  
  if (createResponse.ok) {
    console.log('底图配置已创建');
    
    // 列出所有底图配置
    const listResponse = await fetch(`${SERVER_URL}/basemap/config`);
    if (listResponse.ok) {
      const configs = await listResponse.json();
      console.log('当前底图配置:');
      console.log(configs);
      
      // 删除底图配置
      const deleteResponse = await fetch(`${SERVER_URL}/basemap/config/osm`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log('底图配置已删除');
      } else {
        console.error(`删除配置失败: ${deleteResponse.statusText}`);
      }
    } else {
      console.error(`获取配置列表失败: ${listResponse.statusText}`);
    }
  } else {
    console.error(`创建配置失败: ${createResponse.statusText}`);
  }
}

/**
 * 主函数
 */
async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  const example = args[0] || 'url';
  
  try {
    // 运行选择的示例
    switch (example) {
      case 'url':
        await urlScreenshotExample();
        break;
      case 'cesium':
        await cesiumScreenshotExample();
        break;
      case 'geo':
        await geoDataScreenshotExample();
        break;
      case 'config':
        await basemapConfigExample();
        break;
      default:
        console.error(`未知的示例: ${example}`);
        console.log('可用示例: url, cesium, geo, config');
    }
  } catch (error) {
    console.error('运行示例时发生错误:', error);
  }
}

// 运行主函数
main().catch(console.error); 