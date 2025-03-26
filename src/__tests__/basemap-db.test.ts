/* eslint-disable import/no-extraneous-dependencies */
import { BasemapDatabase } from '../services/basemap-db';
import { BasemapConfig } from '../types';
import fs from 'fs';
import path from 'path';

describe('底图数据库服务测试', () => {
  let db: BasemapDatabase;
  const testDir = path.join(__dirname, 'test-data');
  
  // 测试数据
  const testConfig: BasemapConfig = {
    name: 'test-map',
    type: 'wmts',
    url: 'https://example.com/wmts',
    params: {
      layer: 'test-layer',
      style: 'default',
      format: 'image/png',
      tileMatrixSetID: 'GoogleMapsCompatible',
      maximumLevel: 18
    }
  };
  
  beforeAll(() => {
    // 创建测试目录
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });
  
  beforeEach(async () => {
    // 每个测试前创建新的数据库实例
    db = new BasemapDatabase(testDir);
    await db.init();
  });
  
  afterEach(async () => {
    // 每个测试后关闭数据库连接
    await db.close();
  });
  
  afterAll(() => {
    // 测试完成后清理测试数据
    const dbPath = path.join(testDir, 'basemaps.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });
  
  test('应该能够保存底图配置', async () => {
    const result = await db.saveConfig(testConfig);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
  
  test('应该能够获取指定名称的底图配置', async () => {
    await db.saveConfig(testConfig);
    const config = await db.getConfig('test-map');
    expect(config).toBeDefined();
    expect(config?.name).toBe('test-map');
    expect(config?.type).toBe('wmts');
    expect(config?.url).toBe('https://example.com/wmts');
  });
  
  test('获取不存在的配置应该返回null', async () => {
    const config = await db.getConfig('non-existent');
    expect(config).toBeNull();
  });
  
  test('应该能够获取所有底图配置', async () => {
    // 保存多个配置
    await db.saveConfig(testConfig);
    await db.saveConfig({
      ...testConfig,
      name: 'test-map-2',
      type: 'wms'
    });
    
    const configs = await db.getAllConfigs();
    expect(configs).toBeInstanceOf(Array);
    expect(configs.length).toBe(2);
  });
  
  test('应该能够按类型获取底图配置', async () => {
    // 保存多个不同类型的配置
    await db.saveConfig(testConfig);
    await db.saveConfig({
      ...testConfig,
      name: 'test-map-2',
      type: 'wms'
    });
    await db.saveConfig({
      ...testConfig,
      name: 'test-map-3',
      type: 'wmts'
    });
    
    const wmtsConfigs = await db.getConfigsByType('wmts');
    expect(wmtsConfigs).toBeInstanceOf(Array);
    expect(wmtsConfigs.length).toBe(2);
    
    const wmsConfigs = await db.getConfigsByType('wms');
    expect(wmsConfigs).toBeInstanceOf(Array);
    expect(wmsConfigs.length).toBe(1);
  });
  
  test('应该能够删除底图配置', async () => {
    await db.saveConfig(testConfig);
    
    // 验证配置存在
    let config = await db.getConfig('test-map');
    expect(config).toBeDefined();
    
    // 删除配置
    const deleteResult = await db.deleteConfig('test-map');
    expect(deleteResult).toBe(true);
    
    // 验证配置已删除
    config = await db.getConfig('test-map');
    expect(config).toBeNull();
  });
  
  test('删除不存在的配置应该返回false', async () => {
    const deleteResult = await db.deleteConfig('non-existent');
    expect(deleteResult).toBe(false);
  });
}); 