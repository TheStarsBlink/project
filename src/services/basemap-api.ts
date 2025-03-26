import { Request, Response, Router } from 'express';
import { BasemapDatabase } from './basemap-db';
import { BasemapConfig } from '../types';

/**
 * 初始化底图配置API路由
 * @param router Express路由器
 * @param basemapDb 底图数据库服务
 */
export function setupBasemapRoutes(router: Router, basemapDb: BasemapDatabase): void {
  // 获取所有底图配置
  router.get('/basemap', async (_req: Request, res: Response) => {
    try {
      const configs = await basemapDb.getAllConfigs();
      res.json(configs);
    } catch (error) {
      console.error('获取所有底图配置失败:', error);
      res.status(500).send('获取所有底图配置失败');
    }
  });

  // 获取指定名称的底图配置
  router.get('/basemap/:name', async (req: Request, res: Response) => {
    try {
      const config = await basemapDb.getConfig(req.params.name);
      if (!config) {
        return res.status(404).send('未找到指定底图配置');
      }
      res.json(config);
    } catch (error) {
      console.error('获取底图配置失败:', error);
      res.status(500).send('获取底图配置失败');
    }
  });

  // 保存底图配置
  router.post('/basemap', async (req: Request, res: Response) => {
    try {
      const config = req.body as BasemapConfig;
      
      // 验证必要字段
      if (!config.name || !config.type || !config.url) {
        return res.status(400).send('缺少必要的底图参数');
      }
      
      const result = await basemapDb.saveConfig(config);
      res.json(result);
    } catch (error) {
      console.error('保存底图配置失败:', error);
      res.status(500).send('保存底图配置失败');
    }
  });

  // 删除指定底图配置
  router.delete('/basemap/:name', async (req: Request, res: Response) => {
    try {
      const success = await basemapDb.deleteConfig(req.params.name);
      if (!success) {
        return res.status(404).send('未找到指定底图配置');
      }
      res.json({ success: true });
    } catch (error) {
      console.error('删除底图配置失败:', error);
      res.status(500).send('删除底图配置失败');
    }
  });

  // 按类型获取底图配置
  router.get('/basemap/type/:type', async (req: Request, res: Response) => {
    try {
      const configs = await basemapDb.getConfigsByType(req.params.type);
      res.json(configs);
    } catch (error) {
      console.error('按类型获取底图配置失败:', error);
      res.status(500).send('按类型获取底图配置失败');
    }
  });
} 