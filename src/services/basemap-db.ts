import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { BasemapConfig } from '../types';

interface DbRow {
  id: number;
  name: string;
  type: string;
  config: string;
  createTime: string;
  updateTime: string;
}

/**
 * 底图配置数据库服务
 * 用于存储和管理用户配置的底图信息
 */
export class BasemapDatabase {
  private db: Database | null = null;
  private initialized: boolean = false;
  private dbPath: string;

  constructor(dataPath: string = './data') {
    // 确保数据目录存在
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    this.dbPath = path.join(dataPath, 'basemaps.db');
  }

  /**
   * 初始化数据库连接和表结构
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // 创建底图配置表
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS basemaps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL,
          config TEXT NOT NULL,
          createTime DATETIME NOT NULL,
          updateTime DATETIME NOT NULL
        )
      `);

      console.log(`底图数据库初始化成功: ${this.dbPath}`);
      this.initialized = true;
    } catch (error) {
      console.error('底图数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 保存底图配置
   * @param config 底图配置对象
   * @returns 保存结果
   */
  async saveConfig(config: BasemapConfig): Promise<{ success: boolean; id: number }> {
    if (!this.initialized) await this.init();
    if (!this.db) throw new Error('数据库未初始化');
    
    try {
      const result = await this.db.run(`
        INSERT OR REPLACE INTO basemaps (name, type, config, createTime, updateTime)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `, [config.name, config.type, JSON.stringify(config)]);
      
      return { success: true, id: result.lastID || 0 };
    } catch (error) {
      console.error('保存底图配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定名称的底图配置
   * @param name 底图配置名称
   * @returns 底图配置对象
   */
  async getConfig(name: string): Promise<BasemapConfig | null> {
    if (!this.initialized) await this.init();
    if (!this.db) throw new Error('数据库未初始化');
    
    try {
      const row = await this.db.get<DbRow>('SELECT * FROM basemaps WHERE name = ?', [name]);
      if (!row) return null;
      
      const config = JSON.parse(row.config) as BasemapConfig;
      return config;
    } catch (error) {
      console.error('获取底图配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有底图配置
   * @returns 底图配置列表
   */
  async getAllConfigs(): Promise<BasemapConfig[]> {
    if (!this.initialized) await this.init();
    if (!this.db) throw new Error('数据库未初始化');
    
    try {
      const rows = await this.db.all<DbRow[]>('SELECT * FROM basemaps ORDER BY updateTime DESC');
      return rows.map(row => JSON.parse(row.config) as BasemapConfig);
    } catch (error) {
      console.error('获取所有底图配置失败:', error);
      throw error;
    }
  }

  /**
   * 删除指定名称的底图配置
   * @param name 底图配置名称
   * @returns 删除结果
   */
  async deleteConfig(name: string): Promise<boolean> {
    if (!this.initialized) await this.init();
    if (!this.db) throw new Error('数据库未初始化');
    
    try {
      const result = await this.db.run('DELETE FROM basemaps WHERE name = ?', [name]);
      return (result.changes || 0) > 0;
    } catch (error) {
      console.error('删除底图配置失败:', error);
      throw error;
    }
  }

  /**
   * 根据类型获取底图配置
   * @param type 底图类型
   * @returns 指定类型的底图配置列表
   */
  async getConfigsByType(type: string): Promise<BasemapConfig[]> {
    if (!this.initialized) await this.init();
    if (!this.db) throw new Error('数据库未初始化');
    
    try {
      const rows = await this.db.all<DbRow[]>('SELECT * FROM basemaps WHERE type = ? ORDER BY updateTime DESC', [type]);
      return rows.map(row => JSON.parse(row.config) as BasemapConfig);
    } catch (error) {
      console.error('根据类型获取底图配置失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
} 