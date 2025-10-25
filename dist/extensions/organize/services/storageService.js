// storageService.js - 存储管理服务

class StorageService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  // 获取存储数据
  async get(keys) {
    try {
      if (typeof keys === 'string') {
        keys = [keys];
      }

      // 检查缓存
      if (Array.isArray(keys)) {
        const cached = {};
        const uncachedKeys = [];
        
        for (const key of keys) {
          if (this.cache.has(key)) {
            cached[key] = this.cache.get(key);
          } else {
            uncachedKeys.push(key);
          }
        }

        if (uncachedKeys.length === 0) {
          return cached;
        }

        // 获取未缓存的数据
        const result = await chrome.storage.sync.get(uncachedKeys);
        
        // 更新缓存
        for (const [key, value] of Object.entries(result)) {
          this.cache.set(key, value);
        }

        return { ...cached, ...result };
      }

      // 获取所有数据
      const result = await chrome.storage.sync.get(keys);
      
      // 更新缓存
      for (const [key, value] of Object.entries(result)) {
        this.cache.set(key, value);
      }

      return result;
    } catch (error) {
      console.error('获取存储数据失败:', error);
      throw new Error('无法获取存储数据');
    }
  }

  // 设置存储数据
  async set(data) {
    try {
      await chrome.storage.sync.set(data);
      
      // 更新缓存
      for (const [key, value] of Object.entries(data)) {
        this.cache.set(key, value);
      }

      // 触发监听器
      this.notifyListeners(data);
      
      return true;
    } catch (error) {
      console.error('设置存储数据失败:', error);
      throw new Error('无法设置存储数据');
    }
  }

  // 删除存储数据
  async remove(keys) {
    try {
      if (typeof keys === 'string') {
        keys = [keys];
      }

      await chrome.storage.sync.remove(keys);
      
      // 清除缓存
      for (const key of keys) {
        this.cache.delete(key);
      }

      return true;
    } catch (error) {
      console.error('删除存储数据失败:', error);
      throw new Error('无法删除存储数据');
    }
  }

  // 清空所有存储数据
  async clear() {
    try {
      await chrome.storage.sync.clear();
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('清空存储数据失败:', error);
      throw new Error('无法清空存储数据');
    }
  }

  // 获取本地存储数据
  async getLocal(keys) {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('获取本地存储数据失败:', error);
      throw new Error('无法获取本地存储数据');
    }
  }

  // 设置本地存储数据
  async setLocal(data) {
    try {
      await chrome.storage.local.set(data);
      return true;
    } catch (error) {
      console.error('设置本地存储数据失败:', error);
      throw new Error('无法设置本地存储数据');
    }
  }

  // 删除本地存储数据
  async removeLocal(keys) {
    try {
      if (typeof keys === 'string') {
        keys = [keys];
      }
      await chrome.storage.local.remove(keys);
      return true;
    } catch (error) {
      console.error('删除本地存储数据失败:', error);
      throw new Error('无法删除本地存储数据');
    }
  }

  // 获取存储使用情况
  async getUsage() {
    try {
      const syncUsage = await chrome.storage.sync.getBytesInUse();
      const localUsage = await chrome.storage.local.getBytesInUse();
      
      return {
        sync: {
          used: syncUsage,
          quota: chrome.storage.sync.QUOTA_BYTES,
          percentage: (syncUsage / chrome.storage.sync.QUOTA_BYTES) * 100
        },
        local: {
          used: localUsage,
          quota: chrome.storage.local.QUOTA_BYTES,
          percentage: (localUsage / chrome.storage.local.QUOTA_BYTES) * 100
        }
      };
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      throw new Error('无法获取存储使用情况');
    }
  }

  // 设置管理
  async getSettings() {
    const defaultSettings = {
      autoBackup: true,
      backupPath: '',
      autoClassify: true,
      classificationRules: [],
      aiProvider: 'openai',
      aiApiKey: '',
      aiApiUrl: '',
      searchEnabled: true,
      showStats: true,
      theme: 'light',
      language: 'zh-CN',
      backupInterval: 24 * 60 * 60 * 1000, // 24小时
      maxBackups: 10,
      enableNotifications: true,
      debugMode: false
    };

    const settings = await this.get(Object.keys(defaultSettings));
    
    // 合并默认设置
    const result = {};
    for (const [key, defaultValue] of Object.entries(defaultSettings)) {
      result[key] = settings[key] !== undefined ? settings[key] : defaultValue;
    }

    return result;
  }

  // 更新设置
  async updateSettings(updates) {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...updates };
    
    // 验证设置
    this.validateSettings(newSettings);
    
    await this.set(newSettings);
    return newSettings;
  }

  // 验证设置
  validateSettings(settings) {
    // 验证备份间隔
    if (settings.backupInterval < 60 * 60 * 1000) { // 最少1小时
      throw new Error('备份间隔不能少于1小时');
    }

    // 验证最大备份数量
    if (settings.maxBackups < 1 || settings.maxBackups > 50) {
      throw new Error('最大备份数量必须在1-50之间');
    }

    // 验证AI提供商
    const validProviders = ['openai', 'deepseek', 'custom'];
    if (!validProviders.includes(settings.aiProvider)) {
      throw new Error('无效的AI提供商');
    }

    // 验证主题
    const validThemes = ['light', 'dark', 'auto'];
    if (!validThemes.includes(settings.theme)) {
      throw new Error('无效的主题设置');
    }
  }

  // 备份管理
  async createBackup(data, type = 'manual') {
    try {
      const backup = {
        id: this.generateId(),
        type: type, // manual, auto, scheduled
        timestamp: Date.now(),
        data: data,
        size: JSON.stringify(data).length,
        version: chrome.runtime.getManifest().version
      };

      // 获取现有备份
      const { backups = [] } = await this.getLocal(['backups']);
      
      // 添加新备份
      backups.unshift(backup);
      
      // 限制备份数量
      const settings = await this.getSettings();
      const maxBackups = settings.maxBackups || 10;
      if (backups.length > maxBackups) {
        backups.splice(maxBackups);
      }

      // 保存备份列表
      await this.setLocal({ backups });
      
      // 更新最后备份时间
      await this.set({ lastBackupTime: Date.now() });

      return backup;
    } catch (error) {
      console.error('创建备份失败:', error);
      throw new Error('无法创建备份');
    }
  }

  // 获取备份列表
  async getBackups() {
    try {
      const { backups = [] } = await this.getLocal(['backups']);
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('获取备份列表失败:', error);
      throw new Error('无法获取备份列表');
    }
  }

  // 删除备份
  async deleteBackup(backupId) {
    try {
      const { backups = [] } = await this.getLocal(['backups']);
      const filteredBackups = backups.filter(backup => backup.id !== backupId);
      await this.setLocal({ backups: filteredBackups });
      return true;
    } catch (error) {
      console.error('删除备份失败:', error);
      throw new Error('无法删除备份');
    }
  }

  // 清理旧备份
  async cleanupOldBackups() {
    try {
      const settings = await this.getSettings();
      const { backups = [] } = await this.getLocal(['backups']);
      
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
      const cutoffTime = Date.now() - maxAge;
      
      const validBackups = backups.filter(backup => 
        backup.timestamp > cutoffTime || backup.type === 'manual'
      );

      // 限制数量
      const maxBackups = settings.maxBackups || 10;
      if (validBackups.length > maxBackups) {
        validBackups.splice(maxBackups);
      }

      await this.setLocal({ backups: validBackups });
      return validBackups.length;
    } catch (error) {
      console.error('清理旧备份失败:', error);
      throw new Error('无法清理旧备份');
    }
  }

  // 数据迁移
  async migrateData(fromVersion, toVersion) {
    try {
      console.log(`数据迁移: ${fromVersion} -> ${toVersion}`);
      
      // 这里可以添加版本特定的迁移逻辑
      if (fromVersion < '1.0.0') {
        // 迁移旧版本数据
        await this.migrateFromLegacy();
      }

      // 更新版本信息
      await this.set({ dataVersion: toVersion });
      
      return true;
    } catch (error) {
      console.error('数据迁移失败:', error);
      throw new Error('数据迁移失败');
    }
  }

  // 从旧版本迁移
  async migrateFromLegacy() {
    // 实现具体的迁移逻辑
    console.log('执行旧版本数据迁移...');
  }

  // 添加存储监听器
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  // 移除存储监听器
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  // 通知监听器
  notifyListeners(changes) {
    for (const [key, value] of Object.entries(changes)) {
      if (this.listeners.has(key)) {
        for (const callback of this.listeners.get(key)) {
          try {
            callback(value, key);
          } catch (error) {
            console.error('监听器回调失败:', error);
          }
        }
      }
    }
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 导出所有数据
  async exportAllData() {
    try {
      const syncData = await chrome.storage.sync.get();
      const localData = await chrome.storage.local.get();
      
      return {
        version: chrome.runtime.getManifest().version,
        timestamp: new Date().toISOString(),
        sync: syncData,
        local: localData
      };
    } catch (error) {
      console.error('导出数据失败:', error);
      throw new Error('无法导出数据');
    }
  }

  // 导入数据
  async importData(data) {
    try {
      if (!data.version || !data.sync) {
        throw new Error('无效的数据格式');
      }

      // 清空现有数据
      await this.clear();
      await chrome.storage.local.clear();

      // 导入同步数据
      if (data.sync && Object.keys(data.sync).length > 0) {
        await chrome.storage.sync.set(data.sync);
      }

      // 导入本地数据
      if (data.local && Object.keys(data.local).length > 0) {
        await chrome.storage.local.set(data.local);
      }

      // 清除缓存
      this.cache.clear();

      return true;
    } catch (error) {
      console.error('导入数据失败:', error);
      throw new Error('无法导入数据');
    }
  }

  // 获取存储统计信息
  async getStorageStats() {
    try {
      const usage = await this.getUsage();
      const backups = await this.getBackups();
      const settings = await this.getSettings();
      
      return {
        usage: usage,
        backupCount: backups.length,
        lastBackupTime: settings.lastBackupTime,
        totalSize: usage.sync.used + usage.local.used,
        cacheSize: this.cache.size
      };
    } catch (error) {
      console.error('获取存储统计失败:', error);
      throw new Error('无法获取存储统计');
    }
  }

  // 清除缓存
  clearCache() {
    this.cache.clear();
  }
}

// 导出单例实例
const storageService = new StorageService();

// 监听存储变化
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    console.log('存储变化:', changes, areaName);
    
    // 更新缓存
    if (areaName === 'sync') {
      for (const [key, change] of Object.entries(changes)) {
        if (change.newValue !== undefined) {
          storageService.cache.set(key, change.newValue);
        } else {
          storageService.cache.delete(key);
        }
      }
    }
    
    // 通知监听器
    const changedData = {};
    for (const [key, change] of Object.entries(changes)) {
      changedData[key] = change.newValue;
    }
    storageService.notifyListeners(changedData);
  });
}

export default storageService;