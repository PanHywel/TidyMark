(() => {
  const input = document.getElementById('searchBox');
  const resultsEl = document.getElementById('results');
  const stateEl = document.getElementById('state');
  const allResultsEl = document.getElementById('allResults');
  const allStateEl = document.getElementById('allState');
  const allTitleEl = document.getElementById('allTitle');
  let items = [];
  let activeIndex = -1;
  let allItems = [];
  let composing = false;

  const focusInput = () => {
    if (!input) return;
    try {
      requestAnimationFrame(() => setTimeout(() => input.focus({ preventScroll: true }), 0));
    } catch (_) {
      try { input.focus(); } catch (_) {}
    }
  };

  // 初次加载与标签聚焦时都尝试聚焦输入框
  window.addEventListener('load', focusInput, { once: true });
  window.addEventListener('focus', focusInput);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') focusInput();
  });

  // 接收后台广播消息，进行聚焦
  try {
    chrome?.runtime?.onMessage?.addListener((msg) => {
      if (msg && msg.type === 'focusSearchInput') {
        if (input) input.value = '';
        focusInput();
        // 复用时清空结果并展示“全部书签”区块
        clearResults();
        showAllSection(true);
        if (allItems && allItems.length > 0) {
          renderAllBookmarks(allItems);
        } else {
          loadAllBookmarks();
        }
      }
    });
  } catch (_) {}

  const debounce = (fn, ms = 200) => {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const setState = (text, hidden = false) => {
    if (!stateEl) return;
    stateEl.textContent = text || '';
    stateEl.hidden = hidden;
  };

  const setAllState = (text, hidden = false) => {
    if (!allStateEl) return;
    allStateEl.textContent = text || '';
    allStateEl.hidden = hidden;
  };

  const clearResults = () => {
    items = [];
    activeIndex = -1;
    if (resultsEl) resultsEl.innerHTML = '';
    setState('', true);
  };

  const showAllSection = (show) => {
    if (allTitleEl) allTitleEl.hidden = !show;
    if (allResultsEl) allResultsEl.hidden = !show;
    if (!show) setAllState('', true);
  };

  const highlight = (text, q) => {
    if (!q) return escapeHtml(text);
    const escQ = escapeRegExp(q);
    const re = new RegExp(`(${escQ})`, 'ig');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  };

  const escapeHtml = (str = '') => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapeRegExp = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const faviconFor = (url) => {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.hostname}/favicon.ico`;
    } catch (_) {
      return '';
    }
  };

  const defaultIconUrl = () => {
    try {
      return chrome.runtime.getURL('icons/icon16.svg');
    } catch (_) {
      return '/icons/icon16.svg';
    }
  };

  const renderAllBookmarks = (list) => {
    if (!allResultsEl) return;
    allResultsEl.innerHTML = '';
    if (!list || list.length === 0) {
      setAllState('没有书签', false);
      return;
    }
    setAllState('', true);
    const frag = document.createDocumentFragment();
    list.forEach((bk) => {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = `
        <img class="favicon" alt="" />
        <div class="meta">
          <div class="titleLine">
            <div class="titleText">${escapeHtml(bk.title || bk.url || '')}</div>
          </div>
          <div class="urlText">${escapeHtml(bk.url || '')}</div>
        </div>
      `;
      const img = li.querySelector('.favicon');
      const iconSrc = faviconFor(bk.url);
      img.src = iconSrc || defaultIconUrl();
      img.addEventListener('error', () => { img.src = defaultIconUrl(); });
      li.addEventListener('click', () => openBookmark(bk.url));
      frag.appendChild(li);
    });
    allResultsEl.appendChild(frag);
  };

  const renderResults = (list, q) => {
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    if (!list || list.length === 0) {
      setState('无匹配结果', false);
      return;
    }
    setState('', true);
    const frag = document.createDocumentFragment();
    list.forEach((bk, idx) => {
      const li = document.createElement('li');
      li.className = 'item';
      li.tabIndex = -1;
      li.dataset.index = String(idx);
      li.innerHTML = `
        <img class="favicon" alt="" />
        <div class="meta">
          <div class="titleLine">
            <div class="titleText">${highlight(bk.title || bk.url || '', q)}</div>
          </div>
          <div class="urlText">${highlight(bk.url || '', q)}</div>
        </div>
      `;
      const img = li.querySelector('.favicon');
      const iconSrc = faviconFor(bk.url);
      img.src = iconSrc || defaultIconUrl();
      img.addEventListener('error', () => { img.src = defaultIconUrl(); });
      li.addEventListener('click', () => openBookmark(bk.url));
      frag.appendChild(li);
    });
    resultsEl.appendChild(frag);
    // 默认选中第一项
    activeIndex = list.length > 0 ? 0 : -1;
    updateActive();
  };

  const updateActive = () => {
    if (!resultsEl) return;
    resultsEl.querySelectorAll('.item').forEach(el => el.classList.remove('active'));
    if (activeIndex >= 0) {
      const el = resultsEl.querySelector(`.item[data-index="${activeIndex}"]`);
      if (el) el.classList.add('active');
    }
  };

  const moveActive = (delta) => {
    if (!items || items.length === 0) return;
    activeIndex = Math.max(0, Math.min(items.length - 1, activeIndex + delta));
    updateActive();
  };

  const openBookmark = (url) => {
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener');
    } catch (_) {}
  };

  const doSearch = async (q) => {
    const query = (q || '').trim();
    if (query.length === 0) {
      clearResults();
      // 显示全部书签区块
      showAllSection(true);
      // 若还未加载，则触发加载；否则直接渲染
      if (allItems && allItems.length > 0) {
        renderAllBookmarks(allItems);
      } else {
        loadAllBookmarks();
      }
      return;
    }
    // 输入有查询时隐藏“全部书签”区块
    showAllSection(false);
    setState('正在搜索…', false);
    try {
      const res = await chrome.runtime.sendMessage({ action: 'searchBookmarks', query });
      if (!res || !res.success) throw new Error(res && res.error || '搜索失败');
      items = Array.isArray(res.data) ? res.data : [];
      renderResults(items, query);
    } catch (e) {
      setState('搜索失败，请稍后重试', false);
      console.warn(e);
    }
  };

  const debouncedSearch = debounce(doSearch, 220);

  input?.addEventListener('input', (e) => {
    debouncedSearch(String(e.target.value || ''));
  });

  // 处理输入法组合状态，避免候选阶段的回车或方向键触发行为
  input?.addEventListener('compositionstart', () => { composing = true; });
  input?.addEventListener('compositionend', () => { composing = false; });

  input?.addEventListener('keydown', (e) => {
    // 输入法候选阶段，不拦截键盘事件（包含 Enter/方向键），避免误触
    if (e.isComposing || composing || e.keyCode === 229) {
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) openBookmark(items[activeIndex].url);
    }
  });

  // 扁平化书签树（仅保留包含 url 的节点）
  const flattenBookmarks = (tree) => {
    const out = [];
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.url) out.push(n);
        if (n.children) walk(n.children);
      }
    };
    walk(Array.isArray(tree) ? tree : [tree]);
    return out;
  };

  const loadAllBookmarks = async () => {
    setAllState('正在加载全部书签…', false);
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getBookmarks' });
      if (!res || !res.success) throw new Error(res && res.error || '加载书签失败');
      const tree = Array.isArray(res.data) ? res.data : [];
      allItems = flattenBookmarks(tree).filter(b => b && b.url);
      renderAllBookmarks(allItems);
    } catch (e) {
      setAllState('加载失败，请稍后重试', false);
      console.warn(e);
    }
  };

  // 初次进入显示全部书签
  showAllSection(true);
  loadAllBookmarks();
})();