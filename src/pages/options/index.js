// options.js - 设置页面逻辑

class OptionsManager {
  constructor() {
    this.currentTab = 'general';
    this.settings = {};
    this.classificationRules = [];
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.renderUI();
    this.setVersionTexts();
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
          'showBookmarks',
          // 失效检测严格模式
          'deadStrictMode'
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
          'showBookmarks',
          'deadStrictMode'
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
        aiProvider: ['openai','deepseek'].includes(result.aiProvider) ? result.aiProvider : 'openai',
        aiApiKey: result.aiApiKey ?? '',
        aiApiUrl: result.aiApiUrl ?? '',
        aiModel: result.aiModel ?? 'gpt-3.5-turbo',
        maxTokens: (typeof result.maxTokens === 'number' && result.maxTokens > 0) ? result.maxTokens : 8192,
        classificationLanguage: result.classificationLanguage ?? 'auto',
        maxCategories: result.maxCategories ?? undefined,
        weatherEnabled: result.weatherEnabled !== undefined ? !!result.weatherEnabled : true,
        weatherCity: (result.weatherCity || '').trim(),
        wallpaperEnabled: result.wallpaperEnabled !== undefined ? !!result.wallpaperEnabled : true,
        sixtySecondsEnabled: result.sixtySecondsEnabled !== undefined ? !!result.sixtySecondsEnabled : true,
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
        showBookmarks: result.showBookmarks !== undefined ? !!result.showBookmarks : false,
        deadStrictMode: result.deadStrictMode !== undefined ? !!result.deadStrictMode : false
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
        classificationLanguage: 'auto',
        maxCategories: undefined,
        wallpaperEnabled: true,
        sixtySecondsEnabled: true,
        searchUnfocusedOpacity: 0.86,
        bookmarksUnfocusedOpacity: 0.86,
        showBookmarks: false
      };
      this.classificationRules = this.settings.classificationRules;
    }
  }

  // 保存设置
  async saveSettings() {
    try {
      // 检查是否在Chrome扩展环境中
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set(this.settings);
      } else {
        // 在非扩展环境中使用localStorage作为fallback
        Object.keys(this.settings).forEach(key => {
          localStorage.setItem(key, JSON.stringify(this.settings[key]));
        });
      }
      this.showMessage('设置已保存', 'success');
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showMessage('保存设置失败', 'error');
    }
  }

  // 绑定事件
  bindEvents() {
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
    }

    const aiModel = document.getElementById('aiModel');
    if (aiModel) {
      aiModel.addEventListener('change', (e) => {
        this.settings.aiModel = e.target.value;
        this.saveSettings();
      });
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

    // 书签列表是否展示
    const showBookmarks = document.getElementById('showBookmarks');
    if (showBookmarks) {
      showBookmarks.addEventListener('change', (e) => {
        this.settings.showBookmarks = !!e.target.checked;
        this.saveSettings();
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


    // 按钮事件
    const testAiConnection = document.getElementById('testAiConnection');
    if (testAiConnection) {
      testAiConnection.addEventListener('click', () => {
        this.testAiConnection();
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
        const checked = Array.from(deadResultsList.querySelectorAll('input[type="checkbox"]'))
          .filter(cb => cb.checked)
          .map(cb => cb.dataset.id);
        if (checked.length === 0) {
          this.showMessage(window.I18n.t('dead.delete.noSelection'), 'error');
          return;
        }
        deadDeleteBtn.disabled = true;
        const originalText = deadDeleteBtn.textContent;
        deadDeleteBtn.textContent = window.I18n.t('dead.delete.processing');
        try {
          if (typeof chrome !== 'undefined' && chrome.bookmarks) {
            for (const id of checked) {
              try { await chrome.bookmarks.remove(id); } catch (e) { console.warn('删除失败', id, e); }
            }
          }
          // 从列表中移除对应项
          checked.forEach(id => {
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
        const checked = Array.from(deadResultsList.querySelectorAll('input[type="checkbox"]'))
          .filter(cb => cb.checked)
          .map(cb => cb.dataset.id);
        if (checked.length === 0) {
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
          for (const id of checked) {
            try {
              await chrome.bookmarks.move(id, { parentId: folder.id });
            } catch (e) {
              console.warn('移动失败', id, e);
            }
          }
          // 从列表中移除对应项
          checked.forEach(id => {
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
    const statusEl = document.getElementById('organizeStatus');
    const original = btn ? btn.innerHTML : '';
    const setStatus = (text, ok = false) => {
      if (!statusEl) return;
      statusEl.textContent = text || '';
      statusEl.style.color = ok ? '#059669' : '#64748b';
    };
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;margin:0;display:inline-block;"></div> 整理中...';
      }
      setStatus('准备预览...');
      let previewResponse;
      if (typeof chrome !== 'undefined' && chrome?.runtime) {
        previewResponse = await chrome.runtime.sendMessage({ action: 'previewOrganize' });
      } else {
        throw new Error('当前不在扩展环境，无法执行');
      }
      if (!previewResponse?.success) throw new Error(previewResponse?.error || '生成预览失败');
      let plan = previewResponse.data;

      // 若启用 AI 且已配置，调用后台 AI 优化
      setStatus('AI 优化中...');
      const useAI = !!this.settings.enableAI && !!this.settings.aiApiKey;
      if (useAI && typeof chrome !== 'undefined' && chrome?.runtime) {
        const aiResp = await chrome.runtime.sendMessage({ action: 'refineOrganizeWithAI', preview: plan });
        if (aiResp?.success && aiResp.data) {
          plan = aiResp.data;
        }
      }

      // 简要确认
      const total = plan?.total ?? 0;
      const classified = plan?.classified ?? 0;
      const confirmText = `将按预览执行整理\n总书签：${total}，拟分类：${classified}。\n是否继续？`;
      const ok = window.confirm(confirmText);
      if (!ok) {
        setStatus('已取消');
        return;
      }

      // 执行整理：AI 计划或直接整理
      setStatus('执行整理中...');
      let runResponse = { success: true };
      if (typeof chrome !== 'undefined' && chrome?.runtime) {
        if (useAI) {
          runResponse = await chrome.runtime.sendMessage({ action: 'organizeByPlan', plan });
        } else {
          runResponse = await chrome.runtime.sendMessage({ action: 'organizeBookmarks' });
        }
      }
      if (!runResponse?.success) throw new Error(runResponse?.error || '整理失败');
      setStatus('整理完成', true);
    } catch (e) {
      console.error('[Options] organizeFromSettings 失败:', e);
      setStatus(`失败：${e?.message || e}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    }
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
    div.innerHTML = `
      <div class="rule-content">
        <div class="rule-header">
          <h3 class="rule-category">${nameTranslated}</h3>
          <div class="rule-actions">
            <button class="btn btn-sm btn-outline edit-rule-btn" title="编辑规则">
              <span class="icon">✏️</span>
              编辑
            </button>
            <button class="btn btn-sm btn-outline btn-danger delete-rule-btn" title="删除规则">
              <span class="icon">🗑️</span>
              删除
            </button>
          </div>
        </div>
        <div class="rule-keywords">
          <span class="keywords-label">关键词：</span>
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

    // 书签列表是否展示回显
    const showBookmarks = document.getElementById('showBookmarks');
    if (showBookmarks) showBookmarks.checked = !!this.settings.showBookmarks;
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
      if (!listEl || !containerEl || !scanBtn) return;
      containerEl.hidden = true;
      listEl.innerHTML = '';
      scanBtn.disabled = true;
      const originalText = scanBtn.textContent;
      scanBtn.innerHTML = `<span class="loading"></span> ${window.I18n.t('dead.scan.running')}`;

      // 获取所有书签
      const bookmarks = await this.getAllBookmarks();
      const targets = bookmarks.filter(b => this.isHttpUrl(b.url));
      const total = targets.length;
      let done = 0;
      const dead = [];
      if (progressEl) progressEl.textContent = `0 / ${total}`;

      const concurrency = 6;
      let idx = 0;
      const worker = async () => {
        while (idx < total) {
          const current = idx++;
          const b = targets[current];
          try {
            const status = await this.checkUrlAlive(b.url, { strict: !!this.settings.deadStrictMode, timeoutMs: 8000, avoidPopups: true });
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

      // 渲染结果
      if (dead.length === 0) {
        containerEl.hidden = false;
        listEl.innerHTML = `<li class="list-item"><span class="title">${window.I18n.t('dead.none')}</span></li>`;
      } else {
        containerEl.hidden = false;
        listEl.innerHTML = dead.map(d => `
          <li class="list-item" data-id="${d.id}">
            <input type="checkbox" data-id="${d.id}" aria-label="${window.I18n.t('dead.checkbox')}">
            <div class="info">
              <div class="title">${this.escapeHtml(d.title || d.url)}</div>
              <div class="url">${this.escapeHtml(d.url)}</div>
            </div>
            <div class="status">${this.escapeHtml(d.status || window.I18n.t('dead.status.unreachable'))}</div>
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

  // 工具：是否 http/https URL
  isHttpUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // 检查URL可达性（带超时与回退）
  async checkUrlAlive(url, { timeoutMs = 8000, avoidPopups = true, strict = false } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const opts = avoidPopups
        ? { method: 'HEAD', mode: 'cors', redirect: 'manual', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: controller.signal }
        : { method: 'HEAD', mode: 'cors', redirect: 'follow', cache: 'no-store', signal: controller.signal };
      const res = await fetch(url, opts);
      clearTimeout(timer);
      // 如果不跟随重定向，出现 opaqueredirect 视为站点可达（避免跳转到登录页）
      if (res.type === 'opaqueredirect') return { ok: true, status: 0, statusText: 'redirect' };
      if (res.ok) return { ok: true, status: res.status, statusText: String(res.status) };
      // 认证类状态码视为“可达但受限”
      if (res.status === 401 || res.status === 403) {
        return { ok: true, status: res.status, statusText: String(res.status) };
      }
      // 速率限制在严格模式下也视为可达（暂不判定为死链）
      if (strict && res.status === 429) {
        return { ok: true, status: res.status, statusText: String(res.status) };
      }
      // 方法不允许/未实现：可能阻断 HEAD，回退到 GET（no-cors）以确认网络连通
      if (res.status === 405 || res.status === 501) {
        try {
          const resNc = await fetch(url, { method: 'GET', mode: 'no-cors', redirect: 'follow', credentials: 'omit', cache: 'no-store' });
          // 成功返回即视为可达；opaque 无法读状态但说明网络连通
          return { ok: true, status: 0, statusText: 'opaque' };
        } catch {}
      }
      // 严格模式：对非明确 404/410/5xx 的非OK结果再做一次 no-cors GET 以降低误报
      if (strict && res.status !== 404 && res.status !== 410 && !(res.status >= 500)) {
        try {
          await fetch(url, { method: 'GET', mode: 'no-cors', redirect: 'follow', credentials: 'omit', cache: 'no-store' });
          return { ok: true, status: 0, statusText: 'opaque' };
        } catch {}
      }
      // 在安全模式下，不回退到 GET，避免页面执行或弹窗；非安全模式才尝试 GET
      if (!avoidPopups) {
        return await this.checkUrlAliveGet(url, { timeoutMs: Math.max(4000, timeoutMs - 2000) });
      }
      return { ok: false, status: res.status, statusText: String(res.status || '不可访问') };
    } catch (e) {
      clearTimeout(timer);
      // 在安全模式下尝试 no-cors 的 HEAD 以获得不透明响应，若成功则视为可达
      if (avoidPopups) {
        try {
          const res2 = await fetch(url, { method: 'HEAD', mode: 'no-cors', redirect: 'manual', credentials: 'omit', cache: 'no-store' });
          // 成功返回即视为可达（opaque 无法读状态，但不触发弹窗）
          return { ok: true, status: 0, statusText: 'opaque' };
        } catch (e2) {
          // 尝试 GET no-cors 作为进一步连通性确认
          try {
            await fetch(url, { method: 'GET', mode: 'no-cors', redirect: 'follow', credentials: 'omit', cache: 'no-store' });
            return { ok: true, status: 0, statusText: 'opaque' };
          } catch (e3) {}
          return { ok: false, status: 0, statusText: '网络错误或超时' };
        }
      }
      // 非安全模式：作为回退 GET
      try {
        return await this.checkUrlAliveGet(url, { timeoutMs: Math.max(4000, timeoutMs - 2000) });
      } catch (e3) {
        return { ok: false, status: 0, statusText: '网络错误或超时' };
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
      modalTitle.textContent = '编辑分类规则';
      categoryInput.value = rule.category;
      keywordsInput.value = rule.keywords.join(', ');
    } else {
      modalTitle.textContent = '添加分类规则';
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
      this.showMessage(index >= 0 ? '规则已更新' : '规则已添加', 'success');
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
  deleteRule(index) {
    if (confirm('确定要删除这个分类规则吗？')) {
      this.classificationRules.splice(index, 1);
      this.settings.classificationRules = this.classificationRules;
      this.saveSettings();
      this.updateClassificationRules();
    }
  }

  // 重置为默认规则
  resetToDefaultRules() {
    if (confirm('确定要重置为默认分类规则吗？这将覆盖所有现有规则。')) {
      this.classificationRules = this.getDefaultRules();
      this.settings.classificationRules = this.classificationRules;
      this.saveSettings();
      this.updateClassificationRules();
      this.showMessage('已重置为默认规则', 'success');
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
      if (!aiApiKey || !aiApiUrl || !aiModel) {
        throw new Error('请填写 API Key、API 端点，并选择模型');
      }

      // 优先调用 /v1/models 进行低成本验证
      const testUrl = this.getTestUrl(aiApiUrl, aiProvider);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const headers = {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json'
      };

      let res;
      try {
        // 如果是 /models 测试端点，使用 GET；否则使用 POST 进行最小开销的 Ping
        if (testUrl.endsWith('/models')) {
          res = await fetch(testUrl, { method: 'GET', headers, signal: controller.signal });
        } else {
          const body = JSON.stringify(this.buildTestPayload(aiProvider, aiModel));
          res = await fetch(aiApiUrl, { method: 'POST', headers, body, signal: controller.signal });
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
      this.showMessage('备份导出成功', 'success');
    } catch (error) {
      console.error('导出备份失败:', error);
      this.showMessage('导出备份失败', 'error');
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

        if (confirm('导入备份将覆盖当前所有书签和设置，确定要继续吗？')) {
          // 这里应该实现实际的导入逻辑
          // 由于Chrome扩展API的限制，实际实现会更复杂
          this.showMessage('备份导入功能正在开发中', 'info');
        }
      } catch (error) {
        console.error('导入备份失败:', error);
        this.showMessage('导入备份失败: ' + error.message, 'error');
      }
    };
    
    input.click();
  }

  // 重置设置
  resetSettings() {
    if (confirm('确定要重置所有设置吗？这将恢复默认配置。')) {
      chrome.storage.sync.clear(() => {
        location.reload();
      });
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
    }
    aiModel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = '请选择模型';
    aiModel.appendChild(placeholder);
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      aiModel.appendChild(opt);
    });
    aiModel.value = this.settings.aiModel || '';
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
    return '';
  }

  // 获取测试端点（优先 /v1/models）
  getTestUrl(apiUrl, provider) {
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
        // 保持中文描述，但替换版本号为动态值
        footerP.textContent = `TidyMark - 智能书签管理扩展 v${ver || ''}`.trim();
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
          setHeader('1.0.0');
          setFooter('1.0.0');
        });
    } catch (e) {
      setHeader('1.0.0');
      setFooter('1.0.0');
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
    });
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