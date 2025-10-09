// popup.js - 主界面逻辑

class PopupManager {
  constructor() {
    this.bookmarks = [];
    this.categories = [];
    this.uncategorizedBookmarks = [];
    this.container = document.querySelector('.container');
    this.init();
  }

  async init() {
    if (window.I18n) {
      await window.I18n.init();
    }
    this.bindEvents();
    
    // 检查是否首次使用
    const isFirstTime = await this.checkFirstTimeUser();
    
    // 加载主界面数据
    await this.loadData();
    
    // 如果是首次使用，显示功能介绍弹窗
    if (isFirstTime) {
      // 延迟一点显示弹窗，确保主界面已加载
      setTimeout(() => {
        this.showFeatureTips();
        this.markAsUsed();
      }, 500);
    }
  }

  async checkFirstTimeUser() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['hasUsedBefore']);
        return !result.hasUsedBefore;
      }
      // 预览环境，检查localStorage
      return !localStorage.getItem('tidymark_hasUsedBefore');
    } catch (error) {
      console.error('检查首次使用状态失败:', error);
      return false;
    }
  }

  async markAsUsed() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ hasUsedBefore: true });
      } else {
        localStorage.setItem('tidymark_hasUsedBefore', 'true');
      }
    } catch (error) {
      console.error('标记使用状态失败:', error);
    }
  }

  bindEvents() {
    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // 备份按钮
    document.getElementById('backupBtn').addEventListener('click', () => {
      this.backupBookmarks();
    });

    // 自动整理按钮
    document.getElementById('organizeBtn').addEventListener('click', () => {
      this.organizeBookmarks();
    });

    // 搜索功能
    document.getElementById('searchInput').addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query) {
        this.searchBookmarks(query);
      } else {
        // 未分类区域已移除，空查询时不需要恢复列表
      }
    });

    // 添加分类按钮
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
      this.addCategory();
    });

    // 重试按钮
    document.getElementById('retryBtn')?.addEventListener('click', () => {
      this.loadData();
    });

    // 警告关闭按钮
    document.getElementById('warningCloseBtn')?.addEventListener('click', () => {
      document.getElementById('backupWarning').style.display = 'none';
    });
  }

  async loadData() {
    try {
      this.showLoading();
      
      // 检查是否在Chrome扩展环境中
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        // 获取所有书签
        const bookmarkTree = await chrome.bookmarks.getTree();
        this.bookmarks = this.flattenBookmarks(bookmarkTree);
        
        // 获取分类信息
        const result = await chrome.storage.local.get(['categories', 'organizedBookmarks']);
        this.categories = result.categories || [];
        const organizedBookmarkIds = result.organizedBookmarks || [];
        
        // 计算未分类书签
        this.uncategorizedBookmarks = this.bookmarks.filter(
          bookmark => bookmark.url && !organizedBookmarkIds.includes(bookmark.id)
        );
      } else {
        // 预览环境，使用模拟数据
        this.bookmarks = [
          { id: '1', title: 'GitHub', url: 'https://github.com' },
          { id: '2', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
          { id: '3', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
          { id: '4', title: 'Vue.js', url: 'https://vuejs.org' },
          { id: '5', title: 'React', url: 'https://reactjs.org' },
          { id: '6', title: 'Node.js', url: 'https://nodejs.org' },
          { id: '7', title: 'TypeScript', url: 'https://www.typescriptlang.org' },
          { id: '8', title: 'CSS-Tricks', url: 'https://css-tricks.com' },
          { id: '9', title: 'CodePen', url: 'https://codepen.io' },
          { id: '10', title: 'Dribbble', url: 'https://dribbble.com' }
        ];
        this.categories = [
          { id: '1', name: '开发工具', bookmarkIds: ['1', '2'] },
          { id: '2', name: '前端框架', bookmarkIds: ['4', '5'] },
          { id: '3', name: '设计资源', bookmarkIds: ['10'] }
        ];
        
        const organizedBookmarkIds = ['1', '2', '4', '5', '10'];
        
        // 计算未分类书签
        this.uncategorizedBookmarks = this.bookmarks.filter(
          bookmark => bookmark.url && !organizedBookmarkIds.includes(bookmark.id)
        );
      }
      
      this.updateStats();
      this.renderCategories();
      
      // 初始状态只显示主要操作按钮
      this.showInitialState();
      
    } catch (error) {
      console.error('加载数据失败:', error);
      // 在预览环境中不显示错误提示
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        this.showError('加载数据失败，请重试');
      }
    }
  }

  showInitialState() {
    // 隐藏loading状态
    this.hideLoading();
    
    // 显示统计信息和主要按钮
    document.querySelector('.stats').style.display = 'grid';
    document.querySelector('.actions').style.display = 'grid';
    
    // 隐藏详细内容
    document.querySelector('.search').style.display = 'none';
    document.querySelector('.categories').style.display = 'none';
    const uncat = document.querySelector('.uncategorized');
    if (uncat) uncat.style.display = 'none';
  }

  flattenBookmarks(bookmarkTree, result = []) {
    for (const node of bookmarkTree) {
      if (node.url) {
        result.push(node);
      }
      if (node.children) {
        this.flattenBookmarks(node.children, result);
      }
    }
    return result;
  }

  updateStats() {
    const totalBookmarks = this.bookmarks.length;
    const totalCategories = this.categories.length;

    document.getElementById('totalBookmarks').textContent = totalBookmarks;
    document.getElementById('totalCategories').textContent = totalCategories;
  }

  renderCategories() {
    const categoryList = document.getElementById('categoryList');
    const emptyState = document.getElementById('emptyCategoryState');
    
    categoryList.innerHTML = '';

    if (this.categories.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    this.categories.forEach(category => {
      const categoryElement = this.createCategoryElement(category);
      categoryList.appendChild(categoryElement);
    });
  }

  createCategoryElement(category) {
    const div = document.createElement('div');
    div.className = 'category-item';
    const nameTranslated = window.I18n ? window.I18n.translateCategoryByName(category.name) : category.name;
    div.innerHTML = `
      <div class="category-info">
        <span class="category-name">${nameTranslated}</span>
        <span class="category-count">${category.bookmarkIds?.length || 0}</span>
      </div>
      <div class="category-actions">
        <button class="category-action-btn" title="编辑" data-action="edit" data-id="${category.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="category-action-btn" title="删除" data-action="delete" data-id="${category.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3,6 5,6 21,6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // 绑定分类操作事件
    div.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="edit"]')) {
        this.editCategory(category.id);
      } else if (e.target.closest('[data-action="delete"]')) {
        this.deleteCategory(category.id);
      } else {
        this.viewCategory(category.id);
      }
    });

    return div;
  }

  renderUncategorizedBookmarks() {
    const uncategorizedSection = document.getElementById('uncategorizedSection');
    const uncategorizedList = document.getElementById('uncategorizedList');
    const uncategorizedCount = document.getElementById('uncategorizedCount');
    const uncategorizedGuide = document.getElementById('uncategorizedGuide');

    if (this.uncategorizedBookmarks.length === 0) {
      uncategorizedSection.style.display = 'none';
      return;
    }

    uncategorizedSection.style.display = 'block';
    uncategorizedCount.textContent = this.uncategorizedBookmarks.length;
    uncategorizedList.innerHTML = '';

    this.uncategorizedBookmarks.slice(0, 10).forEach(bookmark => {
      const bookmarkElement = this.createBookmarkElement(bookmark);
      uncategorizedList.appendChild(bookmarkElement);
    });

    if (this.uncategorizedBookmarks.length > 10) {
      const moreElement = document.createElement('div');
      moreElement.className = 'bookmark-item view-more-item';
      moreElement.style.justifyContent = 'center';
      moreElement.style.cursor = 'pointer';
      moreElement.innerHTML = `
        <button class="view-more-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
          查看更多 (还有 ${this.uncategorizedBookmarks.length - 10} 个书签)
        </button>
      `;
      
      // 添加点击事件
      moreElement.addEventListener('click', () => {
        this.showAllUncategorizedBookmarks();
      });
      
      uncategorizedList.appendChild(moreElement);
    }

    // 显示引导提示（只在没有分类时显示）
    if (this.categories.length === 0) {
      uncategorizedGuide.style.display = 'block';
    } else {
      uncategorizedGuide.style.display = 'none';
    }
  }

  showAllUncategorizedBookmarks() {
    const uncategorizedList = document.getElementById('uncategorizedList');
    uncategorizedList.innerHTML = '';

    // 显示所有未分类书签
    this.uncategorizedBookmarks.forEach(bookmark => {
      const bookmarkElement = this.createBookmarkElement(bookmark);
      uncategorizedList.appendChild(bookmarkElement);
    });

    // 添加收起按钮
    if (this.uncategorizedBookmarks.length > 10) {
      const collapseElement = document.createElement('div');
      collapseElement.className = 'bookmark-item view-more-item';
      collapseElement.style.justifyContent = 'center';
      collapseElement.style.cursor = 'pointer';
      collapseElement.innerHTML = `
        <button class="view-more-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18,15 12,9 6,15"></polyline>
          </svg>
          收起
        </button>
      `;
      
      // 添加点击事件
      collapseElement.addEventListener('click', () => {
        this.renderUncategorizedBookmarks();
      });
      
      uncategorizedList.appendChild(collapseElement);
    }
  }

  createBookmarkElement(bookmark) {
    const div = document.createElement('div');
    div.className = 'bookmark-item';
    
    const faviconUrl = `chrome://favicon/${bookmark.url}`;
    
    div.innerHTML = `
      <input type="checkbox" data-bookmark-id="${bookmark.id}">
      <img class="bookmark-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">
      <div class="bookmark-info">
        <div class="bookmark-title">${bookmark.title || (window.I18n ? window.I18n.t('common.noTitle') : '(无标题)')}</div>
        <div class="bookmark-url">${bookmark.url}</div>
      </div>
    `;

    return div;
  }

  async backupBookmarks() {
    try {
      const backupBtn = document.getElementById('backupBtn');
      const originalText = backupBtn.innerHTML;
      backupBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div> 备份中...';
      backupBtn.disabled = true;

      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        // Chrome扩展环境
        const bookmarkTree = await chrome.bookmarks.getTree();
        
        // 生成Chrome兼容的HTML格式
        const htmlContent = this.generateChromeBookmarkHTML(bookmarkTree);
        
        const blob = new Blob([htmlContent], { type: 'text/html; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const filename = `bookmarks_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.html`;
        
        await chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        });

        URL.revokeObjectURL(url);
      } else {
        // 预览环境，模拟备份
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // 备份完成后显示详细内容
      this.showOrganizedState();

      // 恢复按钮状态
      backupBtn.innerHTML = originalText;
      backupBtn.disabled = false;

    } catch (error) {
      console.error('备份失败:', error);
      this.showError('备份失败，请重试');
      
      // 恢复按钮状态
      const backupBtn = document.getElementById('backupBtn');
      backupBtn.innerHTML = '备份书签';
      backupBtn.disabled = false;
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

    // 处理书签树
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
      // 这是一个文件夹
      const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : defaultTimestamp;
      const lastModified = node.dateGroupModified ? Math.floor(node.dateGroupModified / 1000) : defaultTimestamp;
      
      html += `${indent}<DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}">${this.escapeHtml(node.title || '未命名文件夹')}</H3>\n`;
      html += `${indent}<DL><p>\n`;
      
      for (const child of node.children) {
        html += this.processBookmarkNode(child, depth + 1, defaultTimestamp);
      }
      
      html += `${indent}</DL><p>\n`;
    } else if (node.url) {
      // 这是一个书签
      const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : defaultTimestamp;
      const icon = node.icon || '';
      
      html += `${indent}<DT><A HREF="${this.escapeHtml(node.url)}" ADD_DATE="${addDate}"`;
      if (icon) {
        html += ` ICON="${icon}"`;
      }
      html += `>${this.escapeHtml(node.title || node.url)}</A>\n`;
    }

    return html;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async organizeBookmarks() {
    try {
      const organizeBtn = document.getElementById('organizeBtn');
      const originalText = organizeBtn.innerHTML;
      organizeBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div> 生成预览...';
      organizeBtn.disabled = true;
      
      // 第一步：获取整理预览（dry-run）
      let previewResponse;
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        previewResponse = await chrome.runtime.sendMessage({ action: 'previewOrganize' });
      } else {
        // 预览环境：构造一个模拟预览数据
        const mockPreview = {
          total: this.bookmarks.length,
          classified: Math.min(5, this.bookmarks.length),
          categories: {
            '前端框架': { count: 2, bookmarks: this.bookmarks.slice(0, 2) },
            '设计资源与素材': { count: 1, bookmarks: this.bookmarks.slice(9, 10) },
            '其他': { count: Math.max(0, this.bookmarks.length - 3), bookmarks: this.bookmarks.slice(3) }
          },
          details: this.bookmarks.map(b => ({ bookmark: b, category: '其他' }))
        };
        previewResponse = { success: true, data: mockPreview };
      }

      if (!previewResponse?.success) {
        throw new Error(previewResponse?.error || '生成预览失败');
      }

      // 第二步：如果启用AI且已配置，则进行AI二次整理
      let plan = previewResponse.data;
      let useAI = false;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const settings = await chrome.storage.sync.get(['enableAI','aiApiKey']);
        useAI = !!settings.enableAI && !!settings.aiApiKey;
      }
      if (useAI) {
        // 打印 AI 优化前摘要
        try {
          const beforeSummary = {
            total: plan.total,
            classified: plan.classified,
            categories: Object.fromEntries(Object.entries(plan.categories || {}).map(([k, v]) => [k, v?.count || 0]))
          };
          console.log('[AI优化前] 预览摘要:', beforeSummary);
        } catch (e) {
          console.warn('[AI优化前] 预览摘要打印失败:', e);
        }

        const planBefore = JSON.parse(JSON.stringify(plan));
        organizeBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div> AI 优化中...';
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          const aiResp = await chrome.runtime.sendMessage({ action: 'refineOrganizeWithAI', preview: plan });
          if (aiResp?.success && aiResp.data) {
            plan = aiResp.data;
          }
        } else {
          // 预览环境：模拟AI重分配，将部分“其他”调入第一个非其他分类
          const firstCat = Object.keys(plan.categories).find(k => k !== '其他');
          if (firstCat) {
            let moved = 0;
            for (const d of plan.details) {
              if (d.category === '其他' && moved < 2) {
                d.category = firstCat;
                moved++;
              }
            }
            // 重建类别统计
            const newCats = {};
            for (const d of plan.details) {
              if (!newCats[d.category]) newCats[d.category] = { count: 0, bookmarks: [] };
              newCats[d.category].count++;
              newCats[d.category].bookmarks.push(d.bookmark);
            }
            plan.categories = newCats;
            plan.classified = Object.keys(newCats).reduce((sum, k) => sum + (k !== '其他' ? newCats[k].count : 0), 0);
          }
        }

        // 打印 AI 优化后摘要与变更数
        try {
          const afterSummary = {
            total: plan.total,
            classified: plan.classified,
            categories: Object.fromEntries(Object.entries(plan.categories || {}).map(([k, v]) => [k, v?.count || 0]))
          };
          const beforeMap = new Map((planBefore.details || []).map(d => [d.bookmark?.id, d.category]));
          let changed = 0;
          const movedItems = [];
          for (const d of (plan.details || [])) {
            const prev = beforeMap.get(d.bookmark?.id);
            if (prev && prev !== d.category) {
              changed++;
              movedItems.push({
                id: String(d.bookmark?.id),
                title: d.bookmark?.title || '',
                from: prev,
                to: d.category
              });
            }
          }
          console.log('[AI优化后] 预览摘要:', afterSummary, '变更条目数:', changed);
          if (movedItems.length > 0) {
            console.log('[AI优化后] 移动明细:', movedItems);
          } else {
            console.log('[AI优化后] 无条目发生移动');
          }
        } catch (e) {
          console.warn('[AI优化后] 预览摘要打印失败:', e);
        }
      }

      const confirmed = await this.showOrganizePreviewDialog(plan);
      if (!confirmed) {
        // 用户取消整理
        organizeBtn.innerHTML = originalText;
        organizeBtn.disabled = false;
        return;
      }

      // 第三步：备份确认（在用户确认后执行）
      const shouldBackup = await this.showBackupConfirmDialog();
      if (shouldBackup) {
        await this.backupBookmarks();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 第四步：执行实际整理（如使用AI，则按计划整理）
      organizeBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0;"></div> 整理中...';
      let runResponse = { success: true };
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        if (useAI) {
          runResponse = await chrome.runtime.sendMessage({ action: 'organizeByPlan', plan });
        } else {
          runResponse = await chrome.runtime.sendMessage({ action: 'organizeBookmarks' });
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        runResponse = { success: true };
      }

      if (runResponse.success) {
        await this.loadData();
        // 不显示分类管理/待分类的后置UI，直接提示完成（按你的建议移除）
        this.showSuccess('书签整理完成！');
      } else {
        throw new Error(runResponse.error || '整理失败');
      }

      organizeBtn.innerHTML = originalText;
      organizeBtn.disabled = false;

    } catch (error) {
      console.error('整理失败:', error);
      this.showError('整理失败，请重试');
      
      // 恢复按钮状态
      const organizeBtn = document.getElementById('organizeBtn');
      organizeBtn.innerHTML = '自动整理';
      organizeBtn.disabled = false;
    }
  }

  // 展示整理预览并进行二次确认（预留手动调整入口）
  async showOrganizePreviewDialog(preview) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title">${window.I18n ? window.I18n.t('preview.title') : '整理预览与确认'}</h3>
            <button class="modal-close" id="previewClose">×</button>
          </div>
          <div class="modal-body">
            <div class="preview-summary">${window.I18n ? window.I18n.tf('preview.summary', { total: preview.total, classified: preview.classified }) : `共 ${preview.total} 个书签，拟分类 ${preview.classified} 个，其余将归入“其他”（如存在）。`}</div>
            <div id="previewCategories" class="preview-categories">
              ${Object.entries(preview.categories)
                .filter(([, data]) => data && data.count > 0)
                .map(([name, data]) => {
                  const threshold = 10;
                  const collapsedClass = data.bookmarks.length > threshold ? 'collapsed' : '';
                  const listItems = data.bookmarks.map(b => `
                    <li class="bookmark-entry">
                      ${this.escapeHtml(b.title || (window.I18n ? window.I18n.t('common.noTitle') : '(无标题)'))}
                    </li>
                  `).join('');
                  const footer = data.bookmarks.length > threshold ? `
                    <div class="category-footer">
                      <button class="btn btn-outline collapse-toggle">${window.I18n ? window.I18n.t('preview.expand') : '展开全部'}</button>
                    </div>
                  ` : '';
                  const translatedName = window.I18n ? window.I18n.translateCategoryByName(name) : name;
                  return `
                    <div class="category-preview-item">
                      <div class="category-header">
                        <strong class="category-name">${translatedName}</strong>
                        <span class="badge">${data.count} 个</span>
                      </div>
                      <ul class="bookmark-list-preview ${collapsedClass}">
                        ${listItems}
                      </ul>
                      ${footer}
                    </div>
                  `;
                }).join('')}
            </div>
            <div class="info-banner">
              ${window.I18n ? window.I18n.t('preview.info') : '手动调整即将支持：您将可以在此界面移动、排除或合并分类。'}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" id="previewCancel">${window.I18n ? window.I18n.t('preview.cancel') : '取消'}</button>
            <button class="btn btn-primary" id="previewConfirm">${window.I18n ? window.I18n.t('preview.confirm') : '确认整理'}</button>
          </div>
        </div>`;

      document.body.appendChild(modal);

      const close = () => { document.body.removeChild(modal); };
      modal.querySelector('#previewClose').addEventListener('click', () => { close(); resolve(false); });
      modal.querySelector('#previewCancel').addEventListener('click', () => { close(); resolve(false); });
      modal.querySelector('#previewConfirm').addEventListener('click', () => { close(); resolve(true); });

      // 折叠/展开切换（事件委托）
      modal.addEventListener('click', (e) => {
        const btn = e.target.closest('.collapse-toggle');
        if (!btn) return;
        const item = btn.closest('.category-preview-item');
        const list = item?.querySelector('.bookmark-list-preview');
        if (!list) return;
        const collapsed = list.classList.contains('collapsed');
        if (collapsed) {
          list.classList.remove('collapsed');
          btn.textContent = window.I18n ? window.I18n.t('common.collapse') : '收起';
        } else {
          list.classList.add('collapsed');
          btn.textContent = window.I18n ? window.I18n.t('preview.expand') : '展开全部';
        }
      });
    });
  }

  showBackupConfirmDialog() {
    return new Promise((resolve) => {
      // 创建对话框
      const dialog = document.createElement('div');
      dialog.className = 'backup-confirm-dialog';
      dialog.innerHTML = `
        <div class="dialog-overlay">
          <div class="dialog-content">
            <div class="dialog-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <h3>开始整理前</h3>
            </div>
            <div class="dialog-body">
              <p>建议在整理前先备份书签，以防数据丢失。</p>
              <p>是否要先备份书签？</p>
            </div>
            <div class="dialog-actions">
              <button class="dialog-btn secondary" id="skipBackup">跳过备份</button>
              <button class="dialog-btn primary" id="doBackup">先备份</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // 绑定事件
      document.getElementById('doBackup').addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(true);
      });

      document.getElementById('skipBackup').addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(false);
      });
    });
  }

  showOrganizingState() {
    // 隐藏统计信息、搜索框、分类列表等
    document.querySelector('.stats').style.display = 'none';
    document.querySelector('.search').style.display = 'none';
    document.querySelector('.categories').style.display = 'none';
    const uncat = document.querySelector('.uncategorized');
    if (uncat) uncat.style.display = 'none';
  }

  // 移除整理完成后的分类管理/待分类展示，改由预览确认完成
  showOrganizedState() {
    // 保持初始界面不变，仅提示完成
    document.querySelector('.stats').style.display = 'grid';
    document.querySelector('.search').style.display = 'block';
    document.querySelector('.categories').style.display = 'none';
    const uncat = document.querySelector('.uncategorized');
    if (uncat) uncat.style.display = 'none';
  }



  showFeatureTips() {
    const t = (k) => (window.I18n ? window.I18n.t(k) : k);
    this.showTipModal([
      { icon: '📥', title: t('tips.main') || '主要功能', content: t('tips.main.desc') || 'TidyMark 可以根据网站内容和URL自动为您的书签分类，让书签管理变得简单高效。' },
      { icon: '🚀', title: t('tips.quickstart') || '快速开始', content: t('tips.quickstart.desc') || '系统已内置常用的分类规则，包括开发、社交、购物等分类，让您的书签井然有序。' },
      { icon: '⚙️', title: t('tips.customize') || '个性化配置', content: t('tips.customize.desc') || '在设置中您可以自定义分类规则，调整分类逻辑，让整理更符合您的使用习惯。' }
    ]);
  }

  showTipModal(tips) {
    let currentTip = 0;
    
    const modal = document.createElement('div');
    modal.className = 'tip-modal';
    modal.innerHTML = `
      <div class="tip-modal-content">
        <div class="tip-header">
          <span class="tip-counter">${currentTip + 1} / ${tips.length}</span>
          <button class="tip-close">×</button>
        </div>
        <div class="tip-body">
          <div class="tip-icon">${tips[currentTip].icon}</div>
          <h3 class="tip-title">${tips[currentTip].title}</h3>
          <p class="tip-content">${tips[currentTip].content}</p>
        </div>
        <div class="tip-footer">
          <button class="btn btn-secondary tip-prev" ${currentTip === 0 ? 'disabled' : ''}>上一个</button>
          <button class="btn btn-primary tip-next">${currentTip === tips.length - 1 ? '完成' : '下一个'}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加事件监听
    const prevBtn = modal.querySelector('.tip-prev');
    const nextBtn = modal.querySelector('.tip-next');
    const closeBtn = modal.querySelector('.tip-close');
    const counter = modal.querySelector('.tip-counter');
    const icon = modal.querySelector('.tip-icon');
    const title = modal.querySelector('.tip-title');
    const content = modal.querySelector('.tip-content');
    
    const updateTip = () => {
      counter.textContent = `${currentTip + 1} / ${tips.length}`;
      icon.textContent = tips[currentTip].icon;
      title.textContent = tips[currentTip].title;
      content.textContent = tips[currentTip].content;
      prevBtn.disabled = currentTip === 0;
      nextBtn.textContent = currentTip === tips.length - 1 ? '完成' : '下一个';
    };
    
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    prevBtn.onclick = () => {
      if (currentTip > 0) {
        currentTip--;
        updateTip();
      }
    };
    
    nextBtn.onclick = () => {
      if (currentTip < tips.length - 1) {
        currentTip++;
        updateTip();
      } else {
        modal.remove();
      }
    };
    
    // 点击背景关闭
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
  }



  searchBookmarks(query) {
    if (!query.trim()) {
      return;
    }

    const filteredBookmarks = this.uncategorizedBookmarks.filter(bookmark =>
      bookmark.title.toLowerCase().includes(query.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(query.toLowerCase())
    );

    const uncategorizedList = document.getElementById('uncategorizedList');
    if (!uncategorizedList) return; // 未分类区域已移除，直接跳过
    uncategorizedList.innerHTML = '';

    if (filteredBookmarks.length === 0) {
      uncategorizedList.innerHTML = `
        <div style="text-align: center; color: #64748b; padding: 20px;">
          <p>未找到匹配的书签</p>
        </div>
      `;
      return;
    }

    filteredBookmarks.forEach(bookmark => {
      const bookmarkElement = this.createBookmarkElement(bookmark);
      uncategorizedList.appendChild(bookmarkElement);
    });
  }

  async addCategory() {
    const name = prompt('请输入分类名称:');
    if (!name || !name.trim()) return;

    try {
      const newCategory = {
        id: Date.now().toString(),
        name: name.trim(),
        bookmarkIds: [],
        keywords: [],
        createdAt: new Date().toISOString()
      };

      this.categories.push(newCategory);
      await chrome.storage.local.set({ categories: this.categories });
      this.renderCategories();

    } catch (error) {
      console.error('添加分类失败:', error);
      this.showError('添加分类失败');
    }
  }

  async editCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return;

    const newName = prompt('请输入新的分类名称:', category.name);
    if (!newName || !newName.trim()) return;

    try {
      category.name = newName.trim();
      await chrome.storage.local.set({ categories: this.categories });
      this.renderCategories();

    } catch (error) {
      console.error('编辑分类失败:', error);
      this.showError('编辑分类失败');
    }
  }

  async deleteCategory(categoryId) {
    if (!confirm('确定要删除这个分类吗？')) return;

    try {
      this.categories = this.categories.filter(c => c.id !== categoryId);
      await chrome.storage.local.set({ categories: this.categories });
      this.renderCategories();

    } catch (error) {
      console.error('删除分类失败:', error);
      this.showError('删除分类失败');
    }
  }

  viewCategory(categoryId) {
    // 这里可以实现查看分类详情的功能
    console.log('查看分类:', categoryId);
  }

  showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  }

  showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
  }

  showSuccess(message) {
    // 简单的成功提示
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// 初始化
let popupManager;
document.addEventListener('DOMContentLoaded', () => {
  popupManager = new PopupManager();
});

// 添加CSS动画
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
`;
document.head.appendChild(style);