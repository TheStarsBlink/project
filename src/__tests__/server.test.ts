/* eslint-disable import/no-extraneous-dependencies */
import supertest from 'supertest';
import express from 'express';
import { ScreenshotRequest } from '../types';
import '../server';  // 直接导入服务器文件
import fs from 'fs';
import path from 'path';

// 创建一个简单的 Express 服务器用于测试
const app = express();
app.use(express.static('public'));
app.use(express.json());

describe('Server Tests', () => {
  let testServer: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    testServer = supertest(app);
  });

  describe('Static File Serving', () => {
    test('应该能够提供静态文件服务', async () => {
      const response = await testServer.get('/');
      expect(response.status).toBe(200);
    });

    test('应该能够访问 Cesium JavaScript 文件', async () => {
      const response = await testServer.get('/cesium/Cesium/Cesium.js');
      expect(response.status).toBe(200);
    });

    test('应该能够访问 index.html', async () => {
      const response = await testServer.get('/index.html');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Cesium');
    });
  });

  describe('Cesium Screenshot API', () => {
    test('Cesium 截图接口应该返回图片', async () => {
      const response = await testServer.get('/screenshot');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    test('Cesium 截图接口应该支持自定义参数', async () => {
      const response = await testServer.get('/screenshot?width=800&height=600');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });
  });

  describe('URL Screenshot API', () => {
    test('URL 截图接口应该返回图片', async () => {
      const request: ScreenshotRequest = {
        url: 'https://example.com',
        width: 1920,
        height: 1080,
        waitFor: 1000
      };
      const response = await testServer
        .post('/screenshot/url')
        .send(request);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    test('URL 截图接口应该验证必需参数', async () => {
      const response = await testServer
        .post('/screenshot/url')
        .send({});
      expect(response.status).toBe(400);
      expect(response.text).toBe('URL 是必需的参数');
    });

    test('URL 截图接口应该支持自定义选项', async () => {
      const request: ScreenshotRequest = {
        url: 'https://example.com',
        options: {
          fullPage: false,
          clip: {
            x: 0,
            y: 0,
            width: 800,
            height: 600
          }
        }
      };
      const response = await testServer
        .post('/screenshot/url')
        .send(request);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    test('URL 截图接口应该处理超时情况', async () => {
      const request: ScreenshotRequest = {
        url: 'https://example.com',
        timeout: 1000 // 设置很短的超时时间
      };
      const response = await testServer
        .post('/screenshot/url')
        .send(request);
      expect(response.status).toBe(500);
      expect(response.text).toContain('截图失败');
    });
  });

  describe('Status API', () => {
    test('状态接口应该返回队列信息', async () => {
      const response = await testServer.get('/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('queueLength');
      expect(response.body).toHaveProperty('processingJobs');
      expect(response.body).toHaveProperty('maxConcurrentJobs');
      expect(response.body).toHaveProperty('browserActive');
      expect(response.body).toHaveProperty('lastActivity');
    });
  });

  describe('GeoData Screenshot API', () => {
    const sampleGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [116.397428, 39.90923]
          }
        }
      ]
    };

    const sampleGML = `<?xml version="1.0" encoding="UTF-8"?>
<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml">
  <gml:featureMember>
    <gml:Point>
      <gml:coordinates>116.397428,39.90923</gml:coordinates>
    </gml:Point>
  </gml:featureMember>
</gml:FeatureCollection>`;

    const sampleTopoJSON = {
      type: 'Topology',
      objects: {
        collection: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Point',
              coordinates: [0],
              properties: {}
            }
          ]
        }
      },
      arcs: [],
      transform: {
        scale: [0.036003600360036005, 0.017361589674592462],
        translate: [73.66, 3.86]
      }
    };

    const sampleCSV = `longitude,latitude,name
116.397428,39.90923,北京
121.473701,31.230416,上海`;

    beforeEach(() => {
      // 创建测试文件
      fs.writeFileSync('test.geojson', JSON.stringify(sampleGeoJSON));
      fs.writeFileSync('test.gml', sampleGML);
      fs.writeFileSync('test.topojson', JSON.stringify(sampleTopoJSON));
      fs.writeFileSync('test.csv', sampleCSV);
    });

    afterEach(() => {
      // 清理测试文件
      fs.unlinkSync('test.geojson');
      fs.unlinkSync('test.gml');
      fs.unlinkSync('test.topojson');
      fs.unlinkSync('test.csv');
    });

    test('应该支持 GeoJSON 文件', async () => {
      const response = await testServer
        .post('/screenshot/geo')
        .send({
          filePath: 'test.geojson'
        });
      expect(response.status).toBe(200);
      expect(response.type).toBe('image/png');
    });

    test('应该支持 GML 文件', async () => {
      const response = await testServer
        .post('/screenshot/geo')
        .send({
          filePath: 'test.gml'
        });
      expect(response.status).toBe(200);
      expect(response.type).toBe('image/png');
    });

    test('应该支持 TopoJSON 文件', async () => {
      const response = await testServer
        .post('/screenshot/geo')
        .send({
          filePath: 'test.topojson'
        });
      expect(response.status).toBe(200);
      expect(response.type).toBe('image/png');
    });

    test('应该支持 CSV 文件', async () => {
      const response = await testServer
        .post('/screenshot/geo')
        .send({
          filePath: 'test.csv',
          options: {
            csvOptions: {
              longitudeColumn: 'longitude',
              latitudeColumn: 'latitude',
              delimiter: ','
            }
          }
        });
      expect(response.status).toBe(200);
      expect(response.type).toBe('image/png');
    });

    test('CSV 文件缺少经纬度列名时应该返回错误', async () => {
      const response = await testServer
        .post('/screenshot/geo')
        .send({
          filePath: 'test.csv'
        });
      expect(response.status).toBe(400);
      expect(response.text).toBe('CSV 文件需要指定经度和纬度列名');
    });

    test('不支持的文件格式应该返回错误', async () => {
      const response = await testServer
        .post('/screenshot/geo')
        .send({
          filePath: 'test.txt'
        });
      expect(response.status).toBe(400);
      expect(response.text).toBe('不支持的文件格式');
    });

    test('文件不存在时应该返回错误', async () => {
      const response = await testServer
        .post('/screenshot/geo')
        .send({
          filePath: 'nonexistent.geojson'
        });
      expect(response.status).toBe(404);
      expect(response.text).toBe('文件不存在');
    });
  });
}); 