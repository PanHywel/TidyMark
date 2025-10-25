
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
          'organizeScopeFolderIds'
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
          'organizeScopeFolderIds'
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
          : (result.organizeScopeFolderId ? [String(result.organizeScopeFolderId)] : [])
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
        deadScanFolderId: null
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
        this.switchTab(e.target.dataset.tab);
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
        this.syncToGithub();
        this.switchTab('sync');
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
    const clickHint = window.I18n ? (window.I18n.t('preview.clickHint') || '点击
