/* eslint-disable import/no-extraneous-dependencies */
import supertest from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ScreenshotRequest } from '../types';
import '../server';  // 直接导入服务器文件

// 创建一个简单的 Express 服务器用于测试
const app = express();
app.use(express.static('public'));
app.use(express.json());

// 导入应用之前，设置一些模拟
jest.mock('puppeteer', () => {
  return {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        setViewport: jest.fn().mockResolvedValue(null),
        setDefaultNavigationTimeout: jest.fn(),
        setDefaultTimeout: jest.fn(),
        setUserAgent: jest.fn().mockResolvedValue(null),
        goto: jest.fn().mockResolvedValue(null),
        waitForSelector: jest.fn().mockResolvedValue(null),
        waitForFunction: jest.fn().mockResolvedValue(null),
        $: jest.fn().mockResolvedValue({
          screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image-data'))
        }),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
        close: jest.fn().mockResolvedValue(null),
      }),
      close: jest.fn().mockResolvedValue(null),
    })
  };
});

describe('服务器及截图功能测试', () => {
  let testServer: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    testServer = supertest(app);
  });

  describe('静态文件服务', () => {
    test('静态文件目录应该正确配置', () => {
      // 验证Express app中的static中间件设置
      const middleware = app._router.stack.find((layer: any) => 
        layer.name === 'serveStatic' && layer.regexp.toString().includes('public'));
      expect(middleware).toBeDefined();
    });
  });

  describe('浏览器环境检测', () => {
    test('应该能够检测到系统类型', () => {
      const platform = os.platform();
      expect(['win32', 'linux', 'darwin']).toContain(platform);
    });

    test('getChromePath应该返回Chrome路径或undefined', () => {
      // 导入getChromePath函数
      const { getChromePath } = require('../server');
      const chromePath = getChromePath();
      
      // 路径可能存在也可能不存在，但类型应该是string或undefined
      expect(typeof chromePath === 'string' || typeof chromePath === 'undefined').toBe(true);
    });
  });

  describe('Cesium截图接口', () => {
    test('应该能够调用puppeteer进行截图', async () => {
      // 验证puppeteer.launch被调用
      expect(puppeteer.launch).toHaveBeenCalled();
      
      // 发送截图请求并检查响应
      const response = await testServer.get('/screenshot');
      
      // 即使是模拟环境，也应返回200状态码和PNG图片内容类型
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });
  });

  describe('URL截图接口', () => {
    test('应该能够处理URL截图请求', async () => {
      const response = await testServer
        .post('/screenshot/url')
        .send({
          url: 'http://example.com',
          width: 800,
          height: 600
        });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    test('URL参数缺失时应该返回400错误', async () => {
      const response = await testServer
        .post('/screenshot/url')
        .send({
          width: 800,
          height: 600
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('服务器状态接口', () => {
    test('状态接口应该返回正确的队列信息', async () => {
      const response = await testServer.get('/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('queueLength');
      expect(response.body).toHaveProperty('processing');
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