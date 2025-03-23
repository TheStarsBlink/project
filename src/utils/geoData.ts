import shpjs from 'shpjs';
import toGeoJSON from 'togeojson';
import { DOMParser } from 'xmldom';
import { parse } from 'csv-parse/sync';
import topojson from 'topojson-client';
import fs from 'fs';
import path from 'path';

export interface GeoDataOptions {
  center?: [number, number];
  zoom?: number;
  width?: number;
  height?: number;
  style?: Record<string, any>;
  csvOptions?: {
    longitudeColumn: string;
    latitudeColumn: string;
    delimiter?: string;
  };
}

export class GeoDataProcessor {
  /**
   * 读取并处理 GeoJSON 文件
   */
  static async readGeoJSON(filePath: string): Promise<any> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 读取并处理 SHP 文件
   */
  static async readSHP(filePath: string): Promise<any> {
    const shpData = await shpjs(filePath);
    return shpData;
  }

  /**
   * 读取并处理 KML 文件
   */
  static async readKML(filePath: string): Promise<any> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const parser = new DOMParser();
    const kml = parser.parseFromString(content);
    return toGeoJSON.kml(kml);
  }

  /**
   * 读取并处理 GML 文件
   */
  static async readGML(filePath: string): Promise<any> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const parser = new DOMParser();
    const gml = parser.parseFromString(content);
    return toGeoJSON.gml(gml);
  }

  /**
   * 读取并处理 TopoJSON 文件
   */
  static async readTopoJSON(filePath: string): Promise<any> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const topoData = JSON.parse(content);
    
    // 获取第一个对象
    const objectName = Object.keys(topoData.objects)[0];
    if (!objectName) {
      throw new Error('TopoJSON 文件不包含任何对象');
    }

    // 转换为 GeoJSON
    return topojson.feature(topoData, topoData.objects[objectName]);
  }

  /**
   * 读取并处理 CSV 文件
   */
  static async readCSV(filePath: string, options: GeoDataOptions['csvOptions']): Promise<any> {
    if (!options) {
      throw new Error('CSV 选项不能为空');
    }

    const content = await fs.promises.readFile(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: options.delimiter || ','
    });

    // 转换为 GeoJSON
    return {
      type: 'FeatureCollection',
      features: records.map((record: any) => ({
        type: 'Feature',
        properties: { ...record },
        geometry: {
          type: 'Point',
          coordinates: [
            parseFloat(record[options.longitudeColumn]),
            parseFloat(record[options.latitudeColumn])
          ]
        }
      }))
    };
  }

  /**
   * 生成 Cesium 场景配置
   */
  static generateCesiumConfig(geoData: any, options: GeoDataOptions = {}): string {
    const {
      center = [116.397428, 39.90923], // 默认北京中心
      zoom = 12,
      style = {
        color: '#FF0000',
        weight: 2
      }
    } = options;

    // 计算边界框
    const bounds = this.calculateBounds(geoData);
    const [minLng, minLat, maxLng, maxLat] = bounds;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>GeoData Viewer</title>
          <script src="./cesium/Cesium/Cesium.js"></script>
          <link href="./cesium/Cesium/Widgets/widgets.css" rel="stylesheet">
          <style>
            #cesiumContainer {
              width: 100%;
              height: 100vh;
            }
          </style>
        </head>
        <body>
          <div id="cesiumContainer"></div>
          <script>
            // 初始化 Cesium Viewer
            const viewer = new Cesium.Viewer('cesiumContainer', {
              terrainProvider: Cesium.createWorldTerrain()
            });

            // 设置相机位置
            viewer.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(${center[0]}, ${center[1]}, 1000000),
              orientation: {
                heading: 0.0,
                pitch: -Cesium.Math.PI_OVER_TWO,
                roll: 0.0
              }
            });

            // 添加 GeoJSON 数据
            const dataSource = new Cesium.GeoJsonDataSource();
            const geoJson = ${JSON.stringify(geoData)};
            
            dataSource.load(geoJson, {
              stroke: Cesium.Color.fromCssColorString('${style.color}'),
              strokeWidth: ${style.weight},
              fill: Cesium.Color.fromCssColorString('${style.color}').withAlpha(0.3)
            });

            viewer.dataSources.add(dataSource);

            // 缩放到数据范围
            viewer.zoomTo(dataSource, {
              offset: new Cesium.HeadingPitchRange(0.0, -Cesium.Math.PI_OVER_TWO, 0.0)
            });
          </script>
        </body>
      </html>
    `;
  }

  /**
   * 计算地理数据的边界框
   */
  private static calculateBounds(geoData: any): [number, number, number, number] {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    const processCoordinates = (coordinates: number[] | number[][] | number[][][]): void => {
      if (Array.isArray(coordinates[0])) {
        (coordinates as number[][]).forEach(coord => processCoordinates(coord));
      } else {
        const [lng, lat] = coordinates as number[];
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      }
    };

    if (geoData.type === 'FeatureCollection') {
      geoData.features.forEach((feature: any) => {
        processCoordinates(feature.geometry.coordinates);
      });
    } else if (geoData.type === 'Feature') {
      processCoordinates(geoData.geometry.coordinates);
    }

    return [minLng, minLat, maxLng, maxLat];
  }
} 