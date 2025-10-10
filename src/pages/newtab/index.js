// newtab.js - 简洁导航页逻辑

(async function () {
  const elTime = document.getElementById('current-time');
  const elForm = document.getElementById('search-form');
  const elInput = document.getElementById('search-input');
  const elEngine = document.getElementById('search-engine');
  const elThemeBtn = document.getElementById('theme-toggle-btn');
  const elThemeMenu = document.getElementById('theme-menu');
  const elThemeDropdown = document.querySelector('.theme-dropdown');
  const elSections = document.getElementById('bookmark-sections');
  const elPage = document.querySelector('.page');

  // 时间实时更新
  function updateTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const dd = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const wk = now.toLocaleDateString(undefined, { weekday: 'short' }); // 例：周一 / Mon
    elTime.textContent = `${hh}:${mm}:${ss} ${wk}`;
    elTime.title = dd;
  }

  updateTime();
  setInterval(updateTime, 1000);

  // 搜索跳转（默认 Google，可扩展）
  const engines = {
    google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    duck: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    baidu: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`
  };
  let selectedEngine = 'google';
  let themeMode = 'system';
  let categoryOrder = [];
  let allBookmarks = [];
  const elMain = document.querySelector('.main');
  const elHint = document.getElementById('search-hint');
  let inputDebounceTimer = null;

  async function loadCategoryOrder() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const { categoryOrder: stored } = await chrome.storage.local.get(['categoryOrder']);
        if (Array.isArray(stored)) categoryOrder = stored;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('categoryOrder');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) categoryOrder = arr;
        }
      }
    } catch {}
  }

  function saveCategoryOrder(order) {
    categoryOrder = order.slice();
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ categoryOrder });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('categoryOrder', JSON.stringify(categoryOrder));
      }
    } catch {}
  }

  function persistCurrentCategoryOrder() {
    const order = Array.from(elSections.querySelectorAll('.section')).map(s => s.dataset.key);
    if (order.length) saveCategoryOrder(order);
  }

  function renderThemeIcon(mode) {
    if (!elThemeBtn) return;
    const icons = {
      system: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.57a.5.5 0 0 0 .12-.65l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96c-.5-.41-1.06-.72-1.63-.95l-.36-2.54a.5.5 0 0 0-.5-.43h-3.84a.5.5 0 0 0-.5.43l-.36 2.54c-.57.23-1.12.54-1.63.95l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.65l2.03 1.57c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.57a.5.5 0 0 0-.12.65l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.41 1.06.72 1.63.95l.36 2.54a.5.5 0 0 0 .5.43h3.84a.5.5 0 0 0 .5-.43l.36-2.54c.57-.23 1.12-.54 1.63-.95l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.65l-2.03-1.57ZM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>`,
      light: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42Zm10.48 0 1.8-1.79 1.41 1.41-1.79 1.8-1.42-1.42ZM12 4V1h-2v3h2Zm0 19v-3h-2v3h2ZM4 12H1v2h3v-2Zm22 0h-3v2h3v-2ZM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79Zm10.48 0 1.42 1.42 1.79-1.8-1.41-1.41-1.8 1.79ZM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>`,
      dark: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`
    };
    elThemeBtn.innerHTML = icons[mode] || icons.system;
  }

  async function loadEnginePreference() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const { searchEngine } = await chrome.storage.local.get(['searchEngine']);
        if (searchEngine && engines[searchEngine]) {
          selectedEngine = searchEngine;
        }
      } else if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem('searchEngine');
        if (val && engines[val]) selectedEngine = val;
      }
    } catch {}
    if (elEngine) elEngine.value = selectedEngine;
  }

  function saveEnginePreference(val) {
    selectedEngine = val;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ searchEngine: val });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('searchEngine', val);
      }
    } catch {}
  }

  if (elEngine) {
    elEngine.addEventListener('change', (e) => {
      const val = e.target.value;
      if (engines[val]) saveEnginePreference(val);
    });
  }
  loadEnginePreference();

  // 主题模式：system / light / dark
  function applyTheme(mode) {
    themeMode = mode || 'system';
    if (themeMode === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
    renderThemeIcon(themeMode);
  }

  async function loadThemePreference() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const { themeMode: stored } = await chrome.storage.local.get(['themeMode']);
        if (stored && ['system', 'light', 'dark'].includes(stored)) {
          themeMode = stored;
        }
      } else if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem('themeMode');
        if (val && ['system', 'light', 'dark'].includes(val)) themeMode = val;
      }
    } catch {}
    applyTheme(themeMode);
  }

  function saveThemePreference(val) {
    themeMode = val;
    applyTheme(val);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ themeMode: val });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('themeMode', val);
      }
    } catch {}
  }

  if (elThemeBtn && elThemeMenu) {
    elThemeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elThemeMenu.hidden = !elThemeMenu.hidden;
    });
    elThemeMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = item.dataset.mode;
        if (['system', 'light', 'dark'].includes(val)) {
          saveThemePreference(val);
        }
        elThemeMenu.hidden = true;
      });
    });
    document.addEventListener('click', (e) => {
      if (!elThemeDropdown) return;
      if (!elThemeDropdown.contains(e.target)) {
        elThemeMenu.hidden = true;
      }
    });
  }
  loadThemePreference();

  elForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = (elInput.value || '').trim();
    if (!q) return;
    // 书签搜索前缀：# 或 ＃（空格可选）
    const bm = parseBookmarkSearch(q);
    if (bm) {
      renderBookmarkSearchResults(bm.keyword);
      return;
    }
    // 如果是URL则直接跳转
    try {
      const url = new URL(q);
      window.open(url.href, '_blank', 'noopener');
      return;
    } catch {}
    const eng = (elEngine && engines[elEngine.value]) ? elEngine.value : selectedEngine;
    window.open(engines[eng](q), '_blank', 'noopener');
  });

  // 实时书签搜索（输入事件）
  if (elInput) {
    elInput.addEventListener('input', () => {
      const val = elInput.value || '';
      const bm = parseBookmarkSearch(val);
      if (!bm || !bm.keyword) {
        clearBookmarkSearchResults();
        if (elHint) elHint.textContent = '输入“#”开头进行书签搜索';
        return;
      }
      if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
      inputDebounceTimer = setTimeout(() => {
        if (allBookmarks.length === 0) return;
        renderBookmarkSearchResults(bm.keyword);
        if (elHint) elHint.textContent = `正在搜索书签：${bm.keyword}`;
      }, 120);
    });
  }

  // 获取书签并按分类渲染
  async function loadAndRenderBookmarks() {
    let categories = {};

    // 扁平化工具
    function flatten(bookmarkTree) {
      const out = [];
      function walk(nodes, parentPath = '') {
        for (const node of nodes) {
          if (node.url) {
            out.push({
              id: node.id,
              title: node.title,
              url: node.url,
              parentPath,
              type: 'bookmark'
            });
          } else if (node.children) {
            const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
            out.push({ id: node.id, title: node.title, type: 'folder', path: currentPath, parentPath });
            walk(node.children, currentPath);
          }
        }
      }
      walk(bookmarkTree);
      return out;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.bookmarks) {
        const tree = await chrome.bookmarks.getTree();
        const flat = flatten(tree);
        for (const b of flat) {
          if (b.type === 'bookmark') {
            const cat = b.parentPath || '未分类';
            (categories[cat] ||= []).push(b);
            allBookmarks.push({ title: b.title, url: b.url, parentPath: b.parentPath });
          }
        }
      } else {
        // 预览环境：本地示例数据
        const demo = [
          { title: 'GitHub', url: 'https://github.com', parentPath: '开发/代码托管' },
          { title: 'Stack Overflow', url: 'https://stackoverflow.com', parentPath: '开发/问答' },
          { title: 'MDN', url: 'https://developer.mozilla.org', parentPath: '开发/文档' },
          { title: 'Google', url: 'https://www.google.com', parentPath: '工具/搜索' },
          { title: 'Bing', url: 'https://www.bing.com', parentPath: '工具/搜索' },
          { title: 'Dribbble', url: 'https://dribbble.com', parentPath: '设计/灵感' },
          { title: 'Figma', url: 'https://figma.com', parentPath: '设计/工具' },
          { title: 'YouTube', url: 'https://youtube.com', parentPath: '娱乐/视频' },
        ];
        for (const b of demo) {
          const cat = b.parentPath || '未分类';
          (categories[cat] ||= []).push(b);
          allBookmarks.push({ title: b.title, url: b.url, parentPath: b.parentPath });
        }
      }
    } catch (err) {
      console.error('加载书签失败', err);
      categories = { '未分类': [] };
    }

    renderCategories(categories);
  }

  let dragSrcSection = null;

  function renderCategories(categories) {
    elSections.innerHTML = '';
    const entriesRaw = Object.entries(categories);

    const ROOTS = new Set([
      '书签栏', 'Bookmarks bar', 'Bookmarks Bar',
      '其他书签', 'Other bookmarks',
      '移动设备书签', 'Mobile bookmarks'
    ].map(s => s.toLowerCase()));

    function formatCategory(path) {
      const parts = String(path || '').split('/').filter(Boolean);
      if (!parts.length) return '未分类';
      if (ROOTS.has(parts[0].toLowerCase())) parts.shift();
      return parts.join('/') || '未分类';
    }

    const entries = entriesRaw.sort((a, b) => {
      const fa = formatCategory(a[0]);
      const fb = formatCategory(b[0]);
      const ia = categoryOrder.indexOf(fa);
      const ib = categoryOrder.indexOf(fb);
      if (ia !== -1 || ib !== -1) {
        return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib);
      }
      return fa.localeCompare(fb, 'zh-Hans-CN');
    });

    for (const [category, items] of entries) {
      const section = document.createElement('section');
      section.className = 'section';

      const header = document.createElement('div');
      header.className = 'section-header';
      const title = document.createElement('div');
      title.className = 'section-title';
      title.textContent = formatCategory(category);
      const count = document.createElement('div');
      count.className = 'section-count';
      count.textContent = `${items.length} 项`;

      const headLeft = document.createElement('div');
      headLeft.className = 'section-head-left';
      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'drag-handle';
      handle.title = '拖拽排序';
      handle.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 7a2 2 0 1 1-4 0a2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0ZM9 17a2 2 0 1 1-4 0a2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0a2 2 0 0 1 4 0Z"/></svg>`;
      headLeft.appendChild(handle);
      headLeft.appendChild(title);
      header.appendChild(headLeft);
      header.appendChild(count);

      const list = document.createElement('ul');
      list.className = 'list';
      items.forEach(item => {
        const li = document.createElement('li');

        const link = document.createElement('a');
        link.className = 'item';
        link.href = item.url || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const bullet = document.createElement('span');
        bullet.className = 'bullet';

        const main = document.createElement('div');
        main.className = 'item-main';
        const t = document.createElement('div');
        t.className = 'title';
        t.textContent = item.title || item.url || '未命名';
        t.title = item.title || item.url || '未命名';
        const u = document.createElement('div');
        u.className = 'url';
        u.textContent = item.url || '';
        main.appendChild(t);
        main.appendChild(u);
        link.appendChild(bullet);
        link.appendChild(main);
        li.appendChild(link);
        list.appendChild(li);
      });
      // 绑定拖拽信息（仅图标可拖拽）
      section.dataset.key = title.textContent;
      handle.draggable = true;
      handle.addEventListener('dragstart', (e) => {
        dragSrcSection = section;
        section.classList.add('dragging');
        e.dataTransfer.setData('text/plain', section.dataset.key);
        e.dataTransfer.effectAllowed = 'move';
      });
      section.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = section.getBoundingClientRect();
        const toBefore = (e.clientY - rect.top) < rect.height / 2;
        section.classList.toggle('drop-before', toBefore);
        section.classList.toggle('drop-after', !toBefore);
      });
      section.addEventListener('dragleave', () => {
        section.classList.remove('drop-before', 'drop-after');
      });
      section.addEventListener('drop', (e) => {
        e.preventDefault();
        section.classList.remove('drop-before', 'drop-after');
        if (dragSrcSection && dragSrcSection !== section) {
          const rect = section.getBoundingClientRect();
          const toBefore = (e.clientY - rect.top) < rect.height / 2;
          if (toBefore) {
            elSections.insertBefore(dragSrcSection, section);
          } else {
            elSections.insertBefore(dragSrcSection, section.nextSibling);
          }
          persistCurrentCategoryOrder();
        }
      });
      handle.addEventListener('dragend', () => {
        section.classList.remove('dragging');
        dragSrcSection = null;
        elSections.querySelectorAll('.section').forEach(s => s.classList.remove('drop-before', 'drop-after'));
      });

      section.appendChild(header);
      section.appendChild(list);
      elSections.appendChild(section);
    }
  }

  await loadCategoryOrder();
  loadAndRenderBookmarks();

  // 书签搜索前缀解析（支持 # 与 ＃，空格可选）
  function parseBookmarkSearch(q) {
    const s = (q || '').trimStart();
    if (!s) return null;
    if (s.startsWith('#') || s.startsWith('＃')) {
      const rest = s.slice(1);
      const keyword = rest.startsWith(' ') ? rest.slice(1).trim() : rest.trim();
      return { keyword };
    }
    return null;
  }

  function clearBookmarkSearchResults() {
    const existing = document.getElementById('bookmark-search-results');
    if (existing) existing.remove();
  }

  function renderBookmarkSearchResults(keyword) {
    clearBookmarkSearchResults();
    const kw = (keyword || '').trim().toLowerCase();
    if (!kw) return;
    const matches = allBookmarks.filter(b =>
      (b.title || '').toLowerCase().includes(kw) || (b.url || '').toLowerCase().includes(kw)
    );

    const section = document.createElement('section');
    section.className = 'section';
    section.id = 'bookmark-search-results';

    const header = document.createElement('div');
    header.className = 'section-header';
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = `搜索结果`;
    const count = document.createElement('div');
    count.className = 'section-count';
    count.textContent = `${matches.length} 项`;
    header.appendChild(title);
    header.appendChild(count);

    const list = document.createElement('ul');
    list.className = 'list';
    matches.forEach(item => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.className = 'item';
      link.href = item.url || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const bullet = document.createElement('span');
      bullet.className = 'bullet';
      const main = document.createElement('div');
      main.className = 'item-main';
      const t = document.createElement('div');
      t.className = 'title';
      t.textContent = item.title || item.url || '未命名';
      t.title = item.title || item.url || '未命名';
      const u = document.createElement('div');
      u.className = 'url';
      u.textContent = item.url || '';
      main.appendChild(t);
      main.appendChild(u);
      link.appendChild(bullet);
      link.appendChild(main);
      li.appendChild(link);
      list.appendChild(li);
    });

    section.appendChild(header);
    section.appendChild(list);
    if (elMain && elSections) {
      elMain.insertBefore(section, elSections);
    } else {
      document.body.appendChild(section);
    }
  }
})();