
// options.js - 设置页面逻辑

class OptionsManager {
  constructor() {
    this.currentTab = 'organize';
    this.settings = {};
    this.classificationRules = [];
    this.organizePreviewPlan = null;
    // 失效检测：缓存与主机级节流
    this._urlCheckCache = new Map();
    this._hostLastTime = Object.create(null);
    this._hostSpacingMs = 200; // 每个主机最小请求间隔，降低被限流概率
    // 由 DOMContentLoaded 中的显式调用触发一次初始化，避免重复绑定事件
  }

  async init() {
    // 防止重复初始化导致事件绑定执行两次
    if (this._initialized) return;
    this._initialized = true;
    await this.loadSettings();
    await this.bindEvents();
    this.renderUI();
    this.setVersionTexts();
    // 初始化同步区的显示逻辑，并尝试每日自动同步
    this.updateSyncConfig();
    await this._maybeRunDailyAutoSync();
  }

  // 加载设置
  async loadSettings() {
    try {
      let result = {};
      
      // 检查是否在Chrome扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        result = await chrome.storage.sync.get([
          'classificationRules',
          'enableAI',
          'aiProvider',
          'aiApiKey',
          'aiApiUrl',
          'aiModel',
          'maxTokens',
          // 新增：AI 提示词模板
          'aiPromptOrganize',
          'aiPromptInfer',
          'aiBatchSize',
          'aiConcurrency',
          'classificationLanguage',
          'maxCategories',
          'weatherEnabled',
          'weatherCity',
          'wallpaperEnabled',
          'sixtySecondsEnabled',
          // 新增：分离透明度与书签栏默认收起
          'searchUnfocusedOpacity',
          'bookmarksUnfocusedOpacity',
          'sixtyUnfocusedOpacity',
          'topVisitedUnfocusedOpacity',
          'showBookmarks',
          // 热门栏目显示与数量
          'navShowTopVisited', 'navTopVisitedCount',
          // 自动归档旧书签
          'autoArchiveOldBookmarks', 'archiveOlderThanDays',
          // GitHub 同步配置
          'githubToken', 'githubOwner', 'githubRepo', 'githubBranch', 'githubPath', 'githubFormat', 'githubDualUpload', 'githubPathHtml',
          'githubAutoSyncDaily', 'githubLastAutoSyncDate',
          // 失效检测严格模式
          'deadStrictMode',
          // 失效扫描新增配置
          'deadTimeoutMs',
          'deadIgnorePrivateIp',
          'deadScanDuplicates',
          'deadScanFolderId',
          // 整理范围（移除目标父目录）
          'organizeScopeFolderId',
          // 多选整理范围（新增）
          'organizeScopeFolderIds',
          // 新增：云端 WebDAV/GDrive 配置
          'webdavUrl', 'webdavUsername', 'webdavPassword', 'webdavPath', 'webdavFormat', 'webdavDualUpload', 'webdavAutoSyncDaily', 'webdavLastAutoSyncDate',
          'gdriveToken', 'gdriveFolderId', 'gdriveBaseName', 'gdriveFormat', 'gdriveDualUpload',
          // 兼容：旧版坚果云（Nutstore）键
          'nutstoreUrl', 'nutstoreUsername', 'nutstorePassword', 'nutstorePath'
        ]);
      } else {
        // 在非扩展环境中使用localStorage作为fallback
        const keys = [
          'classificationRules',
          'enableAI',
          'aiProvider',
          'aiApiKey',
          'aiApiUrl',
          'aiModel',
          'maxTokens',
          // 新增：AI 提示词模板
          'aiPromptOrganize',
          'aiPromptInfer',
          'aiBatchSize',
          'aiConcurrency',
          'classificationLanguage',
          'maxCategories',
          'weatherEnabled',
          'weatherCity',
          'wallpaperEnabled',
          'sixtySecondsEnabled',
          'searchUnfocusedOpacity',
          'bookmarksUnfocusedOpacity',
          'sixtyUnfocusedOpacity',
          'topVisitedUnfocusedOpacity',
          'showBookmarks',
          'navShowTopVisited', 'navTopVisitedCount',
          'autoArchiveOldBookmarks', 'archiveOlderThanDays',
          'githubToken', 'githubOwner', 'githubRepo', 'githubFormat', 'githubDualUpload', 'githubPath', 'githubPathHtml',
          'githubAutoSyncDaily', 'githubLastAutoSyncDate',
          'deadStrictMode',
          'deadTimeoutMs',
          'deadIgnorePrivateIp',
          'deadScanDuplicates',
          'deadScanFolderId',
          'organizeScopeFolderId',
          'organizeScopeFolderIds',
          // 新增：云端 WebDAV/GDrive 配置
          'webdavUrl', 'webdavUsername', 'webdavPassword', 'webdavPath', 'webdavFormat', 'webdavDualUpload', 'webdavAutoSyncDaily', 'webdavLastAutoSyncDate',
          'gdriveToken', 'gdriveFolderId', 'gdriveBaseName', 'gdriveFormat', 'gdriveDualUpload',
          // 兼容：旧版坚果云（Nutstore）键
          'nutstoreUrl', 'nutstoreUsername', 'nutstorePassword', 'nutstorePath'
        ];
        
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              result[key] = JSON.parse(value);
            } catch {
              result[key] = value;
            }
          }
        });
      }

      // 兼容迁移：若未设置 WebDAV 且存在旧 Nutstore 键，将其迁移到 WebDAV
      (() => {
        const _webdavUrl = (result.webdavUrl || '').trim();
        const _webdavUsername = (result.webdavUsername || '').trim();
        const _webdavPassword = (result.webdavPassword || '').trim();
        const _webdavPath = (result.webdavPath || '').trim();
        const hasWebdav = !!(_webdavUrl || _webdavUsername || _webdavPassword || _webdavPath);
        const hasNutstore = !!(result.nutstoreUrl || result.nutstoreUsername || result.nutstorePassword || result.nutstorePath);
        if (!hasWebdav && hasNutstore) {
          result.webdavUrl = String(result.nutstoreUrl || '');
          result.webdavUsername = String(result.nutstoreUsername || '');
          result.webdavPassword = String(result.nutstorePassword || '');
          result.webdavPath = String(result.nutstorePath || 'tidymark/backups');
        }
      })();

      this.settings = {
        classificationRules: result.classificationRules ?? this.getDefaultRules(),
        enableAI: result.enableAI ?? false,
        aiProvider: ['openai','deepseek','ollama','custom','iflow'].includes(result.aiProvider) ? result.aiProvider : 'openai',
        aiApiKey: result.aiApiKey ?? '',
        aiApiUrl: result.aiApiUrl ?? '',
        aiModel: result.aiModel ?? 'gpt-3.5-turbo',
        maxTokens: (typeof result.maxTokens === 'number' && result.maxTokens > 0) ? result.maxTokens : 8192,
        // 新增：AI 提示词模板（为空则使用默认模板占位）
        aiPromptOrganize: (typeof result.aiPromptOrganize === 'string' && result.aiPromptOrganize.trim().length > 0)
          ? result.aiPromptOrganize
          : this.getDefaultAiPromptOrganize(),
        aiPromptInfer: (typeof result.aiPromptInfer === 'string' && result.aiPromptInfer.trim().length > 0)
          ? result.aiPromptInfer
          : this.getDefaultAiPromptInfer(),
        classificationLanguage: result.classificationLanguage ?? 'auto',
        maxCategories: result.maxCategories ?? undefined,
        weatherEnabled: result.weatherEnabled !== undefined ? !!result.weatherEnabled : true,
        weatherCity: (result.weatherCity || '').trim(),
        wallpaperEnabled: result.wallpaperEnabled !== undefined ? !!result.wallpaperEnabled : true,
        // 在非中文环境默认关闭 60s：依据已初始化的 I18n 语言
        sixtySecondsEnabled: (() => {
          const lang = (window.I18n && typeof window.I18n.getLanguageSync === 'function')
            ? window.I18n.getLanguageSync()
            : (navigator.language || 'en');
          const isZh = String(lang).toLowerCase().startsWith('zh');
          const explicit = result.sixtySecondsEnabled;
          return explicit !== undefined ? !!explicit : isZh;
        })(),
        searchUnfocusedOpacity: (() => {
          const v = result.searchUnfocusedOpacity;
          const num = typeof v === 'string' ? parseFloat(v) : v;
          if (Number.isFinite(num) && num >= 0.6 && num <= 1) return num;
          return 0.86;
        })(),
        bookmarksUnfocusedOpacity: (() => {
          const v = result.bookmarksUnfocusedOpacity;
          const num = typeof v === 'string' ? parseFloat(v) : v;
          if (Number.isFinite(num) && num >= 0.6 && num <= 1) return num;
          return 0.86;
        })(),
        topVisitedUnfocusedOpacity: (() => {
          const v = result.topVisitedUnfocusedOpacity;
          const num = typeof v === 'string' ? parseFloat(v) : v;
          if (Number.isFinite(num) && num >= 0.6 && num <= 1) return num;
          return 0.86;
        })(),
        showBookmarks: result.showBookmarks !== undefined ? !!result.showBookmarks : false,
        navShowTopVisited: result.navShowTopVisited !== undefined ? !!result.navShowTopVisited : false,
        navTopVisitedCount: (() => {
          const v = result.navTopVisitedCount;
          const num = typeof v === 'string' ? parseInt(v, 10) : v;
          if (Number.isFinite(num)) return Math.max(1, Math.min(50, num));
          return 10;
        })(),
        autoArchiveOldBookmarks: result.autoArchiveOldBookmarks !== undefined ? !!result.autoArchiveOldBookmarks : false,
        archiveOlderThanDays: (() => {
          const v = result.archiveOlderThanDays;
          const num = typeof v === 'string' ? parseInt(v, 10) : v;
          if (Number.isFinite(num)) return Math.max(7, Math.min(3650, num));
          return 180;
        })(),
        // GitHub 同步配置
        githubToken: (result.githubToken || '').trim(),
        githubOwner: (result.githubOwner || '').trim(),
        githubRepo: (result.githubRepo || '').trim(),
        githubBranch: (result.githubBranch || 'main').trim(),
        githubPath: (result.githubPath || 'tidymark/backups/tidymark-backup.json').trim(),
        githubFormat: ['json','html'].includes(result.githubFormat) ? result.githubFormat : 'json',
        githubDualUpload: result.githubDualUpload !== undefined ? !!result.githubDualUpload : false,
        githubPathHtml: (result.githubPathHtml || 'tidymark/backups/tidymark-bookmarks.html').trim(),
        githubAutoSyncDaily: result.githubAutoSyncDaily !== undefined ? !!result.githubAutoSyncDaily : false,
        githubAutoSyncOnPopup: result.githubAutoSyncOnPopup !== undefined ? !!result.githubAutoSyncOnPopup : false,
        githubLastAutoSyncDate: (result.githubLastAutoSyncDate || '').trim(),
        deadStrictMode: result.deadStrictMode !== undefined ? !!result.deadStrictMode : false,
        deadTimeoutMs: (() => {
          const v = result.deadTimeoutMs;
          const num = typeof v === 'string' ? parseInt(v, 10) : v;
          if (Number.isFinite(num) && num >= 1000 && num <= 60000) return num;
          return 8000;
        })(),
        deadIgnorePrivateIp: result.deadIgnorePrivateIp !== undefined ? !!result.deadIgnorePrivateIp : false,
        deadScanDuplicates: result.deadScanDuplicates !== undefined ? !!result.deadScanDuplicates : false,
        // 多选整理范围（为空表示全部）
        organizeScopeFolderIds: Array.isArray(result.organizeScopeFolderIds)
          ? result.organizeScopeFolderIds.map(v => String(v))
          : (result.organizeScopeFolderId ? [String(result.organizeScopeFolderId)] : []),
        // 云端：WebDAV
        webdavUrl: (result.webdavUrl || '').trim(),
        webdavUsername: (result.webdavUsername || '').trim(),
        webdavPassword: (result.webdavPassword || '').trim(),
        webdavPath: (result.webdavPath || 'tidymark/backups').trim(),
        // 云端：Google Drive
        gdriveToken: (result.gdriveToken || '').trim(),
        gdriveFolderId: (result.gdriveFolderId || '').trim(),
        gdriveBaseName: (result.gdriveBaseName || 'tidymark-backup').trim(),
        gdriveFormat: ['json','html'].includes(result.gdriveFormat) ? result.gdriveFormat : 'json'
      };

      this.classificationRules = this.settings.classificationRules || this.getDefaultRules();
    } catch (error) {
      console.error('加载设置失败:', error);
      // 使用默认设置
      this.settings = {
        classificationRules: this.getDefaultRules(),
        enableAI: false,
        aiProvider: 'openai',
        aiApiKey: '',
        aiApiUrl: '',
        aiModel: 'gpt-3.5-turbo',
        maxTokens: 8192,
        aiPromptOrganize: this.getDefaultAiPromptOrganize(),
        aiPromptInfer: this.getDefaultAiPromptInfer(),
        classificationLanguage: 'auto',
        maxCategories: undefined,
        wallpaperEnabled: true,
        // 在非中文环境默认关闭 60s
        sixtySecondsEnabled: (() => {
          const lang = (window.I18n && typeof window.I18n.getLanguageSync === 'function')
            ? window.I18n.getLanguageSync()
            : (navigator.language || 'en');
          return String(lang).toLowerCase().startsWith('zh');
        })(),
        searchUnfocusedOpacity: 0.86,
        bookmarksUnfocusedOpacity: 0.86,
        topVisitedUnfocusedOpacity: 0.86,
        showBookmarks: false,
        navShowTopVisited: false,
        navTopVisitedCount: 10,
        autoArchiveOldBookmarks: false,
        archiveOlderThanDays: 180,
        githubToken: '',
        githubOwner: '',
        githubRepo: '',
        githubBranch: 'main',
        githubPath: 'tidymark/backups/tidymark-backup.json',
        githubFormat: 'json',
        githubDualUpload: false,
        githubPathHtml: 'tidymark/backups/tidymark-bookmarks.html',
        githubAutoSyncDaily: false,
        githubAutoSyncOnPopup: false,
        githubLastAutoSyncDate: '',
        deadTimeoutMs: 8000,
        deadIgnorePrivateIp: false,
        deadScanDuplicates: false,
        deadScanFolderId: null,
        // 默认云端设置
        webdavUrl: '',
        webdavUsername: '',
        webdavPassword: '',
        webdavPath: 'tidymark/backups',
        webdavFormat: 'json',
        webdavDualUpload: false,
        webdavAutoSyncDaily: false,
        webdavLastAutoSyncDate: '',
        gdriveToken: '',
        gdriveFolderId: '',
        gdriveBaseName: 'tidymark-backup',
        gdriveFormat: 'json'
      };
      this.classificationRules = this.settings.classificationRules;
    }
  }

  // 保存设置
  async saveSettings() {
    try {
      // 验证AI模型配置
      this.validateAiModel();

      // 检查是否在Chrome扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set(this.settings);
      } else {
        // 在非扩展环境中使用localStorage作为fallback
        Object.keys(this.settings).forEach(key => {
          localStorage.setItem(key, JSON.stringify(this.settings[key]));
        });
      }
    this.showMessage((window.I18n ? window.I18n.t('options.save.success') : '设置已保存'), 'success');
    } catch (error) {
    console.error((window.I18n ? window.I18n.t('options.save.fail') : '保存设置失败') + ':', error);
    this.showMessage((window.I18n ? window.I18n.t('options.save.fail') : '保存设置失败'), 'error');
    }
  }

  // 验证AI模型配置
  validateAiModel() {
    const provider = String(this.settings.aiProvider || '').toLowerCase();
    const model = String(this.settings.aiModel || '').trim();

    if (!model) return; // 空模型名将使用默认值

    let validModels = [];

    switch (provider) {
      case 'openai':
        validModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
        break;
      case 'deepseek':
        validModels = ['deepseek-chat'];
        break;
      case 'iflow':
        validModels = ['deepseek-chat', 'deepseek-coder'];
        break;
      case 'ollama':
        // Ollama 支持任意模型，不验证
        return;
      case 'custom':
        // 自定义提供商支持任意模型，不验证
        return;
      default:
        // 未知提供商，使用默认值
        break;
    }

    if (validModels.length > 0 && !validModels.includes(model)) {
      console.warn(`[AI设置] 模型 "${model}" 不适用于提供商 "${provider}"，正在重置为默认模型`);
      this.settings.aiModel = validModels[0];
      this.showMessage(`AI模型 "${model}" 不受支持，已重置为 "${validModels[0]}"`, 'warning');
    }
  }

  // 绑定事件
  async bindEvents() {
    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.tab) || (e.target && e.target.dataset && e.target.dataset.tab);
        if (tab) this.switchTab(tab);
      });
    });

    // AI 配置
    const aiProvider = document.getElementById('aiProvider');
    if (aiProvider) {
      aiProvider.addEventListener('change', (e) => {
        const prevProvider = this.settings.aiProvider;
        const newProvider = e.target.value;
        this.settings.aiProvider = newProvider;

        const aiApiUrlInput = document.getElementById('apiEndpoint');
        if (aiApiUrlInput) {
          const prevDefault = this.getDefaultApiUrl(prevProvider);
          const newDefault = this.getDefaultApiUrl(newProvider);
          const currentVal = (aiApiUrlInput.value || '').trim();
          const storedVal = (this.settings.aiApiUrl || '').trim();
          if (!storedVal || !currentVal || storedVal === prevDefault) {
            this.settings.aiApiUrl = newDefault || '';
            aiApiUrlInput.value = this.settings.aiApiUrl;
          }
          aiApiUrlInput.placeholder = newDefault || '';
        }

        this.updateModelOptions();
        this.updateAiConfig();
        this.saveSettings();
      });
    }

    const aiApiKey = document.getElementById('apiKey');
    if (aiApiKey) {
      aiApiKey.addEventListener('input', (e) => {
        this.settings.aiApiKey = e.target.value;
        this.saveSettings();
      });
    }

    const aiApiUrl = document.getElementById('apiEndpoint');
    if (aiApiUrl) {
      aiApiUrl.addEventListener('input', (e) => {
        this.settings.aiApiUrl = e.target.value;
        this.saveSettings();
      });
      // 失去焦点时，如果提供商为 Ollama，自动尝试获取模型列表
      aiApiUrl.addEventListener('blur', async (e) => {
        this.settings.aiApiUrl = e.target.value;
        await this.saveSettings();
        const aiProviderEl = document.getElementById('aiProvider');
        const provider = aiProviderEl ? aiProviderEl.value : (this.settings.aiProvider || 'openai');
        if (provider === 'ollama') {
          // 触发模型刷新逻辑（会从 /api/tags 动态获取）
          this.updateModelOptions();
        }
      });
    }

    const aiModel = document.getElementById('aiModel');
    if (aiModel) {
      // 根据当前元素类型绑定不同事件
      if (aiModel.tagName === 'SELECT') {
        aiModel.addEventListener('change', (e) => {
          this.settings.aiModel = e.target.value;
          this.saveSettings();
        });
      } else if (aiModel.tagName === 'INPUT') {
        aiModel.addEventListener('input', (e) => {
          this.settings.aiModel = e.target.value;
          this.saveSettings();
        });
      }
    }

    // AI 提示词模板输入事件
    const aiPromptOrganizeEl = document.getElementById('aiPromptOrganize');
    if (aiPromptOrganizeEl) {
      aiPromptOrganizeEl.value = this.settings.aiPromptOrganize || '';
      aiPromptOrganizeEl.addEventListener('input', (e) => {
        this.settings.aiPromptOrganize = String(e.target.value || '');
        this.saveSettings();
      });
      const copyBtn = document.getElementById('aiPromptOrganizeCopy');
      const resetBtn = document.getElementById('aiPromptOrganizeReset');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const text = aiPromptOrganizeEl.value || '';
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(text);
            } else {
              const ta = document.createElement('textarea');
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            }
    this.showMessage((window.I18n ? window.I18n.t('ai.prompt.copy.success') : '提示词已复制'), 'success');
          } catch (e) {
            console.warn('复制失败', e);
    this.showMessage((window.I18n ? window.I18n.t('ai.prompt.copy.fail') : '复制失败，请手动选择复制'), 'error');
          }
        });
      }
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          const def = this.getDefaultAiPromptOrganize();
          this.settings.aiPromptOrganize = def;
          aiPromptOrganizeEl.value = def;
          this.saveSettings();
    this.showMessage((window.I18n ? window.I18n.t('ai.prompt.reset.success') : '已重置为默认提示词'), 'success');
        });
      }
    }
    const aiPromptInferEl = document.getElementById('aiPromptInfer');
    if (aiPromptInferEl) {
      aiPromptInferEl.value = this.settings.aiPromptInfer || '';
      aiPromptInferEl.addEventListener('input', (e) => {
        this.settings.aiPromptInfer = String(e.target.value || '');
        this.saveSettings();
      });
      const copyBtn2 = document.getElementById('aiPromptInferCopy');
      const resetBtn2 = document.getElementById('aiPromptInferReset');
      if (copyBtn2) {
        copyBtn2.addEventListener('click', async () => {
          const text = aiPromptInferEl.value || '';
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(text);
            } else {
              const ta = document.createElement('textarea');
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
            }
    this.showMessage((window.I18n ? window.I18n.t('ai.prompt.copy.success') : '提示词已复制'), 'success');
          } catch (e) {
            console.warn('复制失败', e);
    this.showMessage((window.I18n ? window.I18n.t('ai.prompt.copy.fail') : '复制失败，请手动选择复制'), 'error');
          }
        });
      }
      if (resetBtn2) {
        resetBtn2.addEventListener('click', () => {
          const def = this.getDefaultAiPromptInfer();
          this.settings.aiPromptInfer = def;
          aiPromptInferEl.value = def;
          this.saveSettings();
    this.showMessage((window.I18n ? window.I18n.t('ai.prompt.reset.success') : '已重置为默认提示词'), 'success');
        });
      }
    }

    const maxTokensInput = document.getElementById('maxTokens');
    if (maxTokensInput) {
      maxTokensInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (Number.isFinite(val) && val > 0) {
          this.settings.maxTokens = val;
        } else {
          this.settings.maxTokens = 8192; // 回退默认
        }
        this.saveSettings();
      });
    }

    const aiBatchSizeInput = document.getElementById('aiBatchSize');
    if (aiBatchSizeInput) {
      aiBatchSizeInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        const num = Number.isFinite(val) && val >= 20 ? val : 120; // 合理默认
        this.settings.aiBatchSize = num;
        this.saveSettings();
      });
    }

    const aiConcurrencyInput = document.getElementById('aiConcurrency');
    if (aiConcurrencyInput) {
      aiConcurrencyInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        let num = Number.isFinite(val) ? val : 3;
        if (num < 1) num = 1;
        if (num > 5) num = 5;
        this.settings.aiConcurrency = num;
        this.saveSettings();
      });
    }

    const classificationLanguage = document.getElementById('classificationLanguage');
    if (classificationLanguage) {
      classificationLanguage.addEventListener('change', (e) => {
        this.settings.classificationLanguage = e.target.value;
        this.saveSettings();
      });
    }

    // 已移除最大分类数配置

    // 启用 AI 开关
    const enableAI = document.getElementById('enableAI');
    if (enableAI) {
      enableAI.addEventListener('change', (e) => {
        this.settings.enableAI = !!e.target.checked;
        this.saveSettings();
        this.updateAiConfig();
      });
    }

    // 设置页直接执行自动整理
    const organizeBtn = document.getElementById('organizeFromSettings');
    if (organizeBtn) {
      organizeBtn.addEventListener('click', () => {
        this.organizeFromSettings();
      });
    }

    // AI 全量归类
    const aiInferBtn = document.getElementById('aiInferOrganizeBtn');
    if (aiInferBtn) {
      aiInferBtn.addEventListener('click', () => {
        this.organizeByAiInference();
      });
    }

    // 天气组件开关
    const weatherEnabled = document.getElementById('weatherEnabled');
    if (weatherEnabled) {
      weatherEnabled.addEventListener('change', (e) => {
        this.settings.weatherEnabled = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 城市输入
    const weatherCity = document.getElementById('weatherCity');
    if (weatherCity) {
      weatherCity.addEventListener('input', (e) => {
        this.settings.weatherCity = (e.target.value || '').trim();
        this.saveSettings();
      });
    }

    // 壁纸开关
    const wallpaperEnabled = document.getElementById('wallpaperEnabled');
    if (wallpaperEnabled) {
      wallpaperEnabled.addEventListener('change', (e) => {
        this.settings.wallpaperEnabled = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 60s 读懂世界开关
    const sixtySecondsEnabled = document.getElementById('sixtySecondsEnabled');
    if (sixtySecondsEnabled) {
      sixtySecondsEnabled.addEventListener('change', (e) => {
        this.settings.sixtySecondsEnabled = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 非聚焦透明度（分离：搜索框、书签框、60s栏目）
    const searchOpacity = document.getElementById('searchUnfocusedOpacity');
    const searchOpacityValue = document.getElementById('searchUnfocusedOpacityValue');
    if (searchOpacity) {
      const syncSearchView = (val) => { if (searchOpacityValue) searchOpacityValue.textContent = Number(val).toFixed(2); };
      syncSearchView(this.settings.searchUnfocusedOpacity || 0.86);
      searchOpacity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (Number.isFinite(val)) {
          this.settings.searchUnfocusedOpacity = Math.max(0.6, Math.min(1, val));
          syncSearchView(this.settings.searchUnfocusedOpacity);
          this.saveSettings();
        }
      });
    }

    const bookmarksOpacity = document.getElementById('bookmarksUnfocusedOpacity');
    const bookmarksOpacityValue = document.getElementById('bookmarksUnfocusedOpacityValue');
    if (bookmarksOpacity) {
      const syncBookmarksView = (val) => { if (bookmarksOpacityValue) bookmarksOpacityValue.textContent = Number(val).toFixed(2); };
      syncBookmarksView(this.settings.bookmarksUnfocusedOpacity || 0.86);
      bookmarksOpacity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (Number.isFinite(val)) {
          this.settings.bookmarksUnfocusedOpacity = Math.max(0.6, Math.min(1, val));
          syncBookmarksView(this.settings.bookmarksUnfocusedOpacity);
          this.saveSettings();
        }
      });
    }

    const sixtyOpacity = document.getElementById('sixtyUnfocusedOpacity');
    const sixtyOpacityValue = document.getElementById('sixtyUnfocusedOpacityValue');
    if (sixtyOpacity) {
      const syncSixtyView = (val) => { if (sixtyOpacityValue) sixtyOpacityValue.textContent = Number(val).toFixed(2); };
      syncSixtyView(this.settings.sixtyUnfocusedOpacity || 0.86);
      sixtyOpacity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (Number.isFinite(val)) {
          this.settings.sixtyUnfocusedOpacity = Math.max(0.6, Math.min(1, val));
          syncSixtyView(this.settings.sixtyUnfocusedOpacity);
          this.saveSettings();
        }
      });
    }

    // 热门栏目透明度
    const topVisitedOpacity = document.getElementById('topVisitedUnfocusedOpacity');
    const topVisitedOpacityValue = document.getElementById('topVisitedUnfocusedOpacityValue');
    if (topVisitedOpacity) {
      const syncTopVisitedView = (val) => { if (topVisitedOpacityValue) topVisitedOpacityValue.textContent = Number(val).toFixed(2); };
      syncTopVisitedView(this.settings.topVisitedUnfocusedOpacity || 0.86);
      topVisitedOpacity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (Number.isFinite(val)) {
          this.settings.topVisitedUnfocusedOpacity = Math.max(0.6, Math.min(1, val));
          syncTopVisitedView(this.settings.topVisitedUnfocusedOpacity);
          this.saveSettings();
        }
      });
    }

    // 书签列表是否展示
    const showBookmarks = document.getElementById('showBookmarks');
    if (showBookmarks) {
      showBookmarks.addEventListener('change', (e) => {
        this.settings.showBookmarks = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 热门栏目开关
    const navShowTopVisited = document.getElementById('navShowTopVisited');
    if (navShowTopVisited) {
      navShowTopVisited.addEventListener('change', (e) => {
        this.settings.navShowTopVisited = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 热门栏目数量
    const navTopVisitedCount = document.getElementById('navTopVisitedCount');
    if (navTopVisitedCount) {
      const init = Number.isFinite(this.settings.navTopVisitedCount) ? this.settings.navTopVisitedCount : 10;
      navTopVisitedCount.value = String(init);
      navTopVisitedCount.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (Number.isFinite(val)) {
          this.settings.navTopVisitedCount = Math.max(1, Math.min(50, val));
          this.saveSettings();
        }
      });
    }

    // 自动归档旧书签
    const autoArchive = document.getElementById('autoArchiveOldBookmarks');
    if (autoArchive) {
      autoArchive.addEventListener('change', (e) => {
        this.settings.autoArchiveOldBookmarks = !!e.target.checked;
        this.saveSettings();
      });
    }
    const archiveDays = document.getElementById('archiveOlderThanDays');
    if (archiveDays) {
      const init = Number.isFinite(this.settings.archiveOlderThanDays) ? this.settings.archiveOlderThanDays : 180;
      archiveDays.value = String(init);
      archiveDays.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (Number.isFinite(val)) {
          this.settings.archiveOlderThanDays = Math.max(7, Math.min(3650, val));
          this.saveSettings();
        }
      });
    }

    // 失效检测严格模式开关
    const deadStrictMode = document.getElementById('deadStrictMode');
    if (deadStrictMode) {
      deadStrictMode.checked = !!this.settings.deadStrictMode;
      deadStrictMode.addEventListener('change', (e) => {
        this.settings.deadStrictMode = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 失效检测超时设置（毫秒）
    const deadTimeoutMs = document.getElementById('deadTimeoutMs');
    const deadTimeoutMsValue = document.getElementById('deadTimeoutMsValue');
    if (deadTimeoutMs) {
      const secsInit = Math.round((this.settings.deadTimeoutMs || 8000) / 1000);
      deadTimeoutMs.value = String(Math.max(1, Math.min(60, secsInit)));
      const updateSecs = (secs) => {
        if (deadTimeoutMsValue) deadTimeoutMsValue.textContent = `${secs} s`;
      };
      updateSecs(parseInt(deadTimeoutMs.value, 10));
      deadTimeoutMs.addEventListener('input', (e) => {
        const secs = parseInt(String(e.target.value).trim(), 10);
        if (Number.isFinite(secs)) {
          const clamped = Math.max(1, Math.min(60, secs));
          this.settings.deadTimeoutMs = clamped * 1000;
          updateSecs(clamped);
          this.saveSettings();
        }
      });
    }

    // 失效检测是否忽略内网 IP
    const deadIgnorePrivateIp = document.getElementById('deadIgnorePrivateIp');
    if (deadIgnorePrivateIp) {
      deadIgnorePrivateIp.checked = !!this.settings.deadIgnorePrivateIp;
      deadIgnorePrivateIp.addEventListener('change', (e) => {
        this.settings.deadIgnorePrivateIp = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 失效检测：扫描重复书签
    const deadScanDuplicates = document.getElementById('deadScanDuplicates');
    if (deadScanDuplicates) {
      deadScanDuplicates.checked = !!this.settings.deadScanDuplicates;
      deadScanDuplicates.addEventListener('change', (e) => {
        this.settings.deadScanDuplicates = !!e.target.checked;
        this.saveSettings();
      });
    }

    // 失效检测：限定文件夹
    const deadFolderScope = document.getElementById('deadFolderScope');
    if (deadFolderScope) {
      try {
        const folders = await this.getAllFolderPaths();
        // 清空并填充选项（支持国际化）
        deadFolderScope.innerHTML = `<option value="">${window.I18n ? (window.I18n.t('dead.folder.option.all') || '全部书签') : '全部书签'}</option>` +
          folders.map(f => `<option value="${this.escapeHtml(String(f.id))}">${this.escapeHtml(f.path)}</option>`).join('');
        // 初始化为当前设置值
        const initVal = this.settings.deadScanFolderId ? String(this.settings.deadScanFolderId) : '';
        deadFolderScope.value = initVal;
      } catch (e) {
        console.warn('加载文件夹列表失败', e);
      }
      deadFolderScope.addEventListener('change', (e) => {
        const val = String(e.target.value || '').trim();
        this.settings.deadScanFolderId = val || null;
        this.saveSettings();
      });
    }

    // 整理范围与目标父目录的选择移至确认弹窗，这里不再初始化内联控件


    // 按钮事件
    const quickBackupBtn = document.getElementById('quickBackupBtn');
    if (quickBackupBtn) {
      quickBackupBtn.addEventListener('click', async () => {
        await this.backupBookmarks();
      });
    }
    const testAiConnection = document.getElementById('testAiConnection');
    if (testAiConnection) {
      testAiConnection.addEventListener('click', () => {
        this.testAiConnection();
      });
    }

    // 备份导出 / 导入
    const exportBackupBtn = document.getElementById('exportBackupBtn');
    if (exportBackupBtn) {
      exportBackupBtn.addEventListener('click', () => {
        this.exportBackup();
      });
    }
    const importBackupBtn = document.getElementById('importBackupBtn');
    if (importBackupBtn) {
      importBackupBtn.addEventListener('click', () => {
        this.importBackup();
      });
    }

    const addRule = document.getElementById('addRule');
    if (addRule) {
      addRule.addEventListener('click', () => {
        this.showRuleDialog();
      });
    }

    const resetRules = document.getElementById('resetRules');
    if (resetRules) {
      resetRules.addEventListener('click', () => {
        this.resetToDefaultRules();
      });
    }

    const resetData = document.getElementById('resetData');
    if (resetData) {
      resetData.addEventListener('click', () => {
        this.resetSettings();
      });
    }

    // GitHub 同步配置输入事件
    const ghToken = document.getElementById('githubToken');
    if (ghToken) {
      ghToken.addEventListener('input', (e) => {
        this.settings.githubToken = e.target.value;
        this.saveSettings();
      });
    }
    const ghOwner = document.getElementById('githubOwner');
    if (ghOwner) {
      ghOwner.addEventListener('input', (e) => {
        this.settings.githubOwner = e.target.value;
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    const ghRepo = document.getElementById('githubRepo');
    if (ghRepo) {
      ghRepo.addEventListener('input', (e) => {
        this.settings.githubRepo = e.target.value;
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    // 移除分支与路径字段（使用默认值）

    const ghFormat = document.getElementById('githubFormat');
    if (ghFormat) {
      ghFormat.addEventListener('change', (e) => {
        const val = String(e.target.value || 'json');
        this.settings.githubFormat = ['json','html'].includes(val) ? val : 'json';
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    const ghDual = document.getElementById('githubDualUpload');
    if (ghDual) {
      ghDual.addEventListener('change', (e) => {
        this.settings.githubDualUpload = !!e.target.checked;
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    // 移除 HTML 路径字段（使用默认值）

    // 自动同步开关
    const autoDaily = document.getElementById('githubAutoSyncDaily');
    if (autoDaily) {
      autoDaily.addEventListener('change', (e) => {
        this.settings.githubAutoSyncDaily = !!e.target.checked;
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    // 已合并为每日同步开关；移除“打开插件页面时自动同步”

    // GitHub 同步按钮
    const githubSyncBtn = document.getElementById('githubSyncBtn');
    if (githubSyncBtn) {
      githubSyncBtn.addEventListener('click', () => {
        this.syncToGithub();
      });
    }

    // GitHub 配置备份/导入按钮事件
    const githubConfigSyncBtn = document.getElementById('githubConfigSyncBtn');
    if (githubConfigSyncBtn) {
      githubConfigSyncBtn.addEventListener('click', () => {
        this.syncConfigToGithub();
      });
    }
    const githubConfigImportBtn = document.getElementById('githubConfigImportBtn');
    if (githubConfigImportBtn) {
      githubConfigImportBtn.addEventListener('click', () => {
        this.importConfigFromGithub();
      });
    }

    const quickGithubSyncBtn = document.getElementById('quickGithubSyncBtn');
    if (quickGithubSyncBtn) {
      quickGithubSyncBtn.addEventListener('click', () => {
        const cloudProvider = document.getElementById('cloudProvider');
        const pv = cloudProvider ? cloudProvider.value : 'github';
        // 先切到同步页
        this.switchTab('sync');
        // 根据当前选择的云执行
        if (pv === 'github') {
          this.syncToGithub();
        } else {
          const msg = '该云提供商的同步尚未实现';
          this.showMessage(msg, 'warning');
          const cloudStatusEl = document.getElementById('cloudSyncStatus');
          if (cloudStatusEl) cloudStatusEl.textContent = msg;
        }
      });
    }

    // 配置页快速同步按钮
    const configCloudSyncBtn = document.getElementById('configCloudSyncBtn');
    if (configCloudSyncBtn) {
      configCloudSyncBtn.addEventListener('click', () => {
        const pvSel = document.getElementById('configCloudProvider');
        const pv = pvSel ? pvSel.value : 'webdav';
        const configStatusEl = document.getElementById('configSyncStatus');
        if (configStatusEl) configStatusEl.textContent = '正在同步...';
        this.syncToCloud(pv);
      });
    }

    // 云备份提供商切换与按钮事件
    const cloudProvider = document.getElementById('cloudProvider');
    const webdavFields = document.getElementById('webdavFields');
    const gdriveFields = document.getElementById('gdriveFields');
    const githubFields = document.getElementById('githubFields');
    const cloudSyncBtn = document.getElementById('cloudSyncBtn');
    const cloudStatusEl = document.getElementById('cloudSyncStatus');
    // 操作指南 details 容器
    const guideGithub = document.getElementById('cloudGuideGithub');
    const guideWebdav = document.getElementById('cloudGuideWebdav');
    const guideGdrive = document.getElementById('cloudGuideGdrive');

    // WebDAV/Nutstore 字段事件绑定与初始值
    const webdavUrlInput = document.getElementById('webdavUrl');
    const webdavUsernameInput = document.getElementById('webdavUsername');
    const webdavPasswordInput = document.getElementById('webdavPassword');
    const webdavPathInput = document.getElementById('webdavPath');

    if (webdavUrlInput) {
      webdavUrlInput.value = this.settings.webdavUrl || '';
      webdavUrlInput.addEventListener('input', (e) => {
        this.settings.webdavUrl = e.target.value;
        this.saveSettings();
      });
    }
    if (webdavUsernameInput) {
      webdavUsernameInput.value = this.settings.webdavUsername || '';
      webdavUsernameInput.addEventListener('input', (e) => {
        this.settings.webdavUsername = e.target.value;
        this.saveSettings();
      });
    }
    if (webdavPasswordInput) {
      webdavPasswordInput.value = this.settings.webdavPassword || '';
      webdavPasswordInput.addEventListener('input', (e) => {
        this.settings.webdavPassword = e.target.value;
        this.saveSettings();
      });
    }
    if (webdavPathInput) {
      webdavPathInput.value = this.settings.webdavPath || 'tidymark/backups';
      webdavPathInput.addEventListener('input', (e) => {
        this.settings.webdavPath = e.target.value;
        this.saveSettings();
      });
    }

    const webdavFormatSelect = document.getElementById('webdavFormat');
    if (webdavFormatSelect) {
      webdavFormatSelect.value = this.settings.webdavFormat || 'json';
      webdavFormatSelect.addEventListener('change', (e) => {
        const val = String(e.target.value || 'json');
        this.settings.webdavFormat = ['json','html'].includes(val) ? val : 'json';
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    const webdavDual = document.getElementById('webdavDualUpload');
    if (webdavDual) {
      webdavDual.checked = !!this.settings.webdavDualUpload;
      webdavDual.addEventListener('change', (e) => {
        this.settings.webdavDualUpload = !!e.target.checked;
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    const webdavAutoDaily = document.getElementById('webdavAutoSyncDaily');
    if (webdavAutoDaily) {
      webdavAutoDaily.checked = !!this.settings.webdavAutoSyncDaily;
      webdavAutoDaily.addEventListener('change', (e) => {
        this.settings.webdavAutoSyncDaily = !!e.target.checked;
        this.saveSettings();
        this.updateSyncConfig();
      });
    }

    // Google Drive 字段事件绑定
    const gdriveTokenEl = document.getElementById('gdriveToken');
    const gdriveFolderIdEl = document.getElementById('gdriveFolderId');
    const gdriveBaseNameEl = document.getElementById('gdriveBaseName');
    const gdriveFormatEl = document.getElementById('gdriveFormat');
    const gdriveDualEl = document.getElementById('gdriveDualUpload');

    if (gdriveTokenEl) {
      gdriveTokenEl.value = this.settings.gdriveToken || '';
      gdriveTokenEl.addEventListener('input', (e) => {
        this.settings.gdriveToken = e.target.value;
        this.saveSettings();
      });
    }
    if (gdriveFolderIdEl) {
      gdriveFolderIdEl.value = this.settings.gdriveFolderId || '';
      gdriveFolderIdEl.addEventListener('input', (e) => {
        this.settings.gdriveFolderId = e.target.value;
        this.saveSettings();
      });
    }
    if (gdriveBaseNameEl) {
      gdriveBaseNameEl.value = this.settings.gdriveBaseName || 'tidymark-backup';
      gdriveBaseNameEl.addEventListener('input', (e) => {
        this.settings.gdriveBaseName = e.target.value;
        this.saveSettings();
      });
    }
    if (gdriveFormatEl) {
      gdriveFormatEl.value = this.settings.gdriveFormat || 'json';
      gdriveFormatEl.addEventListener('change', (e) => {
        const val = String(e.target.value || 'json');
        this.settings.gdriveFormat = ['json','html'].includes(val) ? val : 'json';
        this.saveSettings();
        this.updateSyncConfig();
      });
    }
    if (gdriveDualEl) {
      gdriveDualEl.checked = !!this.settings.gdriveDualUpload;
      gdriveDualEl.addEventListener('change', (e) => {
        this.settings.gdriveDualUpload = !!e.target.checked;
        this.saveSettings();
        this.updateSyncConfig();
      });
    }

    const updateCloudFieldsVisibility = () => {
      const pv = cloudProvider ? cloudProvider.value : 'github';
      if (githubFields) githubFields.style.display = (pv === 'github') ? '' : 'none';
      if (webdavFields) webdavFields.style.display = (pv === 'webdav') ? '' : 'none';
      if (gdriveFields) gdriveFields.style.display = (pv === 'gdrive') ? '' : 'none';
      // 同步显示对应操作指南
      if (guideGithub) guideGithub.style.display = (pv === 'github') ? '' : 'none';
      if (guideWebdav) guideWebdav.style.display = (pv === 'webdav') ? '' : 'none';
      if (guideGdrive) guideGdrive.style.display = (pv === 'gdrive') ? '' : 'none';
      // 显示/隐藏 GitHub 配置卡片
      const githubConfigCard = document.getElementById('githubConfigCard');
      if (githubConfigCard) githubConfigCard.style.display = (pv === 'github') ? '' : 'none';
    };

    if (cloudProvider) {
      // 默认选中 GitHub
      if (!cloudProvider.value) cloudProvider.value = 'github';
      cloudProvider.addEventListener('change', () => {
        updateCloudFieldsVisibility();
      });
      updateCloudFieldsVisibility();
    }

    if (cloudStatusEl) {
      try {
        cloudStatusEl.textContent = window.I18n ? (window.I18n.t('sync.cloud.status.idle') || '尚未同步') : '尚未同步';
      } catch {
        cloudStatusEl.textContent = '尚未同步';
      }
    }

    if (cloudSyncBtn) {
      cloudSyncBtn.addEventListener('click', () => {
        const pv = cloudProvider ? cloudProvider.value : 'github';
        this.syncToCloud(pv);
      });
    }

    // 失效书签检测事件绑定
    const deadScanBtn = document.getElementById('deadScanBtn');
    const deadScanProgress = document.getElementById('deadScanProgress');
    const deadResults = document.getElementById('deadResults');
    const deadResultsList = document.getElementById('deadResultsList');
    const deadSelectAll = document.getElementById('deadSelectAll');
    const deadDeleteBtn = document.getElementById('deadDeleteBtn');
    const deadMoveBtn = document.getElementById('deadMoveBtn');

    if (deadScanBtn) {
      deadScanBtn.addEventListener('click', async () => {
        await this.scanDeadBookmarks({
          progressEl: deadScanProgress,
          listEl: deadResultsList,
          containerEl: deadResults,
          scanBtn: deadScanBtn
        });
      });
    }

    if (deadSelectAll && deadResultsList) {
      deadSelectAll.addEventListener('change', () => {
        deadResultsList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = !!deadSelectAll.checked;
        });
      });
    }

    if (deadDeleteBtn && deadResultsList) {
      deadDeleteBtn.addEventListener('click', async () => {
        const checkedCbs = Array.from(deadResultsList.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked);
        const checked = [];
        checkedCbs.forEach(cb => {
          const multi = (cb.dataset.ids || '').trim();
          if (multi) {
            multi.split(',').forEach(id => { if (id) checked.push(id); });
          } else if (cb.dataset.id) {
            checked.push(cb.dataset.id);
          }
        });
        // 去重
        const uniqueChecked = Array.from(new Set(checked));
        if (uniqueChecked.length === 0) {
          this.showMessage(window.I18n.t('dead.delete.noSelection'), 'error');
          return;
        }
        deadDeleteBtn.disabled = true;
        const originalText = deadDeleteBtn.textContent;
        deadDeleteBtn.textContent = window.I18n.t('dead.delete.processing');
        try {
          if (typeof chrome !== 'undefined' && chrome.bookmarks) {
            for (const id of uniqueChecked) {
              try { await chrome.bookmarks.remove(id); } catch (e) { console.warn('删除失败', id, e); }
            }
          }
          // 从列表中移除对应项
          uniqueChecked.forEach(id => {
            const item = deadResultsList.querySelector(`li[data-id="${id}"]`);
            if (item) item.remove();
          });
          this.showMessage(window.I18n.tf('dead.delete.success', { count: checked.length }), 'success');
        } catch (e) {
          console.error('删除失效书签出错', e);
          this.showMessage(window.I18n.t('dead.delete.fail'), 'error');
        } finally {
          deadDeleteBtn.disabled = false;
          deadDeleteBtn.textContent = originalText;
        }
      });
    }

    // 将选中的失效书签移动到“失效书签”文件夹
    if (deadMoveBtn && deadResultsList) {
      deadMoveBtn.addEventListener('click', async () => {
        const checkedCbs = Array.from(deadResultsList.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked);
        const checked = [];
        checkedCbs.forEach(cb => {
          const multi = (cb.dataset.ids || '').trim();
          if (multi) {
            multi.split(',').forEach(id => { if (id) checked.push(id); });
          } else if (cb.dataset.id) {
            checked.push(cb.dataset.id);
          }
        });
        const uniqueChecked = Array.from(new Set(checked));
        if (uniqueChecked.length === 0) {
          this.showMessage(window.I18n.t('dead.delete.noSelection'), 'error');
          return;
        }
        // 非扩展环境保护
        if (typeof chrome === 'undefined' || !chrome.bookmarks) {
          this.showMessage(window.I18n.t('dead.move.fail'), 'error');
          return;
        }
        deadMoveBtn.disabled = true;
        const originalText = deadMoveBtn.textContent;
        deadMoveBtn.textContent = window.I18n.t('dead.move.processing');
        try {
          const folder = await this.findOrCreateDeadFolder();
          const folderName = folder?.title || window.I18n.t('dead.folder');
          for (const id of uniqueChecked) {
            try {
              await chrome.bookmarks.move(id, { parentId: folder.id });
            } catch (e) {
              console.warn('移动失败', id, e);
            }
          }
          // 从列表中移除对应项
          uniqueChecked.forEach(id => {
            const item = deadResultsList.querySelector(`li[data-id="${id}"]`);
            if (item) item.remove();
          });
          this.showMessage(window.I18n.tf('dead.move.success', { count: checked.length, folder: folderName }), 'success');
        } catch (e) {
          console.error('移动到失效文件夹出错', e);
          this.showMessage(window.I18n.t('dead.move.fail'), 'error');
        } finally {
          deadMoveBtn.disabled = false;
          deadMoveBtn.textContent = originalText;
        }
      });
    }

    // 列表项点击打开页面验证（仅点击标题/URL区域触发，避开复选框与删除按钮）
    if (deadResultsList) {
      deadResultsList.addEventListener('click', (e) => {
        const target = e.target;
        // 忽略勾选行为
        if (target.closest('input[type="checkbox"]')) return;
        const li = target.closest('li.list-item');
        if (!li) return;
        const infoArea = target.closest('.info') || target.closest('.title') || target.closest('.url');
        if (!infoArea) return;
        const urlEl = li.querySelector('.url');
        const url = (urlEl && urlEl.textContent || '').trim();
        if (url && this.isHttpUrl(url)) {
          try {
            window.open(url, '_blank', 'noopener,noreferrer');
          } catch (err) {
            console.warn('打开页面失败', err);
          }
        }
      });
    }
  }

  // 从设置页触发自动整理（含预览、AI优化与确认）
  async organizeFromSettings() {
    const btn = document.getElementById('organizeFromSettings');
    const original = btn ? btn.innerHTML : '';
    const setStatus = (text, type = 'success') => {
      this.showMessage(text, type);
    };
    try {
      if (btn) {
        // 使用 loading 状态而非禁用，避免按钮颜色变灰且保留前置图标
        btn.classList.add('is-loading');
        btn.style.pointerEvents = 'none';
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = '⚡ <span class="loading" style="margin:0 6px 0 4px;vertical-align:middle"></span> 整理中...';
      }
      setStatus('准备预览...', 'success');
      let previewResponse;
      // 先弹出参数确认弹窗，仅选择整理范围
      const params = await this.showOrganizeParamsDialog();
      if (!params) return; // 用户取消
      const { scopeFolderIds = [] } = params;
      if (typeof chrome !== 'undefined' && chrome?.runtime) {
        previewResponse = await chrome.runtime.sendMessage({
          action: 'previewOrganize',
          scopeFolderIds
        });
      } else {
        throw new Error('当前不在扩展环境，无法执行');
      }
      if (!previewResponse?.success) throw new Error(previewResponse?.error || '生成预览失败');
      let plan = previewResponse.data;

      // 若启用 AI 且已配置，调用后台 AI 优化
      setStatus('AI 优化中...', 'success');
      const useAI = !!this.settings.enableAI && !!this.settings.aiApiKey;
      if (useAI && typeof chrome !== 'undefined' && chrome?.runtime) {
        const aiResp = await chrome.runtime.sendMessage({ action: 'refineOrganizeWithAI', preview: plan });
        if (aiResp?.success && aiResp.data) {
          plan = aiResp.data;
        }
      }

      // 将预览内嵌到“整理”标签，不再使用弹窗
      // 记录当前选择至计划元信息，便于确认时传递
      const meta = {
        scopeFolderIds: scopeFolderIds
      };
      const planWithMeta = { ...plan, meta };
      this.organizePreviewPlan = planWithMeta;
      this.renderOrganizePreview(planWithMeta);
    this.showMessage((window.I18n ? window.I18n.t('preview.generated.simple') : '预览已生成，请在下方确认'), 'success');
      // inline status banner removed; rely on global message only
    } catch (e) {
      console.error('[Options] organizeFromSettings 失败:', e);
      setStatus(`失败：${e?.message || e}`, 'error');
    } finally {
      if (btn) {
        // 恢复按钮状态与文本
        btn.classList.remove('is-loading');
        btn.style.pointerEvents = '';
        btn.removeAttribute('aria-busy');
        btn.innerHTML = original;
      }
    }
  }

  // 仅由 AI 推理新分类，并执行前用户确认
  async organizeByAiInference() {
    const btn = document.getElementById('aiInferOrganizeBtn');
    const original = btn ? btn.innerHTML : '';
    const setStatus = (text, type = 'info') => {
      this.showMessage(text, type);
    };
    try {
      if (btn) {
        // 使用 loading 状态而非禁用，避免按钮颜色变灰且保留前置图标
        btn.classList.add('is-loading');
        btn.style.pointerEvents = 'none';
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = '🤖 <span class="loading" style="margin:0 6px 0 4px;vertical-align:middle"></span> AI 归类中...';
      }
      setStatus('准备 AI 归类预览...', 'info');
      // 先弹出参数确认弹窗，仅选择整理范围
      const params = await this.showOrganizeParamsDialog();
      if (!params) return; // 用户取消
      const { scopeFolderIds = [] } = params;
      if (typeof chrome === 'undefined' || !chrome?.runtime) {
        throw new Error('当前不在扩展环境，无法执行');
      }
      const resp = await chrome.runtime.sendMessage({ action: 'organizeByAiInference', scopeFolderIds });
      if (!resp?.success) throw new Error(resp?.error || 'AI 归类预览失败');
      // 记录当前选择至计划元信息，便于确认时传递
      const plan = { ...resp.data, meta: { ...(resp.data?.meta || {}), scopeFolderIds } };
      this._lastOrganizeParams = { scopeFolderIds };
      // 渲染到“整理”标签的内嵌预览，支持用户调整与确认
      this.organizePreviewPlan = plan;
      this.renderOrganizePreview(plan);
      this.showMessage(window.I18n ? (window.I18n.t('help.aiFull.globalTip') || 'AI 归类预览已生成，请在下方调整后点击确认执行') : 'AI 归类预览已生成，请在下方调整后点击确认执行', 'info');
      // inline status banner removed; rely on global message only
    } catch (e) {
      console.error('[AI 全量归类] 失败:', e);
      this.showMessage(e?.message || 'AI 归类失败', 'error');
      // inline status banner removed; rely on global message only
    } finally {
      if (btn) {
        // 恢复按钮状态与文本
        btn.classList.remove('is-loading');
        btn.style.pointerEvents = '';
        btn.removeAttribute('aria-busy');
        btn.innerHTML = original;
      }
    }
  }

  // 展示整理预览并进行二次确认（移植自插件弹窗，适配设置页）
  async showOrganizePreviewDialog(preview = {}) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      const summaryText = window.I18n && window.I18n.tf
        ? window.I18n.tf('preview.summary', { total: preview.total, classified: preview.classified })
        : `共 ${preview.total} 个书签，拟分类 ${preview.classified} 个，其余将归入“其他”（如存在）。`;
      const expandText = window.I18n ? (window.I18n.t('preview.expand') || '展开全部') : '展开全部';
      const collapseText = window.I18n ? (window.I18n.t('preview.collapse') || '收起') : '收起';
      const clickHint = window.I18n ? (window.I18n.t('preview.clickHint') || '点击书签切换分类') : '点击书签切换分类';
      let categoryNames = Object.keys(preview.categories || {});

      const categoriesHtml = Object.entries(preview.categories || {})
        .filter(([, data]) => data && data.count > 0)
        .map(([name, data]) => {
          const threshold = 10;
          const collapsedClass = (data.bookmarks || []).length > threshold ? 'collapsed' : '';
          const displayName = (window.I18n && window.I18n.translateCategoryByName)
            ? window.I18n.translateCategoryByName(name)
            : name;
          const listItems = (data.bookmarks || []).map(b => {
            const safeTitle = this.escapeHtml(b.title || b.url || '');
            const safeUrl = this.escapeHtml(b.url || '#');
            return `<li class="list-item" data-id="${this.escapeHtml(String(b.id))}" data-current="${this.escapeHtml(name)}"><a href="${safeUrl}">${safeTitle}</a></li>`;
          }).join('');
          return `
            <div class="category-block" data-cat-name="${this.escapeHtml(name)}">
              <div class="category-header">
                <span class="category-name">${displayName}</span>
                <div class="header-actions">
                  <button class="btn btn-sm btn-outline toggle-btn" data-state="${collapsedClass ? 'collapsed' : 'expanded'}">${collapsedClass ? expandText : collapseText}</button>
                  <span class="category-count">(${data.count})</span>
                </div>
              </div>
              <ul class="list ${collapsedClass}" style="margin-top:8px;">${listItems}</ul>
            </div>
          `;
        }).join('');

      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">${window.I18n ? (window.I18n.t('preview.title') || '整理预览与确认') : '整理预览与确认'}</h3>
            <button class="modal-close" id="previewClose">×</button>
          </div>
          <div class="modal-body">
            <div class="preview-summary">${summaryText}</div>
            <div class="info-banner">${clickHint}</div>
            <div id="previewCategories" class="preview-categories">${categoriesHtml}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="previewCancel">${window.I18n ? (window.I18n.t('preview.cancel') || '取消') : '取消'}</button>
            <button class="btn btn-primary" id="previewConfirm">${window.I18n ? (window.I18n.t('preview.confirm') || '确认整理') : '确认整理'}</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      // 显示弹窗（与统一确认弹窗保持一致）
      modal.style.display = 'flex';
      // 选项页CSS默认对.modal-overlay设置了opacity:0/visibility:hidden，需要添加show类
      setTimeout(() => modal.classList.add('show'), 10);

      // 绑定展开/收起事件
      const updateToggleText = (btn, isCollapsed) => {
        btn.textContent = isCollapsed ? expandText : collapseText;
        btn.dataset.state = isCollapsed ? 'collapsed' : 'expanded';
      };
      // 使用事件委托，避免个别按钮未成功绑定
      modal.addEventListener('click', (e) => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        const block = btn.closest('.category-block');
        const list = block && block.querySelector('.list');
        if (!list) return;
        const isCollapsed = list.classList.toggle('collapsed');
        updateToggleText(btn, isCollapsed);
      });

      // 分类选择器：点击书签打开选择框，切换分类而不是跳转
      const categoriesContainer = modal.querySelector('#previewCategories');
      const rebuildSummary = () => {
        const summaryEl = modal.querySelector('.preview-summary');
        if (summaryEl) {
          const text = window.I18n
            ? window.I18n.tf('preview.summary', { total: preview.total, classified: preview.classified })
            : `共 ${preview.total} 个书签，拟分类 ${preview.classified} 个，其余将归入“其他”（如存在）。`;
          summaryEl.textContent = text;
        }
      };
      const updateBadge = (catName) => {
        const count = (preview.categories[catName]?.count || 0);
        const el = categoriesContainer.querySelector(`.category-block[data-cat-name="${CSS.escape(catName)}"] .category-count`);
        if (el) el.textContent = `(${count})`;
      };
      const ensureCategorySection = (catName) => {
        if (categoriesContainer.querySelector(`.category-block[data-cat-name="${CSS.escape(catName)}"]`)) return;
        const translatedName = window.I18n && window.I18n.translateCategoryByName ? window.I18n.translateCategoryByName(catName) : catName;
        const div = document.createElement('div');
        div.className = 'category-block';
        div.setAttribute('data-cat-name', catName);
        div.innerHTML = `
          <div class="category-header">
            <span class="category-name">${this.escapeHtml(translatedName)}</span>
            <div class="header-actions">
              <button class="btn btn-sm btn-outline toggle-btn" data-state="expanded">${collapseText}</button>
              <span class="category-count">(0)</span>
            </div>
          </div>
          <ul class="list"></ul>
        `;
        categoriesContainer.appendChild(div);
      };
      const openPicker = (li) => {
        const id = li.getAttribute('data-id');
        const oldCat = li.getAttribute('data-current');
        const rect = li.getBoundingClientRect();
        const pop = document.createElement('div');
        pop.className = 'picker-dialog';
        const width = 300;
        const top = Math.min(window.innerHeight - 200, rect.bottom + 8);
        const left = Math.min(window.innerWidth - width - 16, rect.left);
        const optionsHtml = categoryNames
          .map(cat => {
            const tname = window.I18n && window.I18n.translateCategoryByName ? window.I18n.translateCategoryByName(cat) : cat;
            return `<option value="${this.escapeHtml(cat)}" ${cat === oldCat ? 'selected' : ''}>${this.escapeHtml(tname)}</option>`;
          })
          .join('') + `<option value="__new__">${window.I18n ? (window.I18n.t('preview.addCategory') || '新增分类…') : '新增分类…'}</option>`;
        pop.innerHTML = `
          <div class="modal-header" style="padding: 10px 12px;">
            <h3 class="modal-title" style="font-size:14px;">${window.I18n ? (window.I18n.t('preview.pickCategory') || '选择分类') : '选择分类'}</h3>
            <button class="modal-close picker-close">×</button>
          </div>
          <div class="modal-body" style="padding: 10px 12px;">
            <select class="picker-select" style="width: 100%;">${optionsHtml}</select>
          </div>
          <div class="modal-footer" style="padding: 10px 12px;">
            <button class="btn btn-outline picker-cancel">${window.I18n ? (window.I18n.t('modal.cancel') || '取消') : '取消'}</button>
            <button class="btn btn-primary picker-ok">${window.I18n ? (window.I18n.t('modal.confirm') || '确定') : '确定'}</button>
          </div>
        `;
        pop.style.position = 'fixed';
        pop.style.top = `${top}px`;
        pop.style.left = `${left}px`;
        pop.style.width = `${width}px`;
        pop.style.zIndex = '10001';
        document.body.appendChild(pop);

        const cleanup = () => { if (pop && pop.parentNode) pop.parentNode.removeChild(pop); };
        pop.querySelector('.picker-close')?.addEventListener('click', cleanup);
        pop.querySelector('.picker-cancel')?.addEventListener('click', cleanup);
        pop.querySelector('.picker-ok')?.addEventListener('click', () => {
          const sel = pop.querySelector('.picker-select');
          let newCat = sel ? sel.value : oldCat;
          if (newCat === '__new__') {
            const input = window.prompt(window.I18n ? (window.I18n.t('preview.newCategoryName') || '请输入新分类名') : '请输入新分类名');
            if (!input) { cleanup(); return; }
            newCat = input.trim();
          }
          if (!newCat) { cleanup(); return; }
          if (!preview.categories[newCat]) {
            preview.categories[newCat] = { count: 0, bookmarks: [] };
            categoryNames.push(newCat);
            ensureCategorySection(newCat);
          }
          const detail = (preview.details || []).find(d => String(d.bookmark?.id) === String(id));
          if (!detail) { cleanup(); return; }
          const bookmark = detail.bookmark;
          detail.category = newCat;
          // 更新旧分类
          if (preview.categories[oldCat]) {
            preview.categories[oldCat].bookmarks = (preview.categories[oldCat].bookmarks || []).filter(b => String(b.id) !== String(id));
            preview.categories[oldCat].count = Math.max(0, (preview.categories[oldCat].count || 1) - 1);
          }
          // 更新新分类
          preview.categories[newCat].bookmarks.push(bookmark);
          preview.categories[newCat].count = (preview.categories[newCat].count || 0) + 1;
          // 移动DOM元素
          const oldSection = categoriesContainer.querySelector(`.category-block[data-cat-name="${CSS.escape(oldCat)}"] .list`);
          const newSection = categoriesContainer.querySelector(`.category-block[data-cat-name="${CSS.escape(newCat)}"] .list`);
          if (newSection) newSection.appendChild(li);
          li.setAttribute('data-current', newCat);
          updateBadge(oldCat);
          updateBadge(newCat);
          // 更新摘要：“其他/Others”之间的移动影响“拟分类”计数
          const otherName = (() => {
            if (preview.categories['其他']) return '其他';
            if (preview.categories['Others']) return 'Others';
            return '其他';
          })();
          if (oldCat === otherName && newCat !== otherName) {
            preview.classified = (preview.classified || 0) + 1;
          } else if (oldCat !== otherName && newCat === otherName) {
            preview.classified = Math.max(0, (preview.classified || 0) - 1);
          }
          rebuildSummary();
          cleanup();
        });
      };
      // 拦截书签点击，打开选择器
      modal.addEventListener('click', (e) => {
        const a = e.target.closest('.list-item a');
        if (!a) return;
        e.preventDefault();
        const li = a.closest('.list-item');
        if (!li) return;
        openPicker(li);
      });

      const cleanup = () => {
        modal.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => {
          if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
        }, 200);
      };

      modal.querySelector('#previewCancel').addEventListener('click', () => { cleanup(); resolve(false); });
      modal.querySelector('#previewClose').addEventListener('click', () => { cleanup(); resolve(false); });
      modal.querySelector('#previewConfirm').addEventListener('click', () => { cleanup(); resolve(true); });
    });
  }

  // 在“整理”标签内渲染预览内容（替代弹窗）
  renderOrganizePreview(preview) {
    const container = document.getElementById('organizePreview');
    if (!container) return;

    const DEBUG_OPTIONS_PREVIEW = true;
    const debug = (...args) => { if (DEBUG_OPTIONS_PREVIEW) console.log('[OptionsPreview]', ...args); };

    const summaryText = window.I18n && window.I18n.tf
      ? window.I18n.tf('preview.summary', { total: preview.total, classified: preview.classified })
      : `共 ${preview.total} 个书签，拟分类 ${preview.classified} 个，其余将归入“其他”（如存在）。`;
    const expandText = window.I18n ? (window.I18n.t('preview.expand') || '展开全部') : '展开全部';
    const collapseText = window.I18n ? (window.I18n.t('preview.collapse') || '收起') : '收起';
    const clickHint = window.I18n ? (window.I18n.t('preview.clickHint') || '点击书签切换分类') : '点击书签切换分类';
    const confirmText = window.I18n ? (window.I18n.t('preview.confirm') || '确认整理') : '确认整理';
    const cancelText = window.I18n ? (window.I18n.t('preview.cancel') || '取消') : '取消';

    const categoryNames = Object.keys(preview.categories || {});
    const categoriesHtml = Object.entries(preview.categories || {})
      .filter(([, data]) => data && data.count > 0)
      .map(([name, data]) => {
        const displayName = (window.I18n && window.I18n.translateCategoryByName)
          ? window.I18n.translateCategoryByName(name)
          : name;
        const listItems = (data.bookmarks || []).map(b => {
          const safeTitle = this.escapeHtml(b.title || b.url || '');
          const safeUrl = this.escapeHtml(b.url || '#');
          return `<li class="list-item" data-id="${this.escapeHtml(String(b.id))}" data-current="${this.escapeHtml(name)}"><a href="${safeUrl}">${safeTitle}</a></li>`;
        }).join('');
        return `
          <div class="category-block" data-cat-name="${this.escapeHtml(name)}">
            <div class="category-header">
              <span class="category-name">${displayName}</span>
              <div class="header-actions">
                <span class="category-count">(${data.count})</span>
              </div>
            </div>
            <ul class="list" style="margin-top:8px;">${listItems}</ul>
          </div>
        `;
      }).join('');

    container.innerHTML = `
      <div class="preview-summary">${summaryText}</div>
      <div class="info-banner">${clickHint}</div>
      <div id="previewCategories" class="preview-categories">${categoriesHtml}</div>
      <div class="inline-actions" style="margin-top:12px; display:flex; gap:8px;">
        <button class="btn btn-outline" id="inlineCancel">${cancelText}</button>
        <button class="btn btn-primary" id="inlineConfirm">${confirmText}</button>
      </div>
    `;

    // 选择器 + 确认/取消：事件委托（只绑定一次，避免重复）
    if (!container.dataset.bound) {
      container.addEventListener('click', (e) => {
        // 拦截书签点击，打开选择器
        const a = e.target.closest('.list-item a');
        if (a) {
          e.preventDefault();
          const li = a.closest('.list-item');
          if (li) openPicker(li);
          return;
        }
        // Inline 取消
        const cancelBtn = e.target.closest('#inlineCancel');
        if (cancelBtn) {
          container.innerHTML = '';
          this.organizePreviewPlan = null;
          return;
        }
        // Inline 确认
        const confirmBtn = e.target.closest('#inlineConfirm');
        if (confirmBtn) {
          (async () => {
            const setStatus = (text, type = 'success') => {
              this.showMessage(text, type);
            };
            try {
              // 整理前进行一次备份确认
              const backupFirst = await this.showBackupConfirmDialog();
              if (backupFirst) {
                await this.backupBookmarks();
                // 给予下载对话框时间弹出
                await new Promise(resolve => setTimeout(resolve, 800));
              }
              setStatus('执行整理中...', 'success');
              // 确认时携带元信息（仅整理范围）
              const last = this._lastOrganizeParams || {};
              const planToRun = {
                ...preview,
                meta: { ...(preview.meta || {}), scopeFolderIds: Array.isArray(last.scopeFolderIds) ? last.scopeFolderIds : [] }
              };
              const runResponse = await chrome.runtime.sendMessage({ action: 'organizeByPlan', plan: planToRun });
              if (!runResponse?.success) throw new Error(runResponse?.error || '整理失败');
              setStatus('整理完成', 'success');
              container.innerHTML = '';
              this.organizePreviewPlan = null;
            } catch (err) {
              console.error('[InlineConfirm] 整理失败:', err);
              setStatus(`失败：${err?.message || err}`, 'error');
            }
          })();
          return;
        }
      });
      container.dataset.bound = '1';
    }

    // 分类选择：点击书签打开选择器（避免捕获过期容器引用，始终获取当前容器）
    const getCategoriesContainer = () => container.querySelector('#previewCategories');
    const rebuildSummary = () => {
      const summaryEl = container.querySelector('.preview-summary');
      if (summaryEl) {
        const text = window.I18n
          ? window.I18n.tf('preview.summary', { total: preview.total, classified: preview.classified })
          : `共 ${preview.total} 个书签，拟分类 ${preview.classified} 个，其余将归入“其他”（如存在）。`;
        summaryEl.textContent = text;
      }
    };
    const esc = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["'\\]/g, '\\$&'));
    const updateBadge = (catName) => {
      const cc = getCategoriesContainer();
      if (!cc) { debug('updateBadge skipped, container missing:', catName); return; }
      const count = (preview.categories[catName]?.count || 0);
      const el = cc.querySelector(`.category-block[data-cat-name="${esc(catName)}"] .category-count`);
      if (el) el.textContent = `(${count})`;
      debug('updateBadge:', catName, '=>', count);
    };
    const ensureCategorySection = (catName) => {
      const cc = getCategoriesContainer();
      if (!cc) { debug('ensureCategorySection skipped, container missing:', catName); return; }
      if (cc.querySelector(`.category-block[data-cat-name="${esc(catName)}"]`)) { debug('ensureCategorySection exists:', catName); return; }
      const translatedName = window.I18n && window.I18n.translateCategoryByName ? window.I18n.translateCategoryByName(catName) : catName;
      const div = document.createElement('div');
      div.className = 'category-block';
      div.setAttribute('data-cat-name', catName);
      div.innerHTML = `
        <div class="category-header">
          <span class="category-name">${this.escapeHtml(translatedName)}</span>
          <div class="header-actions">
            <span class="category-count">(0)</span>
          </div>
        </div>
        <ul class="list"></ul>
      `;
      cc.appendChild(div);
      debug('ensureCategorySection created:', catName);
    };
    const findBookmarkInPreview = (id) => {
      for (const [cat, data] of Object.entries(preview.categories || {})) {
        const list = data?.bookmarks || [];
        const bm = list.find(b => String(b.id) === String(id));
        if (bm) return { bookmark: bm, cat };
      }
      return null;
    };
    const openPicker = (li) => {
      const id = li.getAttribute('data-id');
      const oldCat = li.getAttribute('data-current');
      debug('openPicker for id:', id, 'oldCat:', oldCat);
      const rect = li.getBoundingClientRect();
      const pop = document.createElement('div');
      pop.className = 'picker-dialog';
      const width = 300;
      const top = Math.min(window.innerHeight - 200, rect.bottom + 8);
      const left = Math.min(window.innerWidth - width - 16, rect.left);
      const optionsHtml = categoryNames
        .map(cat => {
          const tname = window.I18n && window.I18n.translateCategoryByName ? window.I18n.translateCategoryByName(cat) : cat;
          return `<option value="${this.escapeHtml(cat)}" ${cat === oldCat ? 'selected' : ''}>${this.escapeHtml(tname)}</option>`;
        })
        .join('') + `<option value="__new__">${window.I18n ? (window.I18n.t('preview.addCategory') || '新增分类…') : '新增分类…'}</option>`;
      pop.innerHTML = `
        <div class="modal-header" style="padding: 10px 12px;">
          <h3 class="modal-title" style="font-size:14px;">${window.I18n ? (window.I18n.t('preview.pickCategory') || '选择分类') : '选择分类'}</h3>
          <button class="modal-close picker-close">×</button>
        </div>
        <div class="modal-body" style="padding: 10px 12px;">
          <select class="picker-select" style="width: 100%;">${optionsHtml}</select>
        </div>
        <div class="modal-footer" style="padding: 10px 12px;">
          <button class="btn btn-outline picker-cancel">${cancelText}</button>
          <button class="btn btn-primary picker-ok">${confirmText}</button>
        </div>
      `;
      pop.style.position = 'fixed';
      pop.style.top = `${top}px`;
      pop.style.left = `${left}px`;
      pop.style.width = `${width}px`;
      pop.style.zIndex = '10001';
      document.body.appendChild(pop);

      const cleanup = () => { if (pop && pop.parentNode) pop.parentNode.removeChild(pop); };
      pop.querySelector('.picker-close')?.addEventListener('click', cleanup);
      pop.querySelector('.picker-cancel')?.addEventListener('click', cleanup);
      pop.querySelector('.picker-ok')?.addEventListener('click', () => {
        const sel = pop.querySelector('.picker-select');
        let newCat = sel ? sel.value : oldCat;
        debug('apply click, selected newCat:', newCat);
        if (newCat === '__new__') {
          const input = window.prompt(window.I18n ? (window.I18n.t('preview.newCategoryName') || '请输入新分类名') : '请输入新分类名');
          if (!input) { cleanup(); return; }
          newCat = input.trim();
        }
        if (!newCat) { cleanup(); return; }
        if (newCat === oldCat) { cleanup(); return; }
        if (!preview.categories[newCat]) {
          preview.categories[newCat] = { count: 0, bookmarks: [] };
          categoryNames.push(newCat);
          ensureCategorySection(newCat);
          debug('new category created in data:', newCat);
        }
        let bookmark = null;
        let originCat = oldCat;
        const detail = (preview.details || []).find(d => String(d.bookmark?.id) === String(id));
        debug('detail found:', !!detail, 'detail.category:', detail?.category);
        if (detail && detail.bookmark) {
          bookmark = detail.bookmark;
          originCat = detail.category || oldCat;
          detail.category = newCat;
        } else {
          const found = findBookmarkInPreview(id);
          debug('findBookmarkInPreview result:', found ? { cat: found.cat } : null);
          if (!found) { cleanup(); return; }
          bookmark = found.bookmark;
          originCat = found.cat || oldCat;
        }
        debug('originCat:', originCat, '-> newCat:', newCat);
        // 更新旧分类
        const beforeOld = preview.categories[originCat]?.count || 0;
        const beforeNew = preview.categories[newCat]?.count || 0;
        if (preview.categories[originCat]) {
          preview.categories[originCat].bookmarks = (preview.categories[originCat].bookmarks || []).filter(b => String(b.id) !== String(id));
          preview.categories[originCat].count = Math.max(0, (preview.categories[originCat].count || 1) - 1);
        }
        // 更新新分类
        preview.categories[newCat].bookmarks.push(bookmark);
        preview.categories[newCat].count = (preview.categories[newCat].count || 0) + 1;
        debug('counts changed:', originCat, beforeOld, '->', preview.categories[originCat]?.count || 0, '|', newCat, beforeNew, '->', preview.categories[newCat]?.count || 0);
        // 移动DOM元素（使用最新容器，避免在重新渲染后追加到过期节点）
        const cc = getCategoriesContainer();
        if (!cc) { debug('move skipped, container missing'); cleanup(); return; }
        // 如果目标分类区块不存在（可能因初始渲染过滤 count=0），先创建
        if (!cc.querySelector(`.category-block[data-cat-name="${esc(newCat)}"]`)) {
          ensureCategorySection(newCat);
        }
        const oldSection = cc.querySelector(`.category-block[data-cat-name="${esc(originCat)}"] .list`);
        const newSection = cc.querySelector(`.category-block[data-cat-name="${esc(newCat)}"] .list`);
        debug('sections exist:', { old: !!oldSection, new: !!newSection });
        if (newSection) newSection.appendChild(li);
        li.setAttribute('data-current', newCat);
        debug('li moved and data-current set to:', newCat);
        updateBadge(originCat);
        updateBadge(newCat);
        // 若旧分类计数为0，与初始渲染规则保持一致，移除该分类区块
        const originItem = cc.querySelector(`.category-block[data-cat-name="${esc(originCat)}"]`);
        if (originItem && ((preview.categories[originCat]?.count || 0) === 0)) {
          originItem.parentNode && originItem.parentNode.removeChild(originItem);
          debug('origin category section removed due to zero count:', originCat);
        }
        // 更新摘要：“其他/Others”之间的移动影响“拟分类”计数
        const otherName = (() => {
          if (preview.categories['其他']) return '其他';
          if (preview.categories['Others']) return 'Others';
          return '其他';
        })();
        if (originCat === otherName && newCat !== otherName) {
          preview.classified = (preview.classified || 0) + 1;
        } else if (originCat !== otherName && newCat === otherName) {
          preview.classified = Math.max(0, (preview.classified || 0) - 1);
        }
        rebuildSummary();
        debug('rebuildSummary classified:', preview.classified);
        cleanup();
      });
    };
    // 其余逻辑由事件委托处理
  }

  // 弹出整理参数选择弹窗（范围/目标父目录），返回 { scopeFolderIds } 或 null
  async showOrganizeParamsDialog() {
    const title = window.I18n ? (window.I18n.t('organize.confirm.title') || '确认整理参数') : '确认整理参数';
    const scopeLabel = window.I18n ? (window.I18n.t('organize.scope.label') || '整理范围') : '整理范围';
    const allText = window.I18n ? (window.I18n.t('organize.scope.option.all') || '全部书签') : '全部书签';

    let folders = [];
    try { folders = await this.getAllFolderPaths(); } catch (e) { console.warn('加载文件夹列表失败', e); }

    // 打开时不进行任何默认勾选
    const preselected = [];
    const buildOptions = () => {
      const items = [];
      for (const f of folders) {
        const inputId = `dlgScope_${this.escapeHtml(String(f.id))}`;
        items.push(`
          <label for="${inputId}" style="display:block;margin:6px 0;cursor:pointer;color:#374151;">
            <input id="${inputId}" type="checkbox" value="${this.escapeHtml(String(f.id))}" style="margin-right:8px;vertical-align:middle;"/>
            <span style="vertical-align:middle;">${this.escapeHtml(f.path)}</span>
          </label>`);
      }
      return items.join('');
    };

    const messageHtml = `
      <div style="width:100%;">
        <div style="display:block;margin-bottom:8px;">
          <span style="font-weight:600;color:#111827;">${this.escapeHtml(scopeLabel)}（可多选，留空表示全部）</span>
          <div style="margin:6px 0 10px;color:#6B7280;font-size:12px;">
            勾选需要整理的范围；不勾选表示整理全部书签。
          </div>
          <div id="dlgScopes" style="width:100%;max-height:320px;overflow:auto;border:1px solid #E5E7EB;border-radius:8px;padding:8px;box-sizing:border-box;">
            ${buildOptions()}
          </div>
        </div>
      </div>`;

    const okText = window.I18n ? (window.I18n.t('modal.confirm') || '确定') : '确定';
    const cancelText = window.I18n ? (window.I18n.t('modal.cancel') || '取消') : '取消';
    // 显示通用确认弹窗
    const confirmed = await this.showConfirmDialog({ title, message: messageHtml, okText, cancelText });
    if (!confirmed) return null;
    const dlgScopes = document.getElementById('dlgScopes');
    const scopeFolderIds = dlgScopes ? Array.from(dlgScopes.querySelectorAll('input[type="checkbox"]:checked')).map(i => String(i.value)).filter(Boolean) : [];
    // 同步设置以便下次默认（保持旧字段兼容）
    this.settings.organizeScopeFolderIds = scopeFolderIds;
    this.settings.organizeScopeFolderId = scopeFolderIds[0] || '';
    try { await this.saveSettings(); } catch (e) {}
    this._lastOrganizeParams = { scopeFolderIds };
    return { scopeFolderIds };
  }

  // 备份书签（生成 Chrome 兼容书签 HTML 并触发下载）
  async backupBookmarks() {
    try {
      const btn = document.getElementById('quickBackupBtn');
      const original = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading" style="margin:0;vertical-align:middle"></span> 备份中...';
      }

      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const bookmarkTree = await chrome.bookmarks.getTree();
        const htmlContent = this.generateChromeBookmarkHTML(bookmarkTree);
        const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const filename = `bookmarks_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.html`;
        await chrome.downloads.download({ url, filename, saveAs: true });
        URL.revokeObjectURL(url);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

    this.showMessage((window.I18n ? window.I18n.t('backup.export.success') : '备份导出成功'), 'success');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    } catch (error) {
      console.error('备份失败:', error);
    this.showMessage((window.I18n ? window.I18n.t('backup.export.fail') : '备份失败，请重试'), 'error');
      const btn = document.getElementById('quickBackupBtn');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '💾 备份书签';
      }
    }
  }

  generateChromeBookmarkHTML(bookmarkTree) {
    const timestamp = Math.floor(Date.now() / 1000);
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>

<DL><p>
`;

    if (bookmarkTree && bookmarkTree.length > 0) {
      const rootNode = bookmarkTree[0];
      if (rootNode.children) {
        for (const child of rootNode.children) {
          html += this.processBookmarkNode(child, 1, timestamp);
        }
      }
    }

    html += `</DL><p>
`;
    return html;
  }

  processBookmarkNode(node, depth, defaultTimestamp) {
    const indent = '    '.repeat(depth);
    let html = '';

    if (node.children) {
      const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : defaultTimestamp;
      const lastModified = node.dateGroupModified ? Math.floor(node.dateGroupModified / 1000) : defaultTimestamp;
      html += `${indent}<DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}">${this.escapeHtml(node.title || '未命名文件夹')}</H3>\n`;
      html += `${indent}<DL><p>\n`;
      for (const child of node.children) {
        html += this.processBookmarkNode(child, depth + 1, defaultTimestamp);
      }
      html += `${indent}</DL><p>\n`;
    } else if (node.url) {
      const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : defaultTimestamp;
      const icon = node.icon || '';
      html += `${indent}<DT><A HREF="${this.escapeHtml(node.url)}" ADD_DATE="${addDate}"`;
      if (icon) {
        html += ` ICON_URI="${this.escapeHtml(icon)}"`;
      }
      html += `>${this.escapeHtml(node.title || node.url)}</A>\n`;
    }

    return html;
  }

  // 二次备份确认对话框（统一弹窗样式）
  async showBackupConfirmDialog() {
    const title = window.I18n ? (window.I18n.t('organize.backup.title') || window.I18n.t('organize.before') || '开始整理前') : '开始整理前';
    const message = window.I18n
      ? (window.I18n.t('organize.backup.messageHtml') || window.I18n.t('organize.backup.message') || '建议在整理前先备份书签，以防数据丢失。<br>是否要先备份书签？')
      : '建议在整理前先备份书签，以防数据丢失。<br>是否要先备份书签？';
    const okText = window.I18n ? (window.I18n.t('organize.backup.ok') || window.I18n.t('modal.confirm') || '先备份') : '先备份';
    const cancelText = window.I18n ? (window.I18n.t('organize.backup.skip') || window.I18n.t('modal.cancel') || '跳过备份') : '跳过备份';
    const ok = await this.showConfirmDialog({ title, message, okText, cancelText });
    return !!ok;
  }

  // 切换标签
  switchTab(tabName) {
    this.currentTab = tabName;

    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabName);
    });
  }

  // 渲染UI
  renderUI() {
    this.updateClassificationRules();
    this.updateAiConfig();
    this.updateWidgetConfig();
    this.updateSyncConfig();
  }

  // 更新分类规则
  updateClassificationRules() {
    const container = document.getElementById('rulesList');
    const emptyState = document.getElementById('rulesEmpty');
    
    if (!container) return;
    
    container.innerHTML = '';

    if (this.classificationRules.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      container.style.display = 'none';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      container.style.display = 'block';
      
      this.classificationRules.forEach((rule, index) => {
        const ruleElement = this.createRuleElement(rule, index);
        container.appendChild(ruleElement);
      });
    }
  }

  // 创建规则元素
  createRuleElement(rule, index) {
    const div = document.createElement('div');
    div.className = 'rule-item';
    const nameTranslated = (window.I18n && window.I18n.translateCategoryByName)
      ? window.I18n.translateCategoryByName(rule.category)
      : rule.category;
    const tEdit = window.I18n ? (window.I18n.t('common.edit') || '编辑') : '编辑';
    const tDelete = window.I18n ? (window.I18n.t('common.delete') || '删除') : '删除';
    const tKeywordsLabel = window.I18n ? (window.I18n.t('modal.rule.keywords.label') || '关键词') : '关键词';
    const tEditTitle = window.I18n ? (window.I18n.t('rules.edit') || '编辑规则') : '编辑规则';
    const tDeleteTitle = window.I18n ? (window.I18n.t('rules.delete') || '删除规则') : '删除规则';
    div.innerHTML = `
      <div class="rule-content">
        <div class="rule-header">
          <h3 class="rule-category">${nameTranslated}</h3>
          <div class="rule-actions">
            <button class="btn btn-sm btn-outline edit-rule-btn" title="${tEditTitle}">
              <span class="icon">✏️</span>
              ${tEdit}
            </button>
            <button class="btn btn-sm btn-outline btn-danger delete-rule-btn" title="${tDeleteTitle}">
              <span class="icon">🗑️</span>
              ${tDelete}
            </button>
          </div>
        </div>
        <div class="rule-keywords">
          <span class="keywords-label">${tKeywordsLabel}：</span>
          <div class="keywords-list">
            ${rule.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
    
    // 绑定事件
    const editBtn = div.querySelector('.edit-rule-btn');
    const deleteBtn = div.querySelector('.delete-rule-btn');
    
    editBtn.addEventListener('click', () => this.editRule(index));
    deleteBtn.addEventListener('click', () => this.deleteRule(index));
    
    return div;
  }

  // 更新默认分类预览
  updateDefaultCategories() {
    const container = document.getElementById('defaultCategories');
    if (!container) return;
    
    const defaultRules = this.getDefaultRules();
    
    container.innerHTML = defaultRules.map(rule => {
      const nameTranslated = (window.I18n && window.I18n.translateCategoryByName)
        ? window.I18n.translateCategoryByName(rule.category)
        : rule.category;
      return `
      <div class="category-preview">
        <span class="category-name">${nameTranslated}</span>
        <span class="keywords">${rule.keywords.join(', ')}</span>
      </div>
    `;
    }).join('');
  }

  // 更新AI配置
  updateAiConfig() {
    const aiProvider = document.getElementById('aiProvider');
    const aiApiKey = document.getElementById('apiKey');
    const aiApiUrl = document.getElementById('apiEndpoint');
    const aiModel = document.getElementById('aiModel');
    const maxTokensInput = document.getElementById('maxTokens');
    const aiBatchSizeInput = document.getElementById('aiBatchSize');
    const aiConcurrencyInput = document.getElementById('aiConcurrency');
    const classificationLanguage = document.getElementById('classificationLanguage');
    const enableAI = document.getElementById('enableAI');

    if (aiProvider) aiProvider.value = this.settings.aiProvider || 'openai';
    if (aiApiKey) aiApiKey.value = this.settings.aiApiKey || '';
    if (aiApiUrl) {
      const defaultUrl = this.getDefaultApiUrl(this.settings.aiProvider);
      if (!this.settings.aiApiUrl) {
        this.settings.aiApiUrl = defaultUrl || '';
      }
      aiApiUrl.value = this.settings.aiApiUrl || '';
      aiApiUrl.placeholder = defaultUrl || '';
    }
    if (aiModel) aiModel.value = this.settings.aiModel || '';
    if (maxTokensInput) maxTokensInput.value = (this.settings.maxTokens ?? 8192);
    if (aiBatchSizeInput) aiBatchSizeInput.value = (this.settings.aiBatchSize ?? 120);
    if (aiConcurrencyInput) aiConcurrencyInput.value = (this.settings.aiConcurrency ?? 3);
    if (classificationLanguage) classificationLanguage.value = this.settings.classificationLanguage || 'auto';
    if (enableAI) enableAI.checked = !!this.settings.enableAI;

    // 提示词模板回显
    const aiPromptOrganizeEl = document.getElementById('aiPromptOrganize');
    if (aiPromptOrganizeEl) aiPromptOrganizeEl.value = this.settings.aiPromptOrganize || '';
    const aiPromptInferEl = document.getElementById('aiPromptInfer');
    if (aiPromptInferEl) aiPromptInferEl.value = this.settings.aiPromptInfer || '';

    // 显示 API URL 输入
    const urlGroup = document.querySelector('.ai-url-group');
    if (urlGroup) {
      urlGroup.style.display = 'block';
    }
    // 更新模型选项
    this.updateModelOptions();
  }

  // 更新导航页组件配置
  updateWidgetConfig() {
    const weatherEnabled = document.getElementById('weatherEnabled');
    const weatherCity = document.getElementById('weatherCity');
    if (weatherEnabled) weatherEnabled.checked = !!this.settings.weatherEnabled;
    if (weatherCity) weatherCity.value = this.settings.weatherCity || '';
    const wallpaperEnabled = document.getElementById('wallpaperEnabled');
    if (wallpaperEnabled) {
      wallpaperEnabled.checked = this.settings.wallpaperEnabled !== undefined
        ? !!this.settings.wallpaperEnabled
        : true; // 默认开启
    }
    const sixtySecondsEnabled = document.getElementById('sixtySecondsEnabled');
    if (sixtySecondsEnabled) sixtySecondsEnabled.checked = !!this.settings.sixtySecondsEnabled;

    // 非聚焦透明度回显（分离）
    const searchOpacity = document.getElementById('searchUnfocusedOpacity');
    const searchOpacityValue = document.getElementById('searchUnfocusedOpacityValue');
    if (searchOpacity) searchOpacity.value = String(this.settings.searchUnfocusedOpacity || 0.86);
    if (searchOpacityValue) searchOpacityValue.textContent = Number(this.settings.searchUnfocusedOpacity || 0.86).toFixed(2);

    const bookmarksOpacity = document.getElementById('bookmarksUnfocusedOpacity');
    const bookmarksOpacityValue = document.getElementById('bookmarksUnfocusedOpacityValue');
    if (bookmarksOpacity) bookmarksOpacity.value = String(this.settings.bookmarksUnfocusedOpacity || 0.86);
    if (bookmarksOpacityValue) bookmarksOpacityValue.textContent = Number(this.settings.bookmarksUnfocusedOpacity || 0.86).toFixed(2);

    const sixtyOpacity = document.getElementById('sixtyUnfocusedOpacity');
    const sixtyOpacityValue = document.getElementById('sixtyUnfocusedOpacityValue');
    if (sixtyOpacity) sixtyOpacity.value = String(this.settings.sixtyUnfocusedOpacity || 0.86);
    if (sixtyOpacityValue) sixtyOpacityValue.textContent = Number(this.settings.sixtyUnfocusedOpacity || 0.86).toFixed(2);

    const topVisitedOpacity = document.getElementById('topVisitedUnfocusedOpacity');
    const topVisitedOpacityValue = document.getElementById('topVisitedUnfocusedOpacityValue');
    if (topVisitedOpacity) topVisitedOpacity.value = String(this.settings.topVisitedUnfocusedOpacity || 0.86);
    if (topVisitedOpacityValue) topVisitedOpacityValue.textContent = Number(this.settings.topVisitedUnfocusedOpacity || 0.86).toFixed(2);

    // 书签列表是否展示回显
    const showBookmarks = document.getElementById('showBookmarks');
    if (showBookmarks) showBookmarks.checked = !!this.settings.showBookmarks;

    // 热门栏目回显
    const navShowTopVisited = document.getElementById('navShowTopVisited');
    const navTopVisitedCount = document.getElementById('navTopVisitedCount');
    if (navShowTopVisited) navShowTopVisited.checked = !!this.settings.navShowTopVisited;
    if (navTopVisitedCount) navTopVisitedCount.value = String(this.settings.navTopVisitedCount ?? 10);

    // 自动归档旧书签回显
    const autoArchive = document.getElementById('autoArchiveOldBookmarks');
    const archiveDays = document.getElementById('archiveOlderThanDays');
    if (autoArchive) autoArchive.checked = !!this.settings.autoArchiveOldBookmarks;
    if (archiveDays) archiveDays.value = String(this.settings.archiveOlderThanDays ?? 180);
  }

  // 更新同步与导出配置
  updateSyncConfig() {
    const tokenInput = document.getElementById('githubToken');
    const ownerInput = document.getElementById('githubOwner');
    const repoInput = document.getElementById('githubRepo');
    const formatSelect = document.getElementById('githubFormat');
    const dualUploadCheckbox = document.getElementById('githubDualUpload');
    const formatLabel = document.querySelector('label[for="githubFormat"]');
    const pathHintEl = document.getElementById('githubPathHint');
    const autoDaily = document.getElementById('githubAutoSyncDaily');
    const autoOnPopup = document.getElementById('githubAutoSyncOnPopup');
    const statusEl = document.getElementById('githubSyncStatus');
    const configStatusEl = document.getElementById('githubConfigStatus');

    if (tokenInput) tokenInput.value = this.settings.githubToken || '';
    if (ownerInput) ownerInput.value = this.settings.githubOwner || '';
    if (repoInput) repoInput.value = this.settings.githubRepo || '';
    if (formatSelect) formatSelect.value = this.settings.githubFormat || 'json';
    if (dualUploadCheckbox) dualUploadCheckbox.checked = !!this.settings.githubDualUpload;
    if (autoDaily) autoDaily.checked = !!this.settings.githubAutoSyncDaily;
    // 已移除 autoOnPopup 选项

    // 配置页快速同步默认提供商与状态
    const configCloudProvider = document.getElementById('configCloudProvider');
    if (configCloudProvider) {
      const mainSel = document.getElementById('cloudProvider');
      configCloudProvider.value = mainSel ? mainSel.value : 'webdav';
    }
    const configQuickStatus = document.getElementById('configSyncStatus');
    if (configQuickStatus && !configQuickStatus.textContent) {
      configQuickStatus.textContent = '尚未同步';
    }

    // WebDAV 值回显
    const webdavUrlInput = document.getElementById('webdavUrl');
    const webdavUsernameInput = document.getElementById('webdavUsername');
    const webdavPasswordInput = document.getElementById('webdavPassword');
    const webdavPathInput = document.getElementById('webdavPath');
    const webdavFormatSelect = document.getElementById('webdavFormat');
    const webdavDualUploadCheckbox = document.getElementById('webdavDualUpload');
    const webdavFormatLabel = document.querySelector('label[for="webdavFormat"]');
    const webdavAutoDaily = document.getElementById('webdavAutoSyncDaily');
    if (webdavUrlInput) webdavUrlInput.value = this.settings.webdavUrl || '';
    if (webdavUsernameInput) webdavUsernameInput.value = this.settings.webdavUsername || '';
    if (webdavPasswordInput) webdavPasswordInput.value = this.settings.webdavPassword || '';
    if (webdavPathInput) webdavPathInput.value = this.settings.webdavPath || '';
    if (webdavFormatSelect) webdavFormatSelect.value = this.settings.webdavFormat || 'json';
    if (webdavDualUploadCheckbox) webdavDualUploadCheckbox.checked = !!this.settings.webdavDualUpload;
    if (webdavAutoDaily) webdavAutoDaily.checked = !!this.settings.webdavAutoSyncDaily;

    // Google Drive 值回显
    const gdriveTokenInput = document.getElementById('gdriveToken');
    const gdriveFolderIdInput = document.getElementById('gdriveFolderId');
    const gdriveBaseNameInput = document.getElementById('gdriveBaseName');
    const gdriveFormatSelect = document.getElementById('gdriveFormat');
    const gdriveDualUploadCheckbox = document.getElementById('gdriveDualUpload');
    const gdriveFormatLabel = document.querySelector('label[for="gdriveFormat"]');
    if (gdriveTokenInput) gdriveTokenInput.value = this.settings.gdriveToken || '';
    if (gdriveFolderIdInput) gdriveFolderIdInput.value = this.settings.gdriveFolderId || '';
    if (gdriveBaseNameInput) gdriveBaseNameInput.value = this.settings.gdriveBaseName || 'tidymark-backup';
    if (gdriveFormatSelect) gdriveFormatSelect.value = this.settings.gdriveFormat || 'json';
    if (gdriveDualUploadCheckbox) gdriveDualUploadCheckbox.checked = !!this.settings.gdriveDualUpload;

    // 勾选双格式时隐藏备份格式选择器
    const showFormat = !this.settings.githubDualUpload;
    if (formatSelect) formatSelect.style.display = showFormat ? '' : 'none';
    if (formatLabel) formatLabel.style.display = showFormat ? '' : 'none';

    const showWebdavFormat = !this.settings.webdavDualUpload;
    if (webdavFormatSelect) webdavFormatSelect.style.display = showWebdavFormat ? '' : 'none';
    if (webdavFormatLabel) webdavFormatLabel.style.display = showWebdavFormat ? '' : 'none';

    const showGdriveFormat = !this.settings.gdriveDualUpload;
    if (gdriveFormatSelect) gdriveFormatSelect.style.display = showGdriveFormat ? '' : 'none';
    if (gdriveFormatLabel) gdriveFormatLabel.style.display = showGdriveFormat ? '' : 'none';

    // 动态路径提示
    if (pathHintEl) {
      const owner = (this.settings.githubOwner || '').trim();
      const repo = (this.settings.githubRepo || '').trim();
      const branch = (this.settings.githubBranch || 'main').trim();
      const jsonPath = this.settings.githubPath || 'tidymark/backups/tidymark-backup.json';
      const htmlPath = this.settings.githubPathHtml || 'tidymark/backups/tidymark-bookmarks.html';
      let hint = '';
      if (!owner || !repo) {
        hint = `请设置仓库所有者与仓库名，例如 owner/repo。默认分支为 \`${branch}\`；JSON 路径 \`${jsonPath}\`，HTML 路径 \`${htmlPath}\`。`;
      } else if (this.settings.githubDualUpload) {
        hint = `将上传到 \`${owner}/${repo}\` 的 \`${branch}\` 分支：JSON -> \`${jsonPath}\`；HTML -> \`${htmlPath}\`。`;
      } else {
        const curFmt = this.settings.githubFormat === 'html' ? 'HTML' : 'JSON';
        const curPath = this.settings.githubFormat === 'html' ? htmlPath : jsonPath;
        hint = `将上传到 \`${owner}/${repo}\` 的 \`${branch}\` 分支：${curFmt} -> \`${curPath}\`。`;
      }
      pathHintEl.textContent = hint;
    }

    if (statusEl) {
      try {
        statusEl.textContent = window.I18n ? (window.I18n.t('sync.github.status.idle') || '尚未同步') : '尚未同步';
      } catch {
        statusEl.textContent = '尚未同步';
      }
    }
  }

  // 每日首次打开自动同步（设置页）
  async _maybeRunDailyAutoSync() {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // GitHub 自动同步
      if (this.settings.githubAutoSyncDaily) {
        const owner = (this.settings.githubOwner || '').trim();
        const repo = (this.settings.githubRepo || '').trim();
        const token = (this.settings.githubToken || '').trim();
        if (owner && repo && token) {
          if (this.settings.githubLastAutoSyncDate !== todayStr) {
            this.settings.githubLastAutoSyncDate = todayStr;
            await this.saveSettings();
            this.syncToGithub();
            return; // 当天触发一次即可
          }
        }
      }

      // WebDAV 自动同步
      if (this.settings.webdavAutoSyncDaily) {
        const baseUrl = (this.settings.webdavUrl || '').trim();
        const username = (this.settings.webdavUsername || '').trim();
        const password = (this.settings.webdavPassword || '').trim();
        const targetPath = (this.settings.webdavPath || '').trim();
        if (baseUrl && username && password && targetPath) {
          if (this.settings.webdavLastAutoSyncDate !== todayStr) {
            this.settings.webdavLastAutoSyncDate = todayStr;
            await this.saveSettings();
            this.syncToCloud('webdav');
            return;
          }
        }
      }
    } catch (e) {
      console.warn('每日自动同步尝试失败', e);
    }
  }

  // 获取默认规则
  getDefaultRules() {
    const lang = (window.I18n && window.I18n.getLanguageSync) ? window.I18n.getLanguageSync() : 'zh-CN';
    if (window.DefaultRules && window.DefaultRules.get) {
      return window.DefaultRules.get(lang);
    }
    // 兜底：仍使用简体中文默认集
    return [
      { category: '开源与代码托管', keywords: ['github', 'gitlab', 'gitee', 'bitbucket', 'source code', 'repository', 'repo'] },
      { category: '开发文档与API', keywords: ['docs', 'documentation', 'api', 'sdk', 'developer', 'developers', 'reference', '文档', '接口'] },
      { category: '前端框架', keywords: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'vite', 'webpack', 'babel', 'preact', 'solidjs', 'ember'] },
      { category: '后端框架', keywords: ['spring', 'springboot', 'django', 'flask', 'fastapi', 'express', 'koa', 'rails', 'laravel', 'nestjs', 'micronaut', 'quarkus', 'fastify', 'hapi', 'gin', 'asp.net', 'dotnet', 'phoenix'] },
      { category: '云服务与DevOps', keywords: ['aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'k8s', 'docker', 'ci', 'cd', 'devops', 'terraform', 'cloudflare', 'vercel', 'netlify', 'digitalocean', 'heroku', 'render', 'linode', 'railway'] },
      { category: '数据库与数据', keywords: ['mysql', 'postgres', 'mongodb', 'redis', 'sqlite', 'elasticsearch', 'clickhouse', 'snowflake', 'data', '数据库', 'mariadb', 'oracle', 'sql server', 'mssql', 'dynamodb', 'bigquery', 'firestore', 'cassandra'] }
    ];
  }

  // 扫描失效书签
  async scanDeadBookmarks({ progressEl, listEl, containerEl, scanBtn }) {
    try {
      // 运行前按需请求主机权限（缩短审核用时，避免默认授予 <all_urls>）
      const ok = await (async function ensureDeadScanPermissions() {
        try {
          if (typeof chrome === 'undefined' || !chrome.permissions || !chrome.permissions.contains) {
            return true; // 非扩展环境或不支持权限API时跳过
          }
          const origins = ["<all_urls>"];
          const has = await new Promise(resolve => {
            try { chrome.permissions.contains({ origins }, resolve); } catch (_) { resolve(false); }
          });
          if (has) return true;
          const granted = await new Promise(resolve => {
            try { chrome.permissions.request({ origins }, resolve); } catch (_) { resolve(false); }
          });
          return !!granted;
        } catch (e) {
          console.warn('请求扫描权限失败', e);
          return false;
        }
      })();
      if (!ok) {
        if (scanBtn) {
          scanBtn.disabled = false;
          // 回退按钮文本（若前面已变更）
          try { scanBtn.textContent = (scanBtn.textContent || '').replace(/正在检测\.\.\./, window.I18n ? window.I18n.t('dead.scan.start') : '开始检测'); } catch {}
        }
        this.showMessage(window.I18n ? window.I18n.t('dead.scan.fail') : '需要授权以检测书签可达性，请在提示中允许或稍后在设置中启用', 'error');
        return;
      }

      if (!listEl || !containerEl || !scanBtn) return;
      containerEl.hidden = true;
      listEl.innerHTML = '';
      scanBtn.disabled = true;
      const originalText = scanBtn.textContent;
      scanBtn.innerHTML = `<span class="loading"></span> ${window.I18n.t('dead.scan.running')}`;

      // 获取所有书签
      const bookmarks = this.settings.deadScanFolderId
        ? await this.getBookmarksInFolder(this.settings.deadScanFolderId)
        : await this.getAllBookmarks();
      const targets = bookmarks.filter(b => {
        if (!this.isHttpUrl(b.url)) return false;
        if (this.settings.deadIgnorePrivateIp && this._isPrivateOrLocalHost(b.url)) return false;
        return true;
      });
      const total = targets.length;
      let done = 0;
      const dead = [];
      // 计算重复项（按 URL 简化规则分组）
      let duplicateGroups = [];
      if (this.settings.deadScanDuplicates) {
        const normalize = (u) => {
          try {
            const urlObj = new URL(u);
            let href = urlObj.href.trim();
            // 去除 http(s) 结尾斜杠
            if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
              if (href.endsWith('/')) href = href.slice(0, -1);
            }
            return href;
          } catch { return (u || '').trim(); }
        };
        const map = new Map();
        for (const b of bookmarks) {
          const key = normalize(b.url);
          if (!key) continue;
          const arr = map.get(key) || [];
          arr.push(b);
          map.set(key, arr);
        }
        duplicateGroups = Array.from(map.values()).filter(arr => arr.length > 1);
      }
      if (progressEl) progressEl.textContent = `0 / ${total}`;

      const concurrency = 6;
      let idx = 0;
      const worker = async () => {
        while (idx < total) {
          const current = idx++;
          const b = targets[current];
          try {
            const status = await this.checkUrlAlive(b.url, {
              strict: !!this.settings.deadStrictMode,
              timeoutMs: this.settings.deadTimeoutMs || 8000,
              avoidPopups: true
            });
            if (!status.ok) {
              dead.push({ id: b.id, title: b.title, url: b.url, status: status.statusText });
            }
          } catch (e) {
            dead.push({ id: b.id, title: b.title, url: b.url, status: '网络错误' });
          } finally {
            done++;
            if (progressEl) progressEl.textContent = `${done} / ${total}`;
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));

      // 将重复项加入结果（仅展示一条代表项，批量携带所有ID）
      if (this.settings.deadScanDuplicates && duplicateGroups.length > 0) {
        for (const group of duplicateGroups) {
          const rep = group[0];
          const ids = group.map(x => x.id);
          dead.push({ id: rep.id, title: rep.title, url: rep.url, status: `重复 ${ids.length}`, ids });
        }
      }

      // 渲染结果
      if (dead.length === 0) {
        containerEl.hidden = false;
        listEl.innerHTML = `<li class="list-item"><span class="title">${window.I18n.t('dead.none')}</span></li>`;
      } else {
        containerEl.hidden = false;
        listEl.innerHTML = dead.map(d => `
          <li class="list-item" data-id="${d.id}">
            <input type="checkbox" data-id="${d.id}" ${d.ids ? `data-ids="${d.ids.join(',')}"` : ''} aria-label="${window.I18n ? window.I18n.t('dead.checkbox') : '选择'}">
            <div class="info">
              <div class="title">${this.escapeHtml(d.title || d.url)}</div>
              <div class="url">${this.escapeHtml(d.url)}</div>
            </div>
            <div class="status">${this.escapeHtml(d.status || (window.I18n ? window.I18n.t('dead.status.unreachable') : '不可达'))}</div>
          </li>
        `).join('');
      }
    } catch (e) {
      console.error('扫描失效书签失败', e);
      this.showMessage(window.I18n.t('dead.scan.fail'), 'error');
    } finally {
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.textContent = window.I18n.t('dead.scan.start');
      }
    }
  }

  // 查找或创建“失效书签”文件夹（跨语言名称）
  async findOrCreateDeadFolder() {
    const names = this.getDeadFolderNames();
    // 优先使用当前语言名称
    const preferred = window.I18n ? window.I18n.t('dead.folder') : names[0];
    const candidates = Array.from(new Set([preferred, ...names]));
    // 搜索现有文件夹
    for (const title of candidates) {
      try {
        // API为字符串查询；返回标题或URL包含该字符串的节点
        const results = await chrome.bookmarks.search(String(title));
        const folder = results.find(item => !item.url && item.title === title);
        if (folder) return folder;
      } catch {}
    }
    // 未找到则创建到书签栏（默认 parentId= '1'）
    try {
      const folder = await chrome.bookmarks.create({ title: preferred, parentId: '1' });
      return folder;
    } catch (e) {
      // 创建失败，尝试无 parentId（浏览器默认位置）
      const folder = await chrome.bookmarks.create({ title: preferred });
      return folder;
    }
  }

  // 提供跨语言的候选名称，避免语言切换后找不到原文件夹
  getDeadFolderNames() {
    return ['失效书签', '失效書籤', 'Dead Links', 'Недействительные ссылки'];
  }

  // 工具：获取全部书签（扁平化）
  async getAllBookmarks() {
    const list = [];
    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const tree = await chrome.bookmarks.getTree();
        const stack = [...tree];
        while (stack.length) {
          const node = stack.pop();
          if (!node) continue;
          if (node.children && Array.isArray(node.children)) {
            stack.push(...node.children);
          }
          if (node.url) {
            list.push({ id: node.id, title: node.title, url: node.url });
          }
        }
      }
    } catch (e) {
      console.warn('获取书签失败', e);
    }
    return list;
  }

  // 工具：获取指定文件夹下的书签（扁平化）
  async getBookmarksInFolder(folderId) {
    const list = [];
    if (!folderId) return this.getAllBookmarks();
    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const subtrees = await chrome.bookmarks.getSubTree(String(folderId));
        const stack = [...subtrees];
        while (stack.length) {
          const node = stack.pop();
          if (!node) continue;
          if (node.children && Array.isArray(node.children)) {
            stack.push(...node.children);
          }
          if (node.url) {
            list.push({ id: node.id, title: node.title, url: node.url });
          }
        }
      }
    } catch (e) {
      console.warn('获取指定文件夹书签失败', e);
    }
    return list;
  }

  // 工具：获取全部文件夹路径列表（用于下拉选择）
  async getAllFolderPaths() {
    const folders = [];
    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const tree = await chrome.bookmarks.getTree();
        const stack = tree.map(n => ({ node: n, path: '' }));
        while (stack.length) {
          const { node, path } = stack.pop();
          if (!node) continue;
          const children = node.children || [];
          for (const child of children) {
            const childPath = child.title ? (path ? `${path}/${child.title}` : child.title) : path;
            // 如果是文件夹（无URL），收集为候选
            if (!child.url) {
              if (child.title) {
                folders.push({ id: child.id, title: child.title, path: childPath });
              }
            }
            // 继续遍历其子节点
            if (child.children && Array.isArray(child.children)) {
              stack.push({ node: child, path: childPath });
            }
          }
        }
      }
    } catch (e) {
      console.warn('获取文件夹路径失败', e);
    }
    // 排序：按路径字典序
    folders.sort((a, b) => a.path.localeCompare(b.path));
    return folders;
  }

  // 工具：是否 http/https URL
  isHttpUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // 工具：是否私有或本地主机地址（用于忽略内网 IP）
  _isPrivateOrLocalHost(url) {
    try {
      const u = new URL(url);
      const host = (u.hostname || '').toLowerCase();
      if (!host) return false;
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return true;
      // IPv4 私有与保留网段
      const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (m) {
        const a = parseInt(m[1], 10);
        const b = parseInt(m[2], 10);
        // 10.0.0.0/8
        if (a === 10) return true;
        // 172.16.0.0/12
        if (a === 172 && b >= 16 && b <= 31) return true;
        // 192.168.0.0/16
        if (a === 192 && b === 168) return true;
        // 127.0.0.0/8 loopback
        if (a === 127) return true;
        // 169.254.0.0/16 link-local
        if (a === 169 && b === 254) return true;
        // 100.64.0.0/10 carrier-grade NAT
        if (a === 100 && b >= 64 && b <= 127) return true;
      }
      // IPv6 ULA fc00::/7、链路本地 fe80::/10
      if (host.includes(':')) {
        if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80') || host === '::1') return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // 检查URL可达性（带超时与回退）
  async checkUrlAlive(url, { timeoutMs = 8000, avoidPopups = true, strict = false } = {}) {
    // 缓存：相同 URL 重复检测时直接返回
    if (this._urlCheckCache && this._urlCheckCache.has(url)) {
      return this._urlCheckCache.get(url);
    }
    // 主机级节流：降低并发对同一域名的压力
    await this._throttleHost(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const opts = avoidPopups
        ? { method: 'HEAD', mode: 'cors', redirect: 'manual', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal }
        : { method: 'HEAD', mode: 'cors', redirect: 'follow', cache: 'no-store', signal: controller.signal };
      const res = await fetch(url, opts);
      clearTimeout(timer);
      // 如果不跟随重定向，出现 opaqueredirect 视为站点可达（避免跳转到登录页）
      if (res.type === 'opaqueredirect') {
        const result = { ok: true, status: 0, statusText: 'redirect' };
        this._urlCheckCache.set(url, result);
        return result;
      }
      if (res.ok) {
        const result = { ok: true, status: res.status, statusText: String(res.status) };
        this._urlCheckCache.set(url, result);
        return result;
      }
      // 认证类状态码视为“可达但受限”
      if (res.status === 401 || res.status === 403) {
        const result = { ok: true, status: res.status, statusText: String(res.status) };
        this._urlCheckCache.set(url, result);
        return result;
      }
      // 常见瞬时错误统一视为可达以降低误报（与 LazyCat 的“尽量避免误判”思路一致）
      const transientStatuses = new Set([408, 425, 429, 502, 503, 504, 520, 522, 524]);
      if (transientStatuses.has(res.status)) {
        const result = { ok: true, status: res.status, statusText: String(res.status) };
        this._urlCheckCache.set(url, result);
        return result;
      }
      // 方法不允许/未实现：可能阻断 HEAD，回退到 GET（no-cors）以确认网络连通
      if (res.status === 405 || res.status === 501) {
        try {
          const resNc = await fetch(url, { method: 'GET', mode: 'no-cors', redirect: 'follow', credentials: 'omit', cache: 'no-store' });
          // 成功返回即视为可达；opaque 无法读状态但说明网络连通
          const result = { ok: true, status: 0, statusText: 'opaque' };
          this._urlCheckCache.set(url, result);
          return result;
        } catch {}
      }
      // 严格模式：对非明确 404/410/5xx 的非OK结果再做一次 no-cors GET 以降低误报
      if (strict && res.status !== 404 && res.status !== 410 && !(res.status >= 500)) {
        try {
          await fetch(url, { method: 'GET', mode: 'no-cors', redirect: 'follow', credentials: 'omit', cache: 'no-store' });
          const result = { ok: true, status: 0, statusText: 'opaque' };
          this._urlCheckCache.set(url, result);
          return result;
        } catch {}
      }
      // 在安全模式下，不回退到 GET，避免页面执行或弹窗；非安全模式才尝试 GET
      if (!avoidPopups) {
        const result = await this.checkUrlAliveGet(url, { timeoutMs: Math.max(4000, timeoutMs - 2000) });
        this._urlCheckCache.set(url, result);
        return result;
      }
      const result = { ok: false, status: res.status, statusText: String(res.status || '不可访问') };
      this._urlCheckCache.set(url, result);
      return result;
    } catch (e) {
      clearTimeout(timer);
      // 在安全模式下尝试 no-cors 的 HEAD 以获得不透明响应，若成功则视为可达
      if (avoidPopups) {
        try {
          const res2 = await fetch(url, { method: 'HEAD', mode: 'no-cors', redirect: 'manual', credentials: 'omit', cache: 'no-store' });
          // 成功返回即视为可达（opaque 无法读状态，但不触发弹窗）
          const result = { ok: true, status: 0, statusText: 'opaque' };
          this._urlCheckCache.set(url, result);
          return result;
        } catch (e2) {
          // 尝试 GET no-cors 作为进一步连通性确认
          try {
            await fetch(url, { method: 'GET', mode: 'no-cors', redirect: 'follow', credentials: 'omit', cache: 'no-store' });
            const result = { ok: true, status: 0, statusText: 'opaque' };
            this._urlCheckCache.set(url, result);
            return result;
          } catch (e3) {}
          const result = { ok: false, status: 0, statusText: '网络错误或超时' };
          this._urlCheckCache.set(url, result);
          return result;
        }
      }
      // 非安全模式：作为回退 GET
      try {
        const result = await this.checkUrlAliveGet(url, { timeoutMs: Math.max(4000, timeoutMs - 2000) });
        this._urlCheckCache.set(url, result);
        return result;
      } catch (e3) {
        const result = { ok: false, status: 0, statusText: '网络错误或超时' };
        this._urlCheckCache.set(url, result);
        return result;
      }
    }
  }

  async checkUrlAliveGet(url, { timeoutMs = 5000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      // 认证类状态码视为“可达但受限”
      if (res.ok || res.status === 401 || res.status === 403) {
        return { ok: true, status: res.status, statusText: String(res.status) };
      }
      return { ok: false, status: res.status, statusText: String(res.status) };
    } catch (e) {
      clearTimeout(timer);
      // 回退到 no-cors：成功返回即视为可达（opaque）
      try {
        await fetch(url, { method: 'GET', mode: 'no-cors', redirect: 'follow', credentials: 'omit', cache: 'no-store' });
        return { ok: true, status: 0, statusText: 'opaque' };
      } catch (e2) {
        throw e2;
      }
    }
  }

  // 主机级简单节流：同一 host 的请求至少间隔 _hostSpacingMs 毫秒
  async _throttleHost(url) {
    try {
      const host = new URL(url).host;
      const now = Date.now();
      const last = this._hostLastTime[host] || 0;
      const wait = Math.max(this._hostSpacingMs - (now - last), 0);
      if (wait > 0) {
        await new Promise(r => setTimeout(r, wait));
      }
      this._hostLastTime[host] = Date.now();
    } catch {}
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  

  // 显示规则对话框
  showRuleDialog(rule = null, index = -1) {
    const modal = document.getElementById('ruleModal');
    const modalTitle = document.getElementById('modalTitle');
    const categoryInput = document.getElementById('categoryInput');
    const keywordsInput = document.getElementById('keywordsInput');
    const keywordsPreview = document.getElementById('keywordsPreview');
    const keywordsTags = document.getElementById('keywordsTags');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');

    // 设置弹框标题和初始值
    if (rule) {
      modalTitle.textContent = window.I18n ? (window.I18n.t('rules.edit') || '编辑分类规则') : '编辑分类规则';
      categoryInput.value = rule.category;
      keywordsInput.value = rule.keywords.join(', ');
    } else {
      modalTitle.textContent = window.I18n ? (window.I18n.t('modal.rule.title') || '添加分类规则') : '添加分类规则';
      categoryInput.value = '';
      keywordsInput.value = '';
    }

    // 更新关键词预览
    const updateKeywordsPreview = () => {
      const keywords = keywordsInput.value.split(',').map(k => k.trim()).filter(k => k);
      if (keywords.length > 0) {
        keywordsPreview.style.display = 'block';
        keywordsTags.innerHTML = keywords.map(keyword => 
          `<span class="keyword-tag">${keyword}</span>`
        ).join('');
      } else {
        keywordsPreview.style.display = 'none';
      }
    };

    // 绑定关键词输入事件
    keywordsInput.addEventListener('input', updateKeywordsPreview);
    
    // 初始化预览
    updateKeywordsPreview();

    // 显示弹框
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    
    // 聚焦到分类名称输入框
    setTimeout(() => categoryInput.focus(), 100);

    // 关闭弹框函数
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        keywordsInput.removeEventListener('input', updateKeywordsPreview);
      }, 300);
    };

    // 确认保存函数
    const confirmSave = () => {
      const newCategory = categoryInput.value.trim();
      const newKeywords = keywordsInput.value.split(',').map(k => k.trim()).filter(k => k);

      if (!newCategory) {
        categoryInput.focus();
        categoryInput.style.borderColor = '#ef4444';
        setTimeout(() => categoryInput.style.borderColor = '', 2000);
        return;
      }

      if (newKeywords.length === 0) {
        keywordsInput.focus();
        keywordsInput.style.borderColor = '#ef4444';
        setTimeout(() => keywordsInput.style.borderColor = '', 2000);
        return;
      }

      const ruleData = {
        category: newCategory,
        keywords: newKeywords
      };

      if (index >= 0) {
        this.classificationRules[index] = ruleData;
      } else {
        this.classificationRules.push(ruleData);
      }

      this.settings.classificationRules = this.classificationRules;
      this.saveSettings();
      this.updateClassificationRules();
      
      closeModal();
    this.showMessage(index >= 0 ? (window.I18n ? window.I18n.t('rules.update.success') : '规则已更新') : (window.I18n ? window.I18n.t('rules.add.success') : '规则已添加'), 'success');
    };

    // 绑定事件
    modalClose.onclick = closeModal;
    modalCancel.onclick = closeModal;
    modalConfirm.onclick = confirmSave;

    // 点击遮罩关闭
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };

    // 键盘事件
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        confirmSave();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    
    // 清理事件监听器
    const originalCloseModal = closeModal;
    closeModal = () => {
      document.removeEventListener('keydown', handleKeydown);
      originalCloseModal();
    };
  }

  // 编辑规则
  editRule(index) {
    const rule = this.classificationRules[index];
    this.showRuleDialog(rule, index);
  }

  // 删除规则
  async deleteRule(index) {
    const ok = await this.showConfirmDialog({
      title: window.I18n ? (window.I18n.t('rules.delete') || '删除规则') : '删除规则',
      message: '确定要删除这个分类规则吗？',
      okText: window.I18n ? (window.I18n.t('modal.confirm') || '确定') : '确定',
      cancelText: window.I18n ? (window.I18n.t('modal.cancel') || '取消') : '取消'
    });
    if (ok) {
      this.classificationRules.splice(index, 1);
      this.settings.classificationRules = this.classificationRules;
      this.saveSettings();
      this.updateClassificationRules();
    }
  }

  // 重置为默认规则
  async resetToDefaultRules() {
    const ok = await this.showConfirmDialog({
      title: window.I18n ? (window.I18n.t('rules.reset') || '重置规则') : '重置规则',
      message: '确定要重置为默认分类规则吗？这将覆盖所有现有规则。',
      okText: window.I18n ? (window.I18n.t('modal.confirm') || '确定') : '确定',
      cancelText: window.I18n ? (window.I18n.t('modal.cancel') || '取消') : '取消'
    });
    if (ok) {
      this.classificationRules = this.getDefaultRules();
      this.settings.classificationRules = this.classificationRules;
      this.saveSettings();
      this.updateClassificationRules();
    this.showMessage((window.I18n ? window.I18n.t('rules.reset.success') : '已重置为默认规则'), 'success');
    }
  }

  // 测试AI连接
  async testAiConnection() {
    const testBtn = document.getElementById('testAiConnection');
    const resultSpan = document.getElementById('testResult');
    
    testBtn.disabled = true;
    testBtn.innerHTML = '<span class="loading"></span> 测试中...';
    resultSpan.textContent = '';

    try {
      const { aiProvider, aiApiKey, aiApiUrl, aiModel } = this.settings;
      const p = String(aiProvider || '').toLowerCase();
      if (p === 'ollama') {
        if (!aiApiUrl || !aiModel) {
          throw new Error('请填写 API 端点，并选择模型');
        }
      } else {
        if (!aiApiKey || !aiApiUrl || !aiModel) {
          throw new Error('请填写 API Key、API 端点，并选择模型');
        }
      }

      // 优先调用 /v1/models 进行低成本验证
      const testUrl = this.getTestUrl(aiApiUrl, aiProvider);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const headers = {
        'Content-Type': 'application/json'
      };
      if (p !== 'ollama' && aiApiKey) {
        headers['Authorization'] = `Bearer ${aiApiKey}`;
      }

      let res;
      try {
        // 如果是 /models 测试端点，使用 GET；否则使用 POST 进行最小开销的 Ping
        if (p === 'ollama') {
          // Ollama：优先 GET /api/tags；否则 POST /api/chat
          if (testUrl.endsWith('/api/tags')) {
            res = await fetch(testUrl, { method: 'GET', headers, signal: controller.signal });
          } else {
            const body = JSON.stringify(this.buildTestPayload(aiProvider, aiModel));
            res = await fetch(aiApiUrl, { method: 'POST', headers, body, signal: controller.signal });
          }
        } else {
          // OpenAI/DeepSeek：/v1/models 用 GET；否则 POST /chat/completions
          if (testUrl.endsWith('/models')) {
            res = await fetch(testUrl, { method: 'GET', headers, signal: controller.signal });
          } else {
            const body = JSON.stringify(this.buildTestPayload(aiProvider, aiModel));
            res = await fetch(aiApiUrl, { method: 'POST', headers, body, signal: controller.signal });
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      if (!res || !res.ok) {
        let msg = res ? `${res.status} ${res.statusText}` : '网络错误或超时';
        try {
          const data = await res.json();
          const errMsg = (data && (data.error?.message || data.message)) || '';
          if (errMsg) msg += `: ${errMsg}`;
        } catch {}
        throw new Error(msg);
      }

      // 简单检查响应结构
      try {
        const data = await res.json();
        const looksOk = Array.isArray(data?.data) || Array.isArray(data?.choices);
        if (!looksOk) {
          throw new Error('响应格式不符合预期');
        }
      } catch (e) {
        // 有的返回没有 body（如 204），也视作成功
      }

      resultSpan.textContent = '连接成功';
      resultSpan.className = 'test-result success';
    } catch (error) {
      resultSpan.textContent = `连接失败: ${error.message}`;
      resultSpan.className = 'test-result error';
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = '测试连接';
    }
  }

  // 导出备份
  async exportBackup() {
    try {
      // 获取所有书签
      const bookmarks = await chrome.bookmarks.getTree();
      
      // 获取设置
      const settings = await chrome.storage.sync.get();
      
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        bookmarks: bookmarks,
        settings: settings
      };

      // 创建下载链接
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tidymark-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
    this.showMessage((window.I18n ? window.I18n.t('backup.export.success') : '备份导出成功'), 'success');
    } catch (error) {
    console.error((window.I18n ? window.I18n.t('backup.export.fail.short') : '导出备份失败') + ':', error);
    this.showMessage((window.I18n ? window.I18n.t('backup.export.fail.short') : '导出备份失败'), 'error');
    }
  }

  // 导入备份
  importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);
        
        if (!backupData.version || !backupData.bookmarks) {
          throw new Error('无效的备份文件格式');
        }

        const ok = await this.showConfirmDialog({
          title: '导入备份',
          message: '导入备份将覆盖当前所有书签和设置，确定要继续吗？',
          okText: window.I18n ? (window.I18n.t('modal.confirm') || '确定') : '确定',
          cancelText: window.I18n ? (window.I18n.t('modal.cancel') || '取消') : '取消'
        });
        if (ok) {
          // 这里应该实现实际的导入逻辑
          // 由于Chrome扩展API的限制，实际实现会更复杂
    this.showMessage((window.I18n ? window.I18n.t('backup.import.dev') : '备份导入功能正在开发中'), 'info');
        }
      } catch (error) {
    console.error((window.I18n ? window.I18n.t('backup.import.fail') : '导入备份失败') + ':', error);
    this.showMessage((window.I18n ? window.I18n.tf('backup.import.fail', { error: error.message }) : ('导入备份失败: ' + error.message)), 'error');
      }
    };
    
    input.click();
  }

  // 重置设置
  async resetSettings() {
    const ok = await this.showConfirmDialog({
      title: '重置设置',
      message: '确定要重置所有设置吗？这将恢复默认配置。',
      okText: window.I18n ? (window.I18n.t('modal.confirm') || '确定') : '确定',
      cancelText: window.I18n ? (window.I18n.t('modal.cancel') || '取消') : '取消'
    });
    if (ok) {
      chrome.storage.sync.clear(() => {
        location.reload();
      });
    }
  }

  // 通用云同步方法
  async syncToCloud(provider) {
    const statusEl = document.getElementById('cloudSyncStatus');
    const providerStatusEl = document.getElementById(`${provider}SyncStatus`);
    const configPageStatusEl = document.getElementById('configSyncStatus');
    const setStatus = (text) => { 
      if (statusEl) statusEl.textContent = text; 
      if (providerStatusEl) providerStatusEl.textContent = text;
      if (configPageStatusEl) configPageStatusEl.textContent = text;
    };

    try {
      setStatus('正在同步...');

      // 获取对应提供商的配置
      const config = this.getCloudProviderConfig(provider);
      if (!config) {
        const msg = `请先配置 ${provider.toUpperCase()} 同步参数`;
        this.showMessage(msg, 'error');
        setStatus('配置不完整');
        return;
      }

      // 针对 WebDAV：在同步前请求域名权限（MV3 运行时权限）
      if (provider === 'webdav') {
        try {
          const originPattern = new URL(config.baseUrl).origin + '/*';
          const granted = await chrome.permissions.contains({ origins: [originPattern] });
          if (!granted) {
            await chrome.permissions.request({ origins: [originPattern] });
          }
        } catch (permErr) {
          console.warn('[CloudSync] 请求运行时权限失败:', permErr);
        }
      }

      // 发送同步请求到后台脚本
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'syncCloudBackup',
          payload: { provider, config }
        }, resolve);
      });

      if (response && response.success) {
        const msg = response.message || '同步成功';
        this.showMessage(msg, 'success');
        setStatus('同步成功');
      } else {
        const error = response?.error || '同步失败';
        this.showMessage(error, 'error');
        setStatus('同步失败');
      }
    } catch (error) {
      console.error('[CloudSync] 同步异常:', error);
      this.showMessage('同步过程中发生异常', 'error');
      setStatus('同步异常');
    }
  }

  // 获取云提供商配置
  getCloudProviderConfig(provider) {
    switch (provider) {
      case 'github':
        const token = (this.settings.githubToken || '').trim();
        const owner = (this.settings.githubOwner || '').trim();
        const repo = (this.settings.githubRepo || '').trim();
        if (!token || !owner || !repo) return null;
        return {
          token,
          owner,
          repo,
          format: this.settings.githubFormat || 'json',
          dualUpload: !!this.settings.githubDualUpload
        };
      
      case 'webdav':
        const webdavUrl = (this.settings.webdavUrl || '').trim();
        const webdavUsername = (this.settings.webdavUsername || '').trim();
        const webdavPassword = (this.settings.webdavPassword || '').trim();
        if (!webdavUrl || !webdavUsername || !webdavPassword) return null;
        return {
          baseUrl: webdavUrl,
          username: webdavUsername,
          password: webdavPassword,
          targetPath: this.settings.webdavPath || 'tidymark/backups',
          format: this.settings.webdavFormat || 'json',
          dualUpload: !!this.settings.webdavDualUpload
        };
      
      case 'gdrive':
      case 'googledrive':
        const gdriveToken = (this.settings.gdriveToken || '').trim();
        const gdriveFolderId = (this.settings.gdriveFolderId || '').trim();
        const gdriveBaseName = (this.settings.gdriveBaseName || 'tidymark-backup');
        const gdriveFormat = (this.settings.gdriveFormat || 'json');
        if (!gdriveToken) return null;
        return {
          accessToken: gdriveToken,
          folderId: gdriveFolderId || 'root',
          baseName: gdriveBaseName,
          format: gdriveFormat,
          dualUpload: !!this.settings.gdriveDualUpload
        };
      
      default:
        return null;
    }
  }

  // 触发 GitHub 同步
  async syncToGithub() {
    const statusEl = document.getElementById('githubSyncStatus');
    const cloudStatusEl = document.getElementById('cloudSyncStatus');
    const setStatus = (text) => { 
      if (statusEl) statusEl.textContent = text; 
      if (cloudStatusEl) cloudStatusEl.textContent = text;
    };

    const token = (this.settings.githubToken || '').trim();
    const owner = (this.settings.githubOwner || '').trim();
    const repo = (this.settings.githubRepo || '').trim();
    const format = (this.settings.githubFormat || 'json');
    const dualUpload = !!this.settings.githubDualUpload;

    if (!token || !owner || !repo) {
    this.showMessage((window.I18n ? window.I18n.t('sync.github.config.incomplete') : '请填写完整的 GitHub 配置'), 'error');
      setStatus('配置不完整');
      return;
    }

    setStatus('正在同步到 GitHub...');
    try {
      console.log('[Options] 发送 syncGithubBackup 消息：', {
        tokenLen: token.length,
        owner,
        repo,
        format,
        dualUpload
      });
      chrome.runtime.sendMessage({
        action: 'syncGithubBackup',
        payload: { token, owner, repo, format, dualUpload }
      }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.error('[Options] sendMessage 回调 lastError:', chrome.runtime.lastError);
        }
        console.log('[Options] 收到 syncGithubBackup 回调：', response);
        if (response && response.success) {
    this.showMessage((window.I18n ? window.I18n.t('sync.github.done') : '已同步到 GitHub'), 'success');
          setStatus('同步成功');
        } else {
          const errRaw = (response && response.error) ? String(response.error) : '未知错误';
          const friendly = this._formatGithubSyncError(errRaw, { owner, repo });
          this.showMessage(friendly.message, 'error');
          setStatus(friendly.summary);
        }
      });
    } catch (e) {
    this.showMessage((window.I18n ? window.I18n.tf('sync.github.error', { error: e.message }) : ('同步过程中出现异常：' + e.message)), 'error');
      setStatus('同步失败');
    }
  }

  // 触发配置备份上传到 GitHub
  async syncConfigToGithub() {
    const statusEl = document.getElementById('githubConfigStatus');
    const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };

    // 预览/非扩展环境防护
    if (!(window.chrome && chrome.runtime && chrome.runtime.id)) {
      const msg = window.I18n ? (window.I18n.t('sync.github.env.notAvailable') || '当前为预览页面，无法调用扩展后台。请在浏览器扩展环境中操作。') : '当前为预览页面，无法调用扩展后台。请在浏览器扩展环境中操作。';
      this.showMessage(msg, 'warning');
      setStatus(msg);
      return;
    }

    const token = (this.settings.githubToken || '').trim();
    const owner = (this.settings.githubOwner || '').trim();
    const repo = (this.settings.githubRepo || '').trim();

    if (!token || !owner || !repo) {
      this.showMessage((window.I18n ? window.I18n.t('sync.github.config.incomplete') : '请填写完整的 GitHub 配置'), 'error');
      setStatus('配置不完整');
      return;
    }

    setStatus(window.I18n ? (window.I18n.t('sync.github.config.uploading') || '正在备份配置到 GitHub…') : '正在备份配置到 GitHub…');
    try {
      chrome.runtime.sendMessage({
        action: 'syncGithubConfig',
        payload: { token, owner, repo }
      }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.error('[Options] sendMessage 回调 lastError:', chrome.runtime.lastError);
        }
        if (response && response.success) {
          this.showMessage((window.I18n ? (window.I18n.t('sync.github.config.success') || '配置同步成功') : '配置同步成功'), 'success');
          setStatus(window.I18n ? (window.I18n.t('sync.github.config.status.success') || '配置同步成功') : '配置同步成功');
        } else {
          const errRaw = (response && response.error) ? String(response.error) : '未知错误';
          if (/^未知操作/.test(errRaw)) {
            const msg = window.I18n ? (window.I18n.t('sync.github.config.unsupported') || '当前版本或环境不支持配置同步功能，请更新或在扩展环境中重试。') : '当前版本或环境不支持配置同步功能，请更新或在扩展环境中重试。';
            this.showMessage(msg, 'warning');
            setStatus(msg);
            return;
          }
          const friendly = this._formatGithubSyncError(errRaw, { owner, repo });
          this.showMessage((window.I18n ? window.I18n.tf('sync.github.config.fail', { error: friendly.message }) : ('配置同步失败：' + friendly.message)), 'error');
          setStatus((friendly && friendly.summary) ? friendly.summary : (window.I18n ? window.I18n.tf('sync.github.config.fail', { error: errRaw }) : ('配置同步失败：' + errRaw)));
        }
      });
    } catch (e) {
      this.showMessage((window.I18n ? window.I18n.tf('sync.github.config.fail', { error: e.message }) : ('配置同步失败：' + e.message)), 'error');
      setStatus('同步失败');
    }
  }

  // 从 GitHub 拉取配置并导入
  async importConfigFromGithub() {
    const statusEl = document.getElementById('githubConfigStatus');
    const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };

    // 预览/非扩展环境防护
    if (!(window.chrome && chrome.runtime && chrome.runtime.id)) {
      const msg = window.I18n ? (window.I18n.t('sync.github.env.notAvailable') || '当前为预览页面，无法调用扩展后台。请在浏览器扩展环境中操作。') : '当前为预览页面，无法调用扩展后台。请在浏览器扩展环境中操作。';
      this.showMessage(msg, 'warning');
      setStatus(msg);
      return;
    }

    const token = (this.settings.githubToken || '').trim();
    const owner = (this.settings.githubOwner || '').trim();
    const repo = (this.settings.githubRepo || '').trim();

    if (!token || !owner || !repo) {
      this.showMessage((window.I18n ? window.I18n.t('sync.github.config.incomplete') : '请填写完整的 GitHub 配置'), 'error');
      setStatus('配置不完整');
      return;
    }

    setStatus(window.I18n ? (window.I18n.t('sync.github.config.importing') || '正在从 GitHub 同步配置…') : '正在从 GitHub 同步配置…');
    try {
      chrome.runtime.sendMessage({
        action: 'importGithubConfig',
        payload: { token, owner, repo }
      }, (response) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.error('[Options] sendMessage 回调 lastError:', chrome.runtime.lastError);
        }
        if (response && response.success) {
          this.showMessage((window.I18n ? (window.I18n.t('sync.github.config.success') || '配置同步成功') : '配置同步成功'), 'success');
          setStatus(window.I18n ? (window.I18n.t('sync.github.config.status.success') || '配置同步成功') : '配置同步成功');
        } else {
          const errRaw = (response && response.error) ? String(response.error) : '未知错误';
          if (/^未知操作/.test(errRaw)) {
            const msg = window.I18n ? (window.I18n.t('sync.github.config.unsupported') || '当前版本或环境不支持配置同步功能，请更新或在扩展环境中重试。') : '当前版本或环境不支持配置同步功能，请更新或在扩展环境中重试。';
            this.showMessage(msg, 'warning');
            setStatus(msg);
            return;
          }
          const friendly = this._formatGithubSyncError(errRaw, { owner, repo });
          this.showMessage((window.I18n ? window.I18n.tf('sync.github.config.fail', { error: friendly.message }) : ('配置同步失败：' + friendly.message)), 'error');
          setStatus((friendly && friendly.summary) ? friendly.summary : (window.I18n ? window.I18n.tf('sync.github.config.fail', { error: errRaw }) : ('配置同步失败：' + errRaw)));
        }
      });
    } catch (e) {
      this.showMessage((window.I18n ? window.I18n.tf('sync.github.config.fail', { error: e.message }) : ('配置同步失败：' + e.message)), 'error');
      setStatus('同步失败');
    }
  }

  // 显示消息
  showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // 添加样式
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    // 根据类型设置背景色
    const colors = {
      success: '#059669',
      error: '#dc2626',
      info: '#3b82f6',
      warning: '#d97706'
    };
    messageDiv.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
      messageDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 300);
    }, 3000);
  }

  // 将 GitHub 同步错误映射为更友好的提示
  _formatGithubSyncError(errText, { owner, repo } = {}) {
    const clean = String(errText || '').replace(/`/g, '').trim();
    const m = clean.match(/GitHub\s*响应\s*(\d+)/);
    const code = m ? Number(m[1]) : null;
    const is404 = code === 404 || /\b404\b/.test(clean) || /Not\s*Found/i.test(clean);
    const is403 = code === 403 || /\b403\b/.test(clean) || /Forbidden/i.test(clean);
    const is401 = code === 401 || /\b401\b/.test(clean) || /Unauthorized/i.test(clean);
    const is422 = code === 422 || /\b422\b/.test(clean) || /Unprocessable\s*Entity/i.test(clean);
    const is429 = code === 429 || /rate\s*limit/i.test(clean);

    const repoUrl = owner && repo ? `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` : '';

    if (is404) {
      return {
        message: '同步失败：未找到目标（仓库或默认分支未初始化）。',
        summary: '请检查：1) 仓库是否存在且可访问；2) 仓库不是空仓库（需先创建一次提交，如添加 README）；3) 若仓库默认分支不是 main，系统已尝试 master，仍失败请在仓库页面确认默认分支。' + (repoUrl ? ` 仓库：${repoUrl}` : ''),
        code: 404
      };
    }
    if (is403) {
      return {
        message: '同步失败：权限不足（令牌无法写入仓库）。',
        summary: '请在 GitHub 令牌设置中为目标仓库授予“Contents: Read and write”权限，私有仓库需明确授予访问。' + (repoUrl ? ` 仓库：${repoUrl}` : ''),
        code: 403
      };
    }
    if (is401) {
      return {
        message: '同步失败：令牌无效或已过期。',
        summary: '请重新生成并填写有效的个人访问令牌（PAT），确保复制完整且未包含空格。',
        code: 401
      };
    }
    if (is422) {
      return {
        message: '同步失败：请求内容不符合要求。',
        summary: '可能原因：内容编码异常、提交信息缺失或与现有文件冲突。可重试或在仓库中删除冲突文件后再试。',
        code: 422
      };
    }
    if (is429) {
      return {
        message: '同步失败：达到调用速率限制。',
        summary: '请稍后重试或降低操作频率；频繁请求可能被 GitHub 临时限制。',
        code: 429
      };
    }
    return {
      message: '同步失败：' + (clean || '未知错误'),
      summary: '请检查仓库是否存在、令牌权限是否包含“Contents: Read and write”，以及仓库是否已完成首次提交。' + (repoUrl ? ` 仓库：${repoUrl}` : ''),
      code: code || 0
    };
  }

  // 统一确认弹窗（与插件样式一致）
  showConfirmDialog({ title = '确认操作', message = '', okText = '确定', cancelText = '取消' } = {}) {
    return new Promise((resolve) => {
      let modal = document.getElementById('confirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.innerHTML = `
          <div class="modal-dialog">
            <div class="modal-header">
              <h3 class="modal-title" id="confirmTitle"></h3>
              <button class="modal-close" id="confirmClose">&times;</button>
            </div>
            <div class="modal-body">
              <div id="confirmMessage" style="color:#374151;line-height:1.6;"></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" id="confirmCancel"></button>
              <button class="btn btn-primary" id="confirmOk"></button>
            </div>
          </div>`;
        document.body.appendChild(modal);
      }

      const titleEl = modal.querySelector('#confirmTitle');
      const msgEl = modal.querySelector('#confirmMessage');
      const okBtn = modal.querySelector('#confirmOk');
      const cancelBtn = modal.querySelector('#confirmCancel');
      const closeBtn = modal.querySelector('#confirmClose');

      titleEl.textContent = title;
      msgEl.innerHTML = message;
      okBtn.textContent = okText;
      cancelBtn.textContent = cancelText;

      // 针对多选下拉增强：Command(mac)/Ctrl(win) 切换单项选择，Shift 保持范围选择
      let dlgScopesEl = msgEl.querySelector('#dlgScopes');
      let dlgScopesMouseDownHandler = null;
      let dlgScopesClickHandler = null;
      if (dlgScopesEl && dlgScopesEl.multiple) {
        dlgScopesMouseDownHandler = (e) => {
          const target = e.target;
          if (target && target.tagName === 'OPTION' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            target.selected = !target.selected;
          }
        };
        dlgScopesEl.addEventListener('mousedown', dlgScopesMouseDownHandler);
        dlgScopesClickHandler = (e) => {
          const target = e.target;
          if (target && target.tagName === 'OPTION' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            e.stopPropagation();
            target.selected = !target.selected;
          }
        };
        dlgScopesEl.addEventListener('click', dlgScopesClickHandler);
      }

      const cleanup = () => {
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        closeBtn.onclick = null;
        modal.onclick = null;
        if (dlgScopesEl) {
          if (dlgScopesMouseDownHandler) {
            dlgScopesEl.removeEventListener('mousedown', dlgScopesMouseDownHandler);
            dlgScopesMouseDownHandler = null;
          }
          if (dlgScopesClickHandler) {
            dlgScopesEl.removeEventListener('click', dlgScopesClickHandler);
            dlgScopesClickHandler = null;
          }
        }
        modal.classList.remove('show');
        modal.style.display = 'none';
      };

      okBtn.onclick = () => { cleanup(); resolve(true); };
      cancelBtn.onclick = () => { cleanup(); resolve(false); };
      closeBtn.onclick = () => { cleanup(); resolve(false); };
      modal.onclick = (e) => { if (e.target === modal) { cleanup(); resolve(false); } };

      // 显示弹窗（需添加show类以触发CSS中的可见样式）
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
    });
  }

  // 根据提供商更新模型选项
  updateModelOptions() {
    const aiModel = document.getElementById('aiModel');
    if (!aiModel) return;
    const provider = this.settings.aiProvider || 'openai';
    let models = [];
    if (provider === 'openai') {
      models = [
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (推荐)' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
      ];
      if (!['gpt-3.5-turbo','gpt-4','gpt-4-turbo'].includes(this.settings.aiModel)) {
        this.settings.aiModel = 'gpt-3.5-turbo';
      }
    } else if (provider === 'deepseek') {
      models = [
        { value: 'deepseek-chat', label: 'DeepSeek-Chat' }
      ];
      // 屏蔽 reasoner 类思考模型：不展示且强制回退
      if (!['deepseek-chat'].includes(this.settings.aiModel)) {
        this.settings.aiModel = 'deepseek-chat';
      }
    } else if (provider === 'ollama') {
      // 优先尝试从远端 /api/tags 获取模型列表
      const apiUrl = this.settings.aiApiUrl && this.settings.aiApiUrl.trim().length > 0
        ? this.settings.aiApiUrl
        : (this.getDefaultApiUrl('ollama') || 'http://localhost:11434/api/chat');
      let tagsUrl = 'http://localhost:11434/api/tags';
      try {
        const u = new URL(apiUrl);
        tagsUrl = `${u.origin}/api/tags`;
      } catch (_) {}

      // 先清空并放入占位
      aiModel.innerHTML = '';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.textContent = window.I18n ? (window.I18n.t('ai.model.placeholder') || '请选择模型') : '请选择模型';
      aiModel.appendChild(placeholder);
      const loading = document.createElement('option');
      loading.value = '';
      loading.disabled = true;
      loading.textContent = '正在获取本地模型...';
      aiModel.appendChild(loading);

      const applyModels = (list) => {
        // 清理占位后重新添加占位
        aiModel.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = '';
        ph.disabled = true;
        ph.selected = true;
        ph.textContent = window.I18n ? (window.I18n.t('ai.model.placeholder') || '请选择模型') : '请选择模型';
        aiModel.appendChild(ph);
        list.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.value;
          opt.textContent = m.label;
          aiModel.appendChild(opt);
        });
        // 若当前值不在列表中，默认选第一个
        const values = list.map(m => m.value);
        if (!values.includes(this.settings.aiModel)) {
          this.settings.aiModel = values[0] || '';
        }
        aiModel.value = this.settings.aiModel || '';
      };

      (async () => {
        try {
          const res = await fetch(tagsUrl, { method: 'GET' });
          if (!res.ok) throw new Error(`fetch tags failed: ${res.status}`);
          const data = await res.json();
          const arr = Array.isArray(data?.models) ? data.models : [];
          const list = arr.map(m => {
            // 兼容不同字段：优先使用完整 model（如 "llama3.1:8b"），否则用 name+tag 或 name
            let value = m.model || '';
            if (!value) {
              const name = m.name || '';
              const tag = m.tag || (Array.isArray(m.tags) ? m.tags[0] : '');
              value = tag ? `${name}:${tag}` : name;
            }
            const label = m.model || m.name || value || '未知模型';
            return value ? { value, label } : null;
          }).filter(Boolean);
          if (list.length > 0) {
            applyModels(list);
          } else {
            // 不填充默认列表：仅显示占位与无模型提示
            aiModel.innerHTML = '';
            const ph = document.createElement('option');
            ph.value = '';
            ph.disabled = true;
            ph.selected = true;
            ph.textContent = window.I18n ? (window.I18n.t('ai.model.placeholder') || '请选择模型') : '请选择模型';
            aiModel.appendChild(ph);
            const hint = document.createElement('option');
            hint.value = '';
            hint.disabled = true;
            hint.textContent = '未获取到模型';
            aiModel.appendChild(hint);
            this.settings.aiModel = '';
            aiModel.value = '';
          }
        } catch (e) {
          console.warn('[Ollama] 获取模型列表失败，使用回退列表', e);
          // 不填充默认列表：仅显示占位与无模型提示
          aiModel.innerHTML = '';
          const ph = document.createElement('option');
          ph.value = '';
          ph.disabled = true;
          ph.selected = true;
          ph.textContent = window.I18n ? (window.I18n.t('ai.model.placeholder') || '请选择模型') : '请选择模型';
          aiModel.appendChild(ph);
          const hint = document.createElement('option');
          hint.value = '';
          hint.disabled = true;
          hint.textContent = '未获取到模型';
          aiModel.appendChild(hint);
          this.settings.aiModel = '';
          aiModel.value = '';
        }
      })();
      return; // 已异步填充并设置选择，提前返回避免下方通用填充
    }
    aiModel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = window.I18n ? (window.I18n.t('ai.model.placeholder') || '请选择模型') : '请选择模型';
    aiModel.appendChild(placeholder);
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      aiModel.appendChild(opt);
    });
    aiModel.value = this.settings.aiModel || '';
  }

  // 默认提示词模板：自动整理（使用占位符 {{language}}/{{categoriesJson}}/{{itemsJson}}）
  getDefaultAiPromptOrganize() {
    return (
`You are a meticulous Information Architecture and Intelligent Classification Expert.
Your task is not to modify or create categories.
Instead, you must intelligently reassign and organize bookmarks within the existing category structure.

Input Description:

- Current language: {{language}}
- Existing categories and keywords (array): {{categoriesJson}}
- Bookmarks to be reorganized (optional array): {{itemsJson}}

Objective:

Based on the names and keywords of the existing categories, intelligently determine the most appropriate category for each bookmark.
You must not add, delete, or modify categories.
If multiple categories are possible, return the one with the highest confidence score and explain your reasoning.

Rules & Principles (Strictly Follow):

- Only classify items into existing categories — no new ones may be created.
- Use the given {{language}} for semantic and keyword-based matching.
- Prioritize bookmark titles for matching, then URLs, and then descriptions (if available).
- If the confidence score is below 0.5, mark the item as "low confidence".
- Output must strictly conform to the JSON structure below.
- No extra commentary or text is allowed outside the JSON.

Output Format (strict JSON, no extra text):
{
  "reassigned_items": [
    {
      "id": "string",
      "from_key": "string | null",
      "to_key": "string",
      "confidence": 0.0,
      "reason": "string"
    }
  ],
  "notes": {
    "global_rules": ["string"],
    "low_confidence_items": ["id"],
    "followups": ["string"]
  }
}

Output Requirement:
Return only a valid JSON object strictly following the above format — no markdown, no explanations, no text outside the JSON.`
    );
  }

  // 默认提示词模板：AI 全量归类（使用占位符 {{language}}/{{itemsJson}}）
  getDefaultAiPromptInfer() {
    return (
`You are a world-class Information Architecture and Taxonomy Expert.
Your task is to infer a clean, human-understandable category taxonomy from bookmarks, without any preset categories.

Input Description:
- Current language: {{language}}
- Bookmarks (array): {{itemsJson}}

Objective:
- Infer appropriate, concise category names that best group the bookmarks.
- Assign every bookmark to exactly one inferred category.
- Use the given language ({{language}}) for category naming when applicable.

Rules & Principles:
- Do not return any commentary outside JSON.
- Keep category names short (1–3 words) and meaningful.
- Prefer semantic grouping by title first, URL second.
- Mark low confidence assignments with confidence < 0.5; list their ids in notes.low_confidence_items.

Output Format (strict JSON, no extra text):
{
  "categories": ["string"],
  "assignments": [
    { "id": "string", "to_key": "string", "confidence": 0.0 }
  ],
  "notes": {
    "low_confidence_items": ["id"],
    "followups": ["string"]
  }
}

Output Requirement:
Return only a valid JSON object strictly following the above format — no markdown, no explanations, no text outside the JSON.`
    );
  }

  // 获取默认 API 端点
  getDefaultApiUrl(provider) {
    const p = provider || 'openai';
    if (p === 'openai') {
      return 'https://api.openai.com/v1/chat/completions';
    }
    if (p === 'deepseek') {
      return 'https://api.deepseek.com/v1/chat/completions';
    }
    if (p === 'ollama') {
      return 'http://localhost:11434/api/chat';
    }
    return '';
  }

  // 获取测试端点（优先 /v1/models）
  getTestUrl(apiUrl, provider) {
    // Ollama 使用 /api/tags 获取本地模型列表
    if ((provider || '').toLowerCase() === 'ollama') {
      try {
        const u = new URL(apiUrl);
        return `${u.origin}/api/tags`;
      } catch {
        // 常见默认端口
        if (String(apiUrl).includes('11434')) return 'http://localhost:11434/api/tags';
        return apiUrl;
      }
    }
    try {
      const u = new URL(apiUrl);
      const path = u.pathname;
      const v1Index = path.indexOf('/v1/');
      if (v1Index >= 0) {
        return `${u.origin}/v1/models`;
      }
      // Fallback：无法推断，直接使用当前 apiUrl
      return apiUrl;
    } catch {
      return apiUrl;
    }
  }

  // 构建最小测试请求体（仅在需要 POST 时）
  buildTestPayload(provider, model) {
    const p = (provider || '').toLowerCase();
    if (p === 'ollama') {
      return {
        model,
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
        options: { num_predict: 1, temperature: 0 }
      };
    }
    // OpenAI/DeepSeek 通用兼容体
    return {
      model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
      temperature: 0
    };
  }

  // 设置头部与底部的版本号显示
  setVersionTexts() {
    const setHeader = (ver) => {
      const headerVer = document.querySelector('.header .version');
      if (headerVer) headerVer.textContent = `v${ver || ''}`.trim();
    };
    const setFooter = (ver) => {
      const footerP = document.querySelector('.footer .footer-info p[data-i18n="footer.app"]');
      if (footerP) {
        // 使用当前语言的文案，再拼接版本号
        const baseText = (window.I18n && typeof window.I18n.t === 'function')
          ? window.I18n.t('footer.app')
          : 'TidyMark - Smart Bookmark Manager';
        footerP.textContent = `${baseText} v${ver || ''}`.trim();
      }
    };
    try {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.getManifest) {
        const ver = chrome.runtime.getManifest().version;
        if (ver) {
          setHeader(ver);
          setFooter(ver);
          return;
        }
      }
      // 预览/非扩展环境：读取根路径的 manifest.json
      fetch('/manifest.json')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(m => {
          const ver = m?.version || '';
          setHeader(ver);
          setFooter(ver);
        })
        .catch(() => {
          setHeader('');
          setFooter('');
        });
    } catch (e) {
      setHeader('');
      setFooter('');
    }
  }
}

// 全局变量，供HTML中的onclick使用
let optionsManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
  if (window.I18n) {
    await window.I18n.init();
  }
  optionsManager = new OptionsManager();
  await optionsManager.init();
  // 语言选择初始化与切换
  const langBtn = document.getElementById('languageIconBtn');
  const langMenu = document.getElementById('langMenu');
  if (langBtn && langMenu) {
    try {
      const current = window.I18n ? window.I18n.getLanguageSync() : 'en';
      // 高亮当前语言
      langMenu.querySelectorAll('button[data-lang]').forEach(btn => {
        const isActive = btn.getAttribute('data-lang') === current;
        btn.style.fontWeight = isActive ? '600' : '500';
        btn.style.background = isActive ? '#eef2ff' : '';
      });
      langBtn.title = (window.I18n ? (window.I18n.t('pref.language.label') || 'Language') : 'Language');
    } catch {}
    // 切换菜单显示（使用 .open 类控制）
    langBtn.addEventListener('click', () => {
      const open = langMenu.classList.toggle('open');
      langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    langMenu.addEventListener('click', async (e) => {
      const target = e.target.closest('button[data-lang]');
      if (!target) return;
      langMenu.classList.remove('open');
      const lang = target.getAttribute('data-lang');
      if (window.I18n) {
        await window.I18n.setLanguage(lang);
      }
      setTimeout(() => {
        try { location.reload(); } catch {}
      }, 100);
    });
    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (!langMenu.classList.contains('open')) return;
      const target = e.target;
      const clickedOnButton = langBtn.contains(target);
      const clickedInMenu = langMenu.contains(target);
      if (!clickedOnButton && !clickedInMenu) {
        langMenu.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });
    // Esc 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && langMenu.classList.contains('open')) {
        langMenu.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });
  } else {
    // 回退：保留原下拉选择逻辑
    const langSel = document.getElementById('languageSelect');
    if (langSel) {
      try {
        const current = window.I18n ? window.I18n.getLanguageSync() : 'en';
        langSel.value = current;
      } catch {}
      langSel.addEventListener('change', async (e) => {
        const lang = e.target.value;
        if (window.I18n) {
          await window.I18n.setLanguage(lang);
        }
        setTimeout(() => {
          try { location.reload(); } catch {}
        }, 100);
      });
    }
  }
});

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
// 预览样式已注入
