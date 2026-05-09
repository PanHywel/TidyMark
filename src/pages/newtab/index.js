// newtab.js - 简洁导航页逻辑

(async function () {
  // Initialize i18n for New Tab page
  try {
    if (window.I18n) {
      await window.I18n.init();
    }
  } catch {}

  // 访问统计与热门栏目配置
  let visitStats = { byCategory: {}, byBookmark: {}, lastByBookmark: {} };
  let navShowTopVisited = false;
  let navTopVisitedCount = 10;
  let categoriesMapCache = null;
  let bookmarkColumns = 2;

  // 语言检测
  const _lang = (window.I18n && typeof window.I18n.getLanguageSync === 'function')
    ? window.I18n.getLanguageSync()
    : (navigator.language || 'en');
  let _isZh = String(_lang).toLowerCase().startsWith('zh');

  // 模块开关状态
  let sixtyEnabled = true;
  let calendarEnabled = true;
  
  // 60s 提示文本
  let currentSixtyTip = '';
  const DEFAULT_SUBTITLE = '愿你高效、专注地浏览每一天';
  
  // 天气设置缓存
  let cachedWeatherSettings = null;

  const elTime = document.getElementById('current-time');
  const elForm = document.getElementById('search-form');
  const elInput = document.getElementById('search-input');
  const elThemeBtn = document.getElementById('theme-toggle-btn');
  const elThemeMenu = document.getElementById('theme-menu');
  const elThemeDropdown = document.querySelector('.theme-dropdown');
  const elSections = document.getElementById('bookmark-sections');
  const elPage = document.querySelector('.page');
  const elWeather = document.getElementById('weather-bar');
  const elSubtitleMain = document.getElementById('subtitle-main');
  const elWallpaperBtn = document.getElementById('wallpaper-toggle-btn');
  // 书签展示由配置控制；不再使用顶部按钮
  const elBookmarksPlaceholder = document.getElementById('bookmarks-placeholder');
  const elMain = document.querySelector('.main');
  // 60s 读懂世界
  const elSixty = document.getElementById('sixty-seconds');
  const elSixtyBody = document.getElementById('sixty-body');
  const elSixtyDate = document.getElementById('sixty-date');
  const elModulesRow = document.getElementById('modules-row');
  // 已移除单独的"查看原文"按钮
  
  // 壁纸：60s Bing 壁纸
  const WALLPAPER_TTL = 6 * 60 * 60 * 1000; // 6小时缓存
  const WALLPAPER_CACHE_KEY = 'bing_wallpaper_cache_v2';
  // 60s 项目的多实例备用路由（用于 60s 与 Bing 壁纸）
  const SIXTY_INSTANCES = [
    'https://60api.09cdn.xyz',
    'https://60s.viki.moe',
    'https://60s.zeabur.app',
    'https://60s.crystelf.top',
    'https://cqxx.site',
    'https://api.yanyua.icu',
    'https://60s.tmini.net',
    'https://60s.7se.cn'
  ];

  // 60s 首选可用域名缓存键
  const SIXTY_PREF_KEY = 'sixty_preferred_instance_v1';

  async function getPreferredSixtyInstance() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const obj = await chrome.storage.local.get([SIXTY_PREF_KEY]);
        const v = obj[SIXTY_PREF_KEY];
        if (typeof v === 'string' && v) return v;
      } else if (typeof localStorage !== 'undefined') {
        const v = localStorage.getItem(SIXTY_PREF_KEY);
        if (typeof v === 'string' && v) return v;
      }
    } catch {}
    return null;
  }

  async function setPreferredSixtyInstance(base) {
    try {
      if (!base || typeof base !== 'string') return;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [SIXTY_PREF_KEY]: base });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SIXTY_PREF_KEY, base);
      }
    } catch {}
  }

  async function getCachedWallpaper() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const obj = await chrome.storage.local.get([WALLPAPER_CACHE_KEY]);
        const payload = obj[WALLPAPER_CACHE_KEY];
        if (payload && payload.timestamp && (Date.now() - payload.timestamp) < WALLPAPER_TTL) {
          return payload.data;
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(WALLPAPER_CACHE_KEY);
        if (raw) {
          const payload = JSON.parse(raw);
          if (payload && payload.timestamp && (Date.now() - payload.timestamp) < WALLPAPER_TTL) {
            return payload.data;
          }
        }
      }
    } catch {}
    return null;
  }

  function _getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function getWallpaperCachePayload() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const obj = await chrome.storage.local.get([WALLPAPER_CACHE_KEY]);
        const payload = obj[WALLPAPER_CACHE_KEY];
        if (payload && payload.data) return payload;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(WALLPAPER_CACHE_KEY);
        if (raw) {
          const payload = JSON.parse(raw);
          if (payload && payload.data) return payload;
        }
      }
    } catch {}
    return null;
  }

  function _normalizeDayFromData(data) {
    try {
      const raw = String(data.update_date || data.update_date_at || '').trim();
      if (!raw) return _getTodayKey();
      const onlyDigits = raw.replace(/[^0-9]/g, '');
      if (onlyDigits.length >= 8) {
        const y = onlyDigits.slice(0, 4);
        const m = onlyDigits.slice(4, 6);
        const d = onlyDigits.slice(6, 8);
        return `${y}-${m}-${d}`;
      }
      return raw;
    } catch {
      return _getTodayKey();
    }
  }

  async function setCachedWallpaper(data) {
    const day = _normalizeDayFromData(data);
    const payload = { timestamp: Date.now(), day, data };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [WALLPAPER_CACHE_KEY]: payload });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WALLPAPER_CACHE_KEY, JSON.stringify(payload));
      }
    } catch {}
  }

  // 优先使用 Bing 官方壁纸（UHD/桌面壁纸用途），遵循"walls"用法
  async function fetchBingOfficialWalls(signal, random = false) {
    try {
      const lang = (window.I18n && typeof window.I18n.getLanguageSync === 'function')
        ? window.I18n.getLanguageSync()
        : (navigator.language || 'en-US');
      // 规范化为 Bing mkt 参数（如 zh-CN、en-US 等）
      const mkt = String(lang || 'en-US')
        .replace('_', '-')
        .replace(/\s+/g, '')
        .trim();

      // 如果是随机模式，获取多张壁纸并随机选择一张
      const n = random ? 8 : 1; // 随机模式下获取8张壁纸
      const idx = random ? Math.floor(Math.random() * 8) : 0; // 随机模式下随机选择历史壁纸
      
      const url = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=${idx}&n=${n}&uhd=1&mkt=${encodeURIComponent(mkt)}`;
      const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
      if (!resp.ok) throw new Error(window.I18n ? window.I18n.tf('newtab.bing.status', { status: resp.status }) : `Bing 接口返回状态 ${resp.status}`);
      const json = await resp.json();
      const images = json && Array.isArray(json.images) ? json.images : [];
      
      // 随机模式下从返回的壁纸中随机选择一张
      const img = random && images.length > 0 
        ? images[Math.floor(Math.random() * images.length)] 
        : (images[0] || null);
        
      const rel = img && (img.url || '');
      if (!rel) throw new Error(window.I18n ? window.I18n.t('newtab.bing.noUrl') : 'Bing 接口未提供图片URL');
      const cover = `https://www.bing.com${rel}`;
      return {
        title: (img && img.title) || '',
        description: (img && img.copyright) || '',
        main_text: '',
        copyright: (img && img.copyright) || '',
        update_date: (img && img.enddate) || '',
        update_date_at: '',
        cover,
      };
    } catch (e) {
      throw e;
    }
  }

  async function fetchBingWallpaper60s(signal) {
    // 1) 优先尝试首选实例，其次依次回退其它实例
    let lastErr;
    const candidates = [...SIXTY_INSTANCES];
    try {
      const preferred = await getPreferredSixtyInstance();
      if (preferred && candidates.includes(preferred)) {
        try {
          const url = `${preferred}/v2/bing`;
          const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
          if (!resp.ok) throw new Error(window.I18n ? window.I18n.tf('newtab.wallpaper.serviceStatus', { status: resp.status }) : `壁纸服务返回状态 ${resp.status}`);
          const json = await resp.json();
          if (!json || typeof json !== 'object') throw new Error(window.I18n ? window.I18n.t('newtab.wallpaper.notJson') : '壁纸响应非JSON');
          if (json.code !== 200) throw new Error(window.I18n ? window.I18n.tf('newtab.wallpaper.errorCode', { code: json.code }) : `壁纸服务错误码 ${json.code}`);
          const d = json.data || {};
          const cover = d.cover_4k || d.cover;
          if (!cover) throw new Error(window.I18n ? window.I18n.t('newtab.wallpaper.noUrl') : '未提供壁纸链接');
          await setPreferredSixtyInstance(preferred);
          return {
            title: d.title,
            description: d.description,
            main_text: d.main_text,
            copyright: d.copyright,
            update_date: d.update_date,
            update_date_at: d.update_date_at,
            cover,
          };
        } catch (e) {
          lastErr = e;
          const idx = candidates.indexOf(preferred);
          if (idx >= 0) candidates.splice(idx, 1);
        }
      }
    } catch {}

    for (const base of candidates) {
      try {
        const url = `${base}/v2/bing`;
        const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
        if (!resp.ok) throw new Error(window.I18n ? window.I18n.tf('newtab.wallpaper.serviceStatus', { status: resp.status }) : `壁纸服务返回状态 ${resp.status}`);
        const json = await resp.json();
        if (!json || typeof json !== 'object') throw new Error(window.I18n ? window.I18n.t('newtab.wallpaper.notJson') : '壁纸响应非JSON');
        if (json.code !== 200) throw new Error(window.I18n ? window.I18n.tf('newtab.wallpaper.errorCode', { code: json.code }) : `壁纸服务错误码 ${json.code}`);
        const d = json.data || {};
        const cover = d.cover_4k || d.cover;
        if (!cover) throw new Error(window.I18n ? window.I18n.t('newtab.wallpaper.noUrl') : '未提供壁纸链接');
        await setPreferredSixtyInstance(base);
        return {
          title: d.title,
          description: d.description,
          main_text: d.main_text,
          copyright: d.copyright,
          update_date: d.update_date,
          update_date_at: d.update_date_at,
          cover,
        };
      } catch (e) {
        lastErr = e;
      }
    }

    // 2) 备用：直接请求 Bing 官方接口
    try {
      const url = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&uhd=1';
      const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
      if (!resp.ok) throw new Error(window.I18n ? window.I18n.tf('newtab.bing.status', { status: resp.status }) : `Bing 接口返回状态 ${resp.status}`);
      const json = await resp.json();
      const img = json && Array.isArray(json.images) ? json.images[0] : null;
      const rel = img && (img.url || '');
      if (!rel) throw new Error(window.I18n ? window.I18n.t('newtab.bing.noUrl') : 'Bing 接口未提供图片URL');
      const cover = `https://www.bing.com${rel}`;
      return {
        title: img && (img.title || ''),
        description: img && (img.copyright || ''),
        main_text: '',
        copyright: img && (img.copyright || ''),
        update_date: img && (img.enddate || ''),
        update_date_at: '',
        cover,
      };
    } catch (e) {
      throw lastErr || e;
    }
  }

  let wallpaperEnabled = true;

  // 随机壁纸加载函数
  async function loadRandomWallpaper() {
    try {
      if (!wallpaperEnabled) {
        // 关闭时清除背景
        if (document && document.body) {
          document.body.style.backgroundImage = 'none';
          document.body.classList.remove('has-wallpaper');
        }
        return;
      }
      
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 15000); // 最多等待15秒
      
      try {
        // 优先尝试 Bing 官方随机壁纸接口；失败再回退到 60s 多实例
        let wp;
        try {
          wp = await fetchBingOfficialWalls(ac.signal, true); // 启用随机模式
        } catch (e1) {
          wp = await fetchBingWallpaper60s(ac.signal);
        }
        
        if (wp && document && document.body) {
          document.body.style.backgroundImage = `url('${wp.cover}')`;
          document.body.classList.add('has-wallpaper');
          
          // 不缓存随机壁纸，每次刷新都获取新的
          console.log('随机壁纸已加载:', wp.title);
        } else {
          // 获取失败，清空背景
          document.body.style.backgroundImage = 'none';
          document.body.classList.remove('has-wallpaper');
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      console.warn(window.I18n ? window.I18n.t('newtab.wallpaper.loadFail') : '加载随机壁纸失败', err);
      if (document && document.body) {
        const hasBg = document.body.classList.contains('has-wallpaper');
        if (!hasBg) {
          document.body.style.backgroundImage = 'none';
          document.body.classList.remove('has-wallpaper');
        }
      }
    }
  }

  async function loadWallpaper(force = false) {
    try {
      if (!wallpaperEnabled) {
        // 关闭时清除背景
        if (document && document.body) {
          document.body.style.backgroundImage = 'none';
          document.body.classList.remove('has-wallpaper');
        }
        return;
      }
      // 先应用缓存（即便不是“新鲜”的），避免空白背景
      const cachedPayload = await getWallpaperCachePayload();
      const cachedData = cachedPayload && cachedPayload.data ? cachedPayload.data : null;
      const todayKey = _getTodayKey();
      if (cachedData && document && document.body) {
        document.body.style.backgroundImage = `url('${cachedData.cover}')`;
        document.body.classList.add('has-wallpaper');
      }

      // 仅在当天尚未成功获取或强制刷新时，尝试获取最新壁纸
      const needFetch = force || !cachedPayload || cachedPayload.day !== todayKey;
      let wp = null;
      if (needFetch) {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 15000); // 最多等待15秒
        try {
          // 优先尝试 Bing 官方“桌面壁纸”接口；失败再回退到 60s 多实例
          try {
            wp = await fetchBingOfficialWalls(ac.signal);
          } catch (e1) {
            wp = await fetchBingWallpaper60s(ac.signal);
          }
        } finally {
          clearTimeout(timer);
        }
        if (wp) await setCachedWallpaper(wp);
      }
      if (wp && document && document.body) {
        document.body.style.backgroundImage = `url('${wp.cover}')`;
        document.body.classList.add('has-wallpaper');
      } else if (!cachedData && document && document.body) {
        // 无缓存且获取失败，清空背景
        document.body.style.backgroundImage = 'none';
        document.body.classList.remove('has-wallpaper');
      }
    } catch (err) {
      console.warn(window.I18n ? window.I18n.t('newtab.wallpaper.loadFail') : '加载壁纸失败', err);
      if (document && document.body) {
        const hasBg = document.body.classList.contains('has-wallpaper');
        if (!hasBg) {
          document.body.style.backgroundImage = 'none';
          document.body.classList.remove('has-wallpaper');
        }
      }
    }
  }

  async function loadWallpaperPreference() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { wallpaperEnabled: stored } = await chrome.storage.sync.get(['wallpaperEnabled']);
        wallpaperEnabled = stored !== undefined ? !!stored : true; // 默认开启
      } else if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem('wallpaperEnabled');
        wallpaperEnabled = val === null ? true : val === 'true';
      }
    } catch {}
    renderWallpaperToggle();
  }

  function renderWallpaperToggle() {
    if (!elWallpaperBtn) return;
    elWallpaperBtn.classList.toggle('active', !!wallpaperEnabled);
    // 简单图标即可，保留 🖼️ 文本
    elWallpaperBtn.title = wallpaperEnabled 
      ? (window.I18n ? window.I18n.t('newtab.wallpaper.on') : '壁纸：已开启')
      : (window.I18n ? window.I18n.t('newtab.wallpaper.off') : '壁纸：已关闭');
  }

  // 壁纸偏好由设置页控制；新标签页不再提供按钮切换

  // 时间实时更新（跟随当前语言环境）
  function updateTime() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const lang = (window.I18n && typeof window.I18n.getLanguageSync === 'function')
      ? window.I18n.getLanguageSync()
      : (navigator.language || 'en');
    const locale = String(lang || 'en');
    const dd = now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    const wk = now.toLocaleDateString(locale, { weekday: 'short' }); // 例：周一 / Mon
    elTime.textContent = `${hh}:${mm}:${ss} ${wk}`;
    elTime.title = dd;
  }

  updateTime();
  setInterval(updateTime, 1000);
  
  // 并行加载所有偏好设置和API数据，优化加载速度
  await Promise.all([
    loadWallpaperPreference(),
    loadTopVisitedPreference(),
    loadBookmarkColumnsPreference(),
    loadVisitStats(),
    loadSixtyPreference(),
    loadCalendarPreference(),
    loadShowBookmarksPreference()
  ]);
  
  // 并行加载所有API数据（壁纸、天气、60s），使用缓存优先策略
  Promise.all([
    loadWallpaper().catch(err => console.warn('壁纸加载失败', err)),
    loadWeather().catch(err => console.warn('天气加载失败', err)),
    loadSixty().catch(err => console.warn('60s加载失败', err))
  ]);

  // 加载副标题缓存
  loadSubtitleCache();

  // 兜底：确保搜索输入在页面初始化后获得焦点（部分场景下浏览器可能忽略 HTML 的 autofocus）
  try {
    setTimeout(() => {
      if (elInput && typeof elInput.focus === 'function') {
        elInput.focus({ preventScroll: true });
      }
    }, 0);
  } catch {}

  // 书签列表是否展示（默认不展示）
  function applyShowBookmarks(show) {
    const visible = !!show;
    if (elSections) elSections.hidden = !visible;
    if (elBookmarksPlaceholder) elBookmarksPlaceholder.hidden = visible;
  }

  async function loadShowBookmarksPreference() {
    let show = false;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { showBookmarks } = await chrome.storage.sync.get(['showBookmarks']);
        show = !!showBookmarks;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('showBookmarks');
        if (raw != null) {
          try {
            const parsed = JSON.parse(raw);
            show = !!parsed;
          } catch {
            show = raw === 'true';
          }
        }
      }
    } catch {}
    applyShowBookmarks(show);
  }
  await loadShowBookmarksPreference();

  // 监听设置变化（扩展环境）
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.showBookmarks) {
        applyShowBookmarks(!!changes.showBookmarks.newValue);
      }
      if (area === 'sync' && changes.sixtySecondsEnabled) {
        applySixtyEnabled(!!changes.sixtySecondsEnabled.newValue);
      }
      if (area === 'sync' && changes.bookmarkColumns) {
        bookmarkColumns = Number.isFinite(changes.bookmarkColumns.newValue) ? Math.max(1, Math.min(5, Number(changes.bookmarkColumns.newValue))) : 2;
        applyBookmarkColumns();
      }
      // 透明度变化：搜索框、书签框、60s、热门栏目
      if (area === 'sync' && (changes.searchUnfocusedOpacity || changes.bookmarksUnfocusedOpacity || changes.sixtyUnfocusedOpacity || changes.topVisitedUnfocusedOpacity)) {
        loadOpacityPreferences();
      }
      // 语言变化（Options 页切换语言时）
      if (area === 'local' && changes.language) {
        updateLocaleVisibility();
      }
    });
  }
  // 监听本地存储变化（同源预览环境）
  window.addEventListener('storage', (e) => {
    if (e.key === 'showBookmarks') {
      try {
        const v = e.newValue;
        let val = false;
        if (v != null) {
          try { val = !!JSON.parse(v); } catch { val = v === 'true'; }
        }
        applyShowBookmarks(val);
      } catch {}
    }
    if (e.key === 'sixtySecondsEnabled') {
      try {
        const v = e.newValue;
        let val = false;
        if (v != null) {
          try { val = !!JSON.parse(v); } catch { val = v === 'true'; }
        }
        applySixtyEnabled(val);
      } catch {}
    }
    if (e.key === 'bookmarkColumns') {
      try {
        const v = e.newValue;
        let val = 2;
        if (v != null) {
          try { val = Number(JSON.parse(v)); } catch { val = Number(v); }
        }
        bookmarkColumns = Number.isFinite(val) ? Math.max(1, Math.min(5, val)) : 2;
        applyBookmarkColumns();
      } catch {}
    }
    if (e.key === 'searchUnfocusedOpacity' || e.key === 'bookmarksUnfocusedOpacity' || e.key === 'sixtyUnfocusedOpacity' || e.key === 'topVisitedUnfocusedOpacity') {
      loadOpacityPreferences();
    }
    if (e.key === 'tidymark_language' || e.key === 'language') {
      updateLocaleVisibility();
    }
  });

  // 加载非聚焦透明度偏好并应用到页面（分离：搜索框与书签框）
  async function loadOpacityPreferences() {
    let sVal = 0.86;
    let bVal = 0.86;
    let xVal = 0.86; // 60s栏目透明度
    let tVal = 0.86; // 热门栏目透明度
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { searchUnfocusedOpacity, bookmarksUnfocusedOpacity, sixtyUnfocusedOpacity, topVisitedUnfocusedOpacity } = await chrome.storage.sync.get(['searchUnfocusedOpacity','bookmarksUnfocusedOpacity','sixtyUnfocusedOpacity','topVisitedUnfocusedOpacity']);
        const sNum = typeof searchUnfocusedOpacity === 'string' ? parseFloat(searchUnfocusedOpacity) : searchUnfocusedOpacity;
        const bNum = typeof bookmarksUnfocusedOpacity === 'string' ? parseFloat(bookmarksUnfocusedOpacity) : bookmarksUnfocusedOpacity;
        const xNum = typeof sixtyUnfocusedOpacity === 'string' ? parseFloat(sixtyUnfocusedOpacity) : sixtyUnfocusedOpacity;
        const tNum = typeof topVisitedUnfocusedOpacity === 'string' ? parseFloat(topVisitedUnfocusedOpacity) : topVisitedUnfocusedOpacity;
        if (Number.isFinite(sNum) && sNum >= 0.6 && sNum <= 1) sVal = sNum;
        if (Number.isFinite(bNum) && bNum >= 0.6 && bNum <= 1) bVal = bNum;
        if (Number.isFinite(xNum) && xNum >= 0.6 && xNum <= 1) xVal = xNum;
        if (Number.isFinite(tNum) && tNum >= 0.6 && tNum <= 1) tVal = tNum;
      } else if (typeof localStorage !== 'undefined') {
        const sRaw = localStorage.getItem('searchUnfocusedOpacity');
        const bRaw = localStorage.getItem('bookmarksUnfocusedOpacity');
        const xRaw = localStorage.getItem('sixtyUnfocusedOpacity');
        const tRaw = localStorage.getItem('topVisitedUnfocusedOpacity');
        if (sRaw) {
          const sNum = parseFloat(sRaw.replace(/^"|"$/g, ''));
          if (Number.isFinite(sNum) && sNum >= 0.6 && sNum <= 1) sVal = sNum;
        }
        if (bRaw) {
          const bNum = parseFloat(bRaw.replace(/^"|"$/g, ''));
          if (Number.isFinite(bNum) && bNum >= 0.6 && bNum <= 1) bVal = bNum;
        }
        if (xRaw) {
          const xNum = parseFloat(xRaw.replace(/^"|"$/g, ''));
          if (Number.isFinite(xNum) && xNum >= 0.6 && xNum <= 1) xVal = xNum;
        }
        if (tRaw) {
          const tNum = parseFloat(tRaw.replace(/^"|"$/g, ''));
          if (Number.isFinite(tNum) && tNum >= 0.6 && tNum <= 1) tVal = tNum;
        }
      }
    } catch {}
    document.documentElement.style.setProperty('--search-unfocused-opacity', String(sVal));
    document.documentElement.style.setProperty('--bookmarks-unfocused-opacity', String(bVal));
    document.documentElement.style.setProperty('--sixty-unfocused-opacity', String(xVal));
    document.documentElement.style.setProperty('--top-visited-unfocused-opacity', String(tVal));
  }
  await loadOpacityPreferences();

  // 60s 读懂世界：配置与渲染
  const SIXTY_TTL = 30 * 60 * 1000; // 30分钟缓存
  const SIXTY_CACHE_KEY = 'sixty_seconds_cache_v1';
  // 副标题缓存（用于在页面初始时快速显示上一次的提示）
  const SUBTITLE_TTL = 24 * 60 * 60 * 1000; // 24小时缓存
  const SUBTITLE_CACHE_KEY = 'subtitle_main_cache_v1';

  // 乱码修复：检测典型 UTF-8 被按 Latin-1 误解码的模式，并尽可能还原
  function fixMojibake(s) {
    try {
      const t = String(s);
      return /[ÃÂâæÊÐÑÒ]/.test(t) ? decodeURIComponent(escape(t)) : t;
    } catch {
      return s;
    }
  }

  async function getCachedSixty() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const obj = await chrome.storage.local.get([SIXTY_CACHE_KEY]);
        const payload = obj[SIXTY_CACHE_KEY];
        if (payload && payload.timestamp && (Date.now() - payload.timestamp) < SIXTY_TTL) {
          return payload.data;
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SIXTY_CACHE_KEY);
        if (raw) {
          const payload = JSON.parse(raw);
          if (payload && payload.timestamp && (Date.now() - payload.timestamp) < SIXTY_TTL) {
            return payload.data;
          }
        }
      }
    } catch {}
    return null;
  }

  async function setCachedSixty(data) {
    const payload = { timestamp: Date.now(), data };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [SIXTY_CACHE_KEY]: payload });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SIXTY_CACHE_KEY, JSON.stringify(payload));
      }
    } catch {}
  }

  // 获取 60s 缓存原始载荷（不过期显示，用于“缓存优先”）
  async function getSixtyCachePayload() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const obj = await chrome.storage.local.get([SIXTY_CACHE_KEY]);
        const payload = obj[SIXTY_CACHE_KEY];
        if (payload && payload.data) return payload;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SIXTY_CACHE_KEY);
        if (raw) {
          const payload = JSON.parse(raw);
          if (payload && payload.data) return payload;
        }
      }
    } catch {}
    return null;
  }

  // 副标题缓存：读/写
  async function getCachedSubtitleTip() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const obj = await chrome.storage.local.get([SUBTITLE_CACHE_KEY]);
        const payload = obj[SUBTITLE_CACHE_KEY];
        if (payload && payload.timestamp && (Date.now() - payload.timestamp) < SUBTITLE_TTL) {
          return String(payload.text || '').trim();
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SUBTITLE_CACHE_KEY);
        if (raw) {
          const payload = JSON.parse(raw);
          if (payload && payload.timestamp && (Date.now() - payload.timestamp) < SUBTITLE_TTL) {
            return String(payload.text || '').trim();
          }
        }
      }
    } catch {}
    return '';
  }

  async function setCachedSubtitleTip(text) {
    const payload = { timestamp: Date.now(), text: String(text || '').trim() };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [SUBTITLE_CACHE_KEY]: payload });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SUBTITLE_CACHE_KEY, JSON.stringify(payload));
      }
    } catch {}
  }

  async function fetchSixtyData(signal) {
    let lastErr;
    // 构造候选列表，优先尝试上次成功的实例
    const candidates = [...SIXTY_INSTANCES];
    try {
      const preferred = await getPreferredSixtyInstance();
      if (preferred && candidates.includes(preferred)) {
        try {
          const url = `${preferred}/v2/60s`;
          const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
          if (!resp.ok) throw new Error(`60s 服务返回状态 ${resp.status}`);
          const json = await resp.json();
          if (!json || typeof json !== 'object') throw new Error('60s 响应非JSON');
          if (json.code !== 200) throw new Error(`60s 服务错误码 ${json.code}`);
          const d = json.data || {};
          if (!Array.isArray(d.news)) d.news = [];
          // 成功后维持首选实例
          await setPreferredSixtyInstance(preferred);
          return d;
        } catch (e) {
          lastErr = e;
          // 失败则从候选中移除，继续尝试其它实例
          const idx = candidates.indexOf(preferred);
          if (idx >= 0) candidates.splice(idx, 1);
        }
      }
    } catch {}

    // 回退尝试其余实例
    for (const base of candidates) {
      try {
        const url = `${base}/v2/60s`;
        const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
        if (!resp.ok) throw new Error(`60s 服务返回状态 ${resp.status}`);
        const json = await resp.json();
        if (!json || typeof json !== 'object') throw new Error('60s 响应非JSON');
        if (json.code !== 200) throw new Error(`60s 服务错误码 ${json.code}`);
        const d = json.data || {};
        if (!Array.isArray(d.news)) d.news = [];
        // 记录新的首选实例
        await setPreferredSixtyInstance(base);
        return d;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('所有 60s 实例均不可用');
  }

  function renderSixty(data) {
    if (!elSixty || !elSixtyBody || !elSixtyDate) return;
    try {
      const dateText = [data.date, data.day_of_week, data.lunar_date].filter(Boolean).join(' · ');
      elSixtyDate.textContent = dateText || '--';
      const cover = data.cover || data.image || '';
      const tip = fixMojibake(data.tip || '');
      const link = data.link || '';
      const news = Array.isArray(data.news) ? data.news.map(n => fixMojibake(n)) : [];
      const newsItems = news.slice(0, 8).map(n => `
        <li>
          <span class="sixty-bullet" aria-hidden="true"></span>
          <span>${n}</span>
        </li>
      `).join('');
      elSixtyBody.innerHTML = `
        <img class="sixty-cover" ${cover ? `src="${cover}"` : ''} alt="每日封面" onerror="this.style.display='none'" />
        <div class="sixty-content">
          <ul class="sixty-news">${newsItems}</ul>
        </div>
      `;

      // 整块区域作为一个链接进行交互（如果提供原文链接）
      if (link) {
        elSixtyBody.classList.add('is-link');
        elSixtyBody.title = '查看原文';
        elSixtyBody.setAttribute('role', 'link');
        elSixtyBody.setAttribute('tabindex', '0');
        elSixtyBody.onclick = (e) => {
          // 避免与内部元素其他默认交互冲突
          e.preventDefault();
          window.open(link, '_blank', 'noopener');
        };
        elSixtyBody.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.open(link, '_blank', 'noopener');
          }
        };
      } else {
        elSixtyBody.classList.remove('is-link');
        elSixtyBody.removeAttribute('title');
        elSixtyBody.removeAttribute('role');
        elSixtyBody.removeAttribute('tabindex');
        elSixtyBody.onclick = null;
        elSixtyBody.onkeydown = null;
      }

      // 更新副标题为 60s 提示（如存在）
      currentSixtyTip = fixMojibake(tip || '');
      // 同步写入副标题缓存，便于下次页面打开迅速显示
      setCachedSubtitleTip(currentSixtyTip);
      renderSubtitle();
    } catch {}
  }

  function updateLocaleVisibility() {
    try {
      const lang = (window.I18n && typeof window.I18n.getLanguageSync === 'function')
        ? window.I18n.getLanguageSync()
        : (navigator.language || 'en');
      _isZh = String(lang).toLowerCase().startsWith('zh');
      // 非中文环境：强制隐藏 60s 与副标题；中文环境：依据用户偏好恢复
      if (!_isZh) {
        applySixtyEnabled(false);
        if (elSubtitleMain) elSubtitleMain.hidden = true;
      } else {
        loadSixtyPreference();
        renderSubtitle();
      }
    } catch {}
  }

  function applySixtyEnabled(enabled) {
    sixtyEnabled = !!enabled;
    const elModulesRow = document.getElementById('modules-row');
    const elCalendarSection = document.getElementById('calendar-section');
    
    // 60s模块的显示逻辑
    if (elSixty) {
      elSixty.hidden = !sixtyEnabled || !_isZh;
    }
    
    // 日历模块根据设置显示
    if (elCalendarSection) {
      elCalendarSection.hidden = !calendarEnabled;
    }
    
    // 如果两个模块都隐藏，隐藏整个容器
    if (elModulesRow) {
      const calendarVisible = !elCalendarSection.hidden;
      const sixtyVisible = !elSixty.hidden;
      elModulesRow.hidden = !calendarVisible && !sixtyVisible;
    }
    
    // 根据开关与提示内容，更新副标题文本
    renderSubtitle();
    if (sixtyEnabled) {
      // 若可见，确保已加载数据
      if (elSixtyBody && !elSixtyBody.innerHTML) {
        loadSixty();
      }
    }
  }

  async function loadSixtyPreference() {
    let enabled = _isZh; // 非中文默认关闭
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { sixtySecondsEnabled } = await chrome.storage.sync.get(['sixtySecondsEnabled']);
        enabled = sixtySecondsEnabled !== undefined ? !!sixtySecondsEnabled : _isZh;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('sixtySecondsEnabled');
        if (raw != null) {
          try { enabled = !!JSON.parse(raw); } catch { enabled = raw === 'true'; }
        } else {
          enabled = _isZh;
        }
      }
    } catch {}
    applySixtyEnabled(enabled);
  }

  async function loadCalendarPreference() {
    let enabled = true;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { calendarEnabled } = await chrome.storage.sync.get(['calendarEnabled']);
        enabled = calendarEnabled !== undefined ? !!calendarEnabled : true;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('calendarEnabled');
        if (raw != null) {
          try { enabled = !!JSON.parse(raw); } catch { enabled = raw === 'true'; }
        }
      }
    } catch {}
    calendarEnabled = !!enabled;
    const elCalendarSection = document.getElementById('calendar-section');
    if (elCalendarSection) {
      elCalendarSection.hidden = !calendarEnabled;
    }
    const elModulesRow = document.getElementById('modules-row');
    if (elModulesRow) {
      const calendarVisible = !elCalendarSection.hidden;
      const sixtyVisible = !elSixty.hidden;
      elModulesRow.hidden = !calendarVisible && !sixtyVisible;
    }
  }

  async function loadSixty(force = false) {
    if (!elSixty) return;
    try {
      let cachedPayload = null;
      if (!force) {
        // 缓存优先：即使过期也先显示，随后后台刷新
        cachedPayload = await getSixtyCachePayload();
        if (cachedPayload && cachedPayload.data) {
          renderSixty(cachedPayload.data);
        }
      }
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 30000);
      let data = null;
      try {
        data = await fetchSixtyData(ac.signal);
      } finally {
        clearTimeout(timer);
      }
      if (data) {
        // 若与缓存相同则不重复渲染；不同则更新缓存和界面
        const same = cachedPayload?.data && JSON.stringify(cachedPayload.data) === JSON.stringify(data);
        if (!same) {
          await setCachedSixty(data);
          renderSixty(data);
        }
      }
    } catch (err) {
      console.warn('加载 60s 栏目失败', err);
      if (elSixtyBody) {
        const isTimeout = err.name === 'AbortError';
        const errorMsg = isTimeout ? '加载超时，请稍后重试' : '加载失败，请稍后重试';
        elSixtyBody.innerHTML = `<div class="sixty-tip">${errorMsg}</div>`;
      }
      // 清空提示，回退到默认副标题
      currentSixtyTip = '';
      renderSubtitle();
    }
  }

  // 页面打开时优先加载副标题缓存，然后由 60s 刷新带来更新
  async function loadSubtitleCache() {
    try {
      const tip = await getCachedSubtitleTip();
      if (tip) {
        currentSixtyTip = tip;
        renderSubtitle();
      }
    } catch {}
  }

  function renderSubtitle() {
    if (!elSubtitleMain) return;
    const t = (currentSixtyTip || '').trim();
    // 非中文环境始终隐藏副标题
    if (!_isZh) {
      elSubtitleMain.hidden = true;
      return;
    }
    elSubtitleMain.hidden = false;
    if (sixtyEnabled && t) {
      elSubtitleMain.textContent = t;
      elSubtitleMain.title = t;
    } else {
      elSubtitleMain.textContent = DEFAULT_SUBTITLE;
      elSubtitleMain.removeAttribute('title');
    }
  }

  // 天气：获取设置与渲染
  const WEATHER_TTL = 15 * 60 * 1000; // 15分钟缓存

  async function getWeatherSettings() {
    if (cachedWeatherSettings) {
      return cachedWeatherSettings;
    }
    let weatherEnabled = true;
    let weatherCity = '';
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const result = await chrome.storage.sync.get(['weatherEnabled', 'weatherCity']);
        weatherEnabled = result.weatherEnabled !== undefined ? !!result.weatherEnabled : true;
        weatherCity = (result.weatherCity || '').trim();
      } else if (typeof localStorage !== 'undefined') {
        const e = localStorage.getItem('weatherEnabled');
        const c = localStorage.getItem('weatherCity');
        weatherEnabled = e === null ? true : e === 'true';
        weatherCity = (c || '').replace(/^"|"$/g, '').trim();
      }
    } catch {}
    cachedWeatherSettings = { weatherEnabled, weatherCity };
    return cachedWeatherSettings;
  }

  async function getCachedWeather(city) {
    const key = `weather_cache_${(city || 'default').toLowerCase()}`;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const { [key]: cached } = await chrome.storage.local.get([key]);
        if (cached && cached.timestamp && (Date.now() - cached.timestamp) < WEATHER_TTL) {
          return cached.data;
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw) {
          const obj = JSON.parse(raw);
          if (obj && obj.timestamp && (Date.now() - obj.timestamp) < WEATHER_TTL) {
            return obj.data;
          }
        }
      }
    } catch {}
    return null;
  }

  async function setCachedWeather(city, data) {
    const key = `weather_cache_${(city || 'default').toLowerCase()}`;
    const payload = { timestamp: Date.now(), data };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [key]: payload });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(payload));
      }
    } catch {}
  }

  function pickIconByDesc(desc = '') {
    const d = String(desc).toLowerCase();
    if (/雷|thunder/.test(d)) return '⛈️';
    if (/雨|rain/.test(d)) return '🌧️';
    if (/雪|snow/.test(d)) return '❄️';
    if (/云|阴|overcast|cloud/.test(d)) return '☁️';
    if (/雾|fog|霾|haze/.test(d)) return '🌫️';
    if (/风|wind/.test(d)) return '🌬️';
    return '☀️';
  }

  function renderWeather(data) {
    if (!elWeather) return;
    if (!data) { elWeather.hidden = true; return; }
    const city = data.city || data.location || data.name || '—';
    const desc = data.desc || data.type || data.weather || (data.text || '');
    const temp = data.temp || data.temperature || data.tempC || data.now?.temp || data.data?.temp || '';
    const tempStr = temp ? `${String(temp).replace(/℃|\s*c/i, '')}℃` : '';
    const icon = pickIconByDesc(desc);
    const tips = data.tips || data.data?.tip || '';
    elWeather.innerHTML = `
      <div class="weather-icon" aria-hidden="true">${icon}</div>
      <div class="weather-main">
        <span class="weather-city">${city}</span>
        <span class="weather-temp">${tempStr}</span>
        <span class="weather-desc">${desc || ''}${tips ? ' · ' + tips : ''}</span>
      </div>
      <button type="button" class="weather-refresh" id="weather-refresh-btn" title="${(window.I18n ? window.I18n.t('newtab.weather.refresh') : 'Refresh')}">↻ ${(window.I18n ? window.I18n.t('newtab.weather.refresh') : '刷新')}</button>
    `;
    elWeather.hidden = false;
    const rbtn = document.getElementById('weather-refresh-btn');
    if (rbtn) {
      rbtn.onclick = () => {
        // 强制刷新：忽略缓存
        loadWeather(true);
      };
    }
    // 点击天气区域弹出设置
    elWeather.onclick = async (e) => {
      if (e.target && e.target.id === 'weather-refresh-btn') return;
      const promptText = (window.I18n ? window.I18n.t('newtab.weather.prompt') : 'Enter city name (e.g., Nanjing)');
      const val = prompt(promptText, city === '—' ? '' : city);
      if (val !== null) {
        const nextCity = (val || '').trim();
        await saveWeatherCity(nextCity);
        loadWeather(true);
      }
    };
  }

  async function saveWeatherCity(city) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.set({ weatherCity: city });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('weatherCity', city || '');
      }
    } catch {}
  }

  async function fetchWeather(city) {
    // 根据语言选择数据源：非中文环境优先使用海外免费 API（Open-Meteo）
    const _lang = (window.I18n && typeof window.I18n.getLanguageSync === 'function')
      ? window.I18n.getLanguageSync()
      : (navigator.language || 'en');
    const _isZh = String(_lang).toLowerCase().startsWith('zh');

    // Open-Meteo weathercode 本地化映射
    function mapWeatherCodeLocalized(c, locale) {
      const maps = {
        'zh-CN': { 0: '晴', 1: '少云', 2: '多云', 3: '阴', 45: '雾', 48: '雾', 51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨', 56: '冻毛毛雨', 57: '冻毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '冻雨', 71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒', 80: '阵雨', 81: '阵雨', 82: '阵雨', 85: '阵雪', 86: '阵雪', 95: '雷暴', 96: '雷暴冰雹', 99: '强雷暴冰雹', unknown: '未知' },
        'zh-TW': { 0: '晴', 1: '少雲', 2: '多雲', 3: '陰', 45: '霧', 48: '霧', 51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨', 56: '凍毛毛雨', 57: '凍毛毛雨', 61: '小雨', 63: '中雨', 65: '大雨', 66: '凍雨', 67: '凍雨', 71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒', 80: '陣雨', 81: '陣雨', 82: '陣雨', 85: '陣雪', 86: '陣雪', 95: '雷暴', 96: '雷暴冰雹', 99: '強雷暴冰雹', unknown: '未知' },
        'en': { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 66: 'Light freezing rain', 67: 'Heavy freezing rain', 71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail', unknown: 'Unknown' },
        'ru': { 0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно', 45: 'Туман', 48: 'Изморозь', 51: 'Слабая морось', 53: 'Умеренная морось', 55: 'Сильная морось', 56: 'Ледяная морось', 57: 'Сильная ледяная морось', 61: 'Слабый дождь', 63: 'Умеренный дождь', 65: 'Сильный дождь', 66: 'Ледяной дождь', 67: 'Сильный ледяной дождь', 71: 'Слабый снег', 73: 'Умеренный снег', 75: 'Сильный снег', 77: 'Снежные зерна', 80: 'Ливни', 81: 'Ливни', 82: 'Сильные ливни', 85: 'Снегопады', 86: 'Снегопады', 95: 'Гроза', 96: 'Гроза с градом', 99: 'Сильная гроза с градом', unknown: 'Неизвестно' }
      };
      const dict = maps[locale] || maps['en'];
      return dict[c] || dict.unknown;
    }

    // 非中文环境：直接走 Open-Meteo
    if (!_isZh) {
      if (!city) throw new Error('No city specified');
      // 1) 城市地理编码（按当前语言，失败回退英文）
      const geoLang = (() => {
        const l = String(_lang || 'en');
        if (l.startsWith('ru')) return 'ru';
        if (l.startsWith('zh')) return l;
        return 'en';
      })();
      let gResp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${encodeURIComponent(geoLang)}`, { cache: 'no-store' });
      if (!gResp.ok) {
        gResp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`, { cache: 'no-store' });
        if (!gResp.ok) throw new Error(`Geo HTTP ${gResp.status}`);
      }
      const gJson = await gResp.json();
      const place = Array.isArray(gJson.results) && gJson.results[0];
      if (!place) throw new Error('No geocoding result');
      const lat = place.latitude;
      const lon = place.longitude;
      const displayName = [place.admin1 || '', place.name || '', place.country || ''].filter(Boolean).join(' ');
      // 2) 当前天气
      const wResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`, { cache: 'no-store' });
      if (!wResp.ok) throw new Error(`Weather HTTP ${wResp.status}`);
      const wJson = await wResp.json();
      const cur = wJson.current_weather || {};
      const temp = typeof cur.temperature === 'number' ? Math.round(cur.temperature) : '';
      const code = cur.weathercode;
      const desc = mapWeatherCodeLocalized(code, geoLang.startsWith('zh') ? geoLang : (geoLang || 'en'));
      return { __provider: 'open-meteo', city: displayName || city, temp, desc };
    }

    // 60s v2 天气：优先首选实例，失败再回退
    let lastError = null;
    const candidates = [...SIXTY_INSTANCES];
    try {
      const preferred = await getPreferredSixtyInstance();
      if (preferred && candidates.includes(preferred)) {
        const url = `${preferred}/v2/weather${city ? `?query=${encodeURIComponent(city)}` : ''}`;
        try {
          const resp = await fetch(url, { cache: 'no-store', redirect: 'follow' });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          if (typeof json.code === 'number' && json.code === 200 && json.data) {
            await setPreferredSixtyInstance(preferred);
            return { __provider: url, ...json };
          }
          lastError = new Error(json.message || `接口返回非成功状态：${json.code}`);
          const idx = candidates.indexOf(preferred);
          if (idx >= 0) candidates.splice(idx, 1);
        } catch (e) {
          lastError = e;
          const idx = candidates.indexOf(preferred);
          if (idx >= 0) candidates.splice(idx, 1);
        }
      }
    } catch {}

    for (const base of candidates) {
      const url = `${base}/v2/weather${city ? `?query=${encodeURIComponent(city)}` : ''}`;
      try {
        const resp = await fetch(url, { cache: 'no-store', redirect: 'follow' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        // 要求 code===200 才视为成功
        if (typeof json.code === 'number' && json.code === 200 && json.data) {
          await setPreferredSixtyInstance(base);
          return { __provider: url, ...json };
        }
        // 非 200 则继续尝试下一个实例
        lastError = new Error(json.message || `接口返回非成功状态：${json.code}`);
      } catch (e) {
        lastError = e;
        // 继续尝试下一个实例
      }
    }
    // 海外免费降级：Open-Meteo（需将城市名地理编码为经纬度）
    try {
      if (!city) throw lastError || new Error('未指定城市，跳过海外降级');
      // 1) 城市地理编码（优先中文）
      const gUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh-CN`;
      const gResp = await fetch(gUrl, { cache: 'no-store' });
      if (!gResp.ok) throw new Error(`Geo HTTP ${gResp.status}`);
      const gJson = await gResp.json();
      const place = Array.isArray(gJson.results) && gJson.results[0];
      if (!place) throw new Error('未找到城市经纬度');
      const lat = place.latitude;
      const lon = place.longitude;
      const displayName = [place.admin1 || '', place.name || '', place.country || ''].filter(Boolean).join(' ');
      // 2) 当前天气
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const wResp = await fetch(wUrl, { cache: 'no-store' });
      if (!wResp.ok) throw new Error(`Weather HTTP ${wResp.status}`);
      const wJson = await wResp.json();
      const cur = wJson.current_weather || {};
      const temp = typeof cur.temperature === 'number' ? Math.round(cur.temperature) : '';
      const code = cur.weathercode;
      const desc = mapWeatherCodeLocalized(code, 'zh-CN');
      // 返回拍平数据，供渲染/标准化直接使用
      return { __provider: 'open-meteo', city: displayName || city, temp, desc };
    } catch (e2) {
      throw e2;
    }
  }

  // 已移除：基于 IP 的城市定位逻辑

  async function loadWeather(force = false) {
    try {
      const { weatherEnabled, weatherCity } = await getWeatherSettings();
      if (!weatherEnabled) {
        if (elWeather) {
          elWeather.hidden = true;
        }
        return;
      }
      // 若未填写城市：不显示天气条
      let city = weatherCity || '';
      if (!city) {
        if (elWeather) { elWeather.hidden = true; }
        return;
      }
      if (!force) {
        const cached = await getCachedWeather(city);
        if (cached) {
          renderWeather(cached);
          return;
        }
      }
      // 添加超时控制，避免长时间等待
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 10000); // 10秒超时
      try {
        const data = await fetchWeather(city);
        clearTimeout(timer);
        // 尝试标准化常见结构（兼容 60s 文档结构与 vvhan 常见返回）
      const normalized = (() => {
        if (!data) return null;
        // 60s 文档示例：
        // { code, message, data: { location: { name/city }, weather: { condition, temperature, ... }, air_quality, sunrise, life_indices } }
        if (typeof data.code === 'number' && data.data && typeof data.data === 'object') {
          const loc = data.data.location || {};
          const w = data.data.weather || {};
          // 优先使用更精确的地点：name（通常含省市区/县），其次 city，再次 county
          const name = loc.name || loc.city || loc.county || city;
          const temp = w.temperature ?? '';
          const desc = w.condition ?? '';
          return { city: name, temp: String(temp).replace(/[^\d-]/g, ''), desc, tips: '' };
        }
        // vvhan 常见包装
        if (data.data && (data.data.type || data.data.temp || data.data.high || data.data.low)) {
          return {
            city: data.city || city,
            desc: data.data.type,
            temp: String(data.data.temp || '').replace(/[^\d-]/g, '') || '',
            tips: data.data.tip || ''
          };
        }
        // 已是拍平数据
        if (data.city || data.location || data.name) return data;
        return data;
      })();
      await setCachedWeather(city, normalized);
      renderWeather(normalized);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.warn('天气加载超时');
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.warn('天气加载失败', err);
      renderWeather(null);
    }
  }

  // 新标签页主题与数据状态
  let themeMode = 'system';
  let categoryOrder = [];
  let allBookmarks = [];
  let inputDebounceTimer = null;
  let dragGhostEl = null;

  // 顶层模块顺序持久化（仅限固定模块）
  const MAIN_MODULE_ORDER_KEY = 'main_modules_order_v1';
  const PERSIST_MAIN_SECTION_IDS = new Set(['sixty-seconds', 'top-visited']);

  async function loadMainModuleOrder() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const { [MAIN_MODULE_ORDER_KEY]: stored } = await chrome.storage.local.get([MAIN_MODULE_ORDER_KEY]);
        if (Array.isArray(stored)) return stored;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(MAIN_MODULE_ORDER_KEY);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) return arr;
        }
      }
    } catch {}
    return [];
  }

  async function saveMainModuleOrder(order) {
    const toSave = Array.isArray(order) ? order.filter(id => PERSIST_MAIN_SECTION_IDS.has(id)) : [];
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [MAIN_MODULE_ORDER_KEY]: toSave });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MAIN_MODULE_ORDER_KEY, JSON.stringify(toSave));
      }
    } catch {}
  }

  function collectCurrentMainOrder() {
    if (!elMain) return [];
    return Array.from(elMain.querySelectorAll('.section'))
      .map(s => s.id)
      .filter(id => PERSIST_MAIN_SECTION_IDS.has(id));
  }

  async function persistCurrentMainOrder() {
    const order = collectCurrentMainOrder();
    if (order.length) await saveMainModuleOrder(order);
  }

  async function applyMainModuleOrder() {
    try {
      const order = await loadMainModuleOrder();
      if (!elMain || !Array.isArray(order) || order.length === 0) return;
      const anchor = elSections || null;
      // 正向插入到书签区域之前，保证顺序与存储一致
      for (let i = 0; i < order.length; i++) {
        const id = order[i];
        const node = document.getElementById(id);
        if (node && node.parentElement === elMain) {
          elMain.insertBefore(node, anchor);
        }
      }
    } catch {}
  }

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
      light: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42Zm10.48 0 1.8-1.79 1.41 1.41-1.79 1.8-1.42-1.42ZM12 4V1h-2v3h2Zm0 19v-3h-2v3h2ZM4 12H1v2h3v-2Zm22 0h-3v2h3v-2ZM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79Zm10.48 0 1.42 1.42 1.79-1.8-1.41-1.41-1.8 1.79ZM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>`,
      dark: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`
    };
    const isSystem = mode === 'system';
    const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = isSystem ? (systemIsDark ? 'dark' : 'light') : mode;
    elThemeBtn.innerHTML = icons[effective] || icons.light;
  }

  // 已移除搜索引擎偏好设置；统一使用浏览器默认搜索

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

  const elColumnsBtn = document.getElementById('columns-toggle-btn');
  const elColumnsMenu = document.getElementById('columns-menu');
  const elColumnsDropdown = document.querySelector('.columns-dropdown');

  if (elColumnsBtn && elColumnsMenu) {
    elColumnsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      elColumnsMenu.hidden = !elColumnsMenu.hidden;
    });
    elColumnsMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = parseInt(item.dataset.columns);
        if (val >= 1 && val <= 5) {
          saveBookmarkColumnsPreference(val);
        }
        elColumnsMenu.hidden = true;
      });
    });
    document.addEventListener('click', (e) => {
      if (!elColumnsDropdown) return;
      if (!elColumnsDropdown.contains(e.target)) {
        elColumnsMenu.hidden = true;
      }
    });
  }

  // 系统主题变化时，如果当前为“系统”模式，更新按钮图标
  const prefersDarkMql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (prefersDarkMql) {
    if (typeof prefersDarkMql.addEventListener === 'function') {
      prefersDarkMql.addEventListener('change', () => {
        if (themeMode === 'system') renderThemeIcon('system');
      });
    } else if (typeof prefersDarkMql.addListener === 'function') {
      // 兼容旧浏览器
      prefersDarkMql.addListener(() => {
        if (themeMode === 'system') renderThemeIcon('system');
      });
    }
  }

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
    // 使用 Chrome Search API 以默认搜索提供商进行查询
    if (typeof chrome !== 'undefined' && chrome.search?.query) {
      try {
        chrome.search.query({ text: q, disposition: 'CURRENT_TAB' });
      } catch (err) {
        // 兜底：预览或异常时走通用搜索
        window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener');
      }
    } else {
      // 本地预览环境兜底
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener');
    }
  });

  // 实时书签搜索（输入事件）
  if (elInput) {
    elInput.addEventListener('input', () => {
      const val = elInput.value || '';
      const bm = parseBookmarkSearch(val);
      if (!bm || !bm.keyword) {
        clearBookmarkSearchResults();
        return;
      }
      if (inputDebounceTimer) clearTimeout(inputDebounceTimer);
      inputDebounceTimer = setTimeout(() => {
        if (allBookmarks.length === 0) return;
        renderBookmarkSearchResults(bm.keyword);
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
    categoriesMapCache = categories;
    // 渲染热门栏目（如开启）
    if (navShowTopVisited) {
      renderTopVisitedCategories(categories);
    } else {
      const existingTop = document.getElementById('top-visited');
      if (existingTop) existingTop.remove();
    }
  }

  let dragSrcSection = null;
  // 通用：为任意 .section 启用拖拽（基于其父容器重排）
  function enableDragOnSection(section) {
    if (!section || !section.classList || !section.classList.contains('section')) return;
    const header = section.querySelector('.section-header');
    const handle = section.querySelector('.drag-handle');
    if (!header) return;
    section.dataset.key = section.querySelector('.section-title')?.textContent || section.id || '';
    if (handle) handle.draggable = true;
    header.draggable = true;

    const onDragStart = (e) => {
      dragSrcSection = section;
      section.classList.add('dragging');
      document.body.classList.add('drag-active');
      e.dataTransfer.setData('text/plain', section.dataset.key);
      e.dataTransfer.effectAllowed = 'move';
      // 自定义拖拽预览
      try {
        const dragTitle = section.querySelector('.section-title')?.textContent || section.dataset.key || '';
        dragGhostEl = document.createElement('div');
        dragGhostEl.textContent = dragTitle;
        dragGhostEl.style.position = 'fixed';
        dragGhostEl.style.top = '-1000px';
        dragGhostEl.style.left = '-1000px';
        dragGhostEl.style.padding = '6px 10px';
        dragGhostEl.style.borderRadius = '8px';
        dragGhostEl.style.background = getComputedStyle(document.documentElement).getPropertyValue('--card') || '#151922';
        dragGhostEl.style.border = `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border') || '#232838'}`;
        dragGhostEl.style.boxShadow = getComputedStyle(document.documentElement).getPropertyValue('--shadow') || '0 8px 24px rgba(0,0,0,0.25)';
        dragGhostEl.style.color = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#e6e8ea';
        dragGhostEl.style.font = '600 13px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, PingFang SC, Microsoft YaHei, sans-serif';
        document.body.appendChild(dragGhostEl);
        if (e.dataTransfer && e.dataTransfer.setDragImage) {
          e.dataTransfer.setDragImage(dragGhostEl, 10, 10);
        }
      } catch (_) {}
    };
    if (handle) handle.addEventListener('dragstart', onDragStart);
    header.addEventListener('dragstart', onDragStart);

    const decideBefore = (clientY) => {
      const rect = section.getBoundingClientRect();
      const offsetY = clientY - rect.top;
      const threshold = Math.max(20, Math.min(rect.height * 0.33, 60));
      return offsetY < threshold;
    };

    const sameParent = (other) => other && other.parentElement === section.parentElement;

    section.addEventListener('dragenter', (e) => {
      if (!dragSrcSection || dragSrcSection === section || !sameParent(dragSrcSection)) return;
      const toBefore = decideBefore(e.clientY);
      section.classList.toggle('drop-before', toBefore);
      section.classList.toggle('drop-after', !toBefore);
    });
    section.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dragSrcSection || !sameParent(dragSrcSection)) return;
      const toBefore = decideBefore(e.clientY);
      section.classList.toggle('drop-before', toBefore);
      section.classList.toggle('drop-after', !toBefore);
    });
    const autoScroll = (e) => {
      const margin = 48; const speed = 12;
      const y = e.clientY; const vh = window.innerHeight;
      if (y < margin) window.scrollBy({ top: -speed, behavior: 'auto' });
      else if (y > vh - margin) window.scrollBy({ top: speed, behavior: 'auto' });
    };
    document.addEventListener('dragover', autoScroll);
    section.addEventListener('dragleave', () => {
      section.classList.remove('drop-before', 'drop-after');
    });
    section.addEventListener('drop', (e) => {
      e.preventDefault();
      section.classList.remove('drop-before', 'drop-after');
      if (dragSrcSection && dragSrcSection !== section && sameParent(dragSrcSection)) {
        const toBefore = decideBefore(e.clientY);
        const container = section.parentElement;
        if (toBefore) container.insertBefore(dragSrcSection, section);
        else container.insertBefore(dragSrcSection, section.nextSibling);
        // 持久化顶层模块顺序（仅限固定模块）
        if (container === elMain) {
          persistCurrentMainOrder();
        } else if (container === elSections) {
          // 兼容：类别顺序持久化
          persistCurrentCategoryOrder();
        }
      }
    });
    const onDragEnd = () => {
      section.classList.remove('dragging');
      document.body.classList.remove('drag-active');
      const container = section.parentElement;
      if (container) container.querySelectorAll('.section').forEach(s => s.classList.remove('drop-before', 'drop-after'));
      if (dragGhostEl && dragGhostEl.parentNode) dragGhostEl.parentNode.removeChild(dragGhostEl);
      dragGhostEl = null;
      dragSrcSection = null;
      document.removeEventListener('dragover', autoScroll);
    };
    if (handle) handle.addEventListener('dragend', onDragEnd);
    header.addEventListener('dragend', onDragEnd);
  }

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

    const byBm = visitStats.byBookmark || {};
    const bmEntries = Object.entries(byBm);
    bmEntries.sort((a, b) => b[1] - a[1]);
    const topBookmarks = new Set(bmEntries.slice(0, navTopVisitedCount).map(([key]) => key));

    const categoryHotness = {};
    for (const [category, items] of entriesRaw) {
      const catName = formatCategory(category);
      let hotCount = 0;
      for (const item of items) {
        const keys = getBookmarkKeys(item);
        let isHot = false;
        for (const key of keys) {
          if (topBookmarks.has(key)) {
            isHot = true;
            break;
          }
        }
        if (isHot) {
          hotCount++;
        }
      }
      categoryHotness[catName] = hotCount;
    }

    const entries = entriesRaw.sort((a, b) => {
      const fa = formatCategory(a[0]);
      const fb = formatCategory(b[0]);
      const visitCountA = visitStats.byCategory[fa] || 0;
      const visitCountB = visitStats.byCategory[fb] || 0;
      if (visitCountA !== visitCountB) {
        return visitCountB - visitCountA;
      }
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

      const hotCount = categoryHotness[formatCategory(category)] || 0;
      const visitCount = visitStats.byCategory[formatCategory(category)] || 0;
      if (hotCount > 0 || visitCount > 0) {
        const visitBadge = document.createElement('div');
        visitBadge.className = 'visit-badge';
        visitBadge.innerHTML = `<span class="visit-icon">🔥</span><span class="visit-count">${hotCount}</span><span class="visit-separator">|</span><span class="visit-clicks">${visitCount}</span>`;
        headLeft.appendChild(visitBadge);
      }

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
        // 记录访问（点击时）
        link.addEventListener('click', async () => {
          try {
            const catName = title.textContent || '未分类';
            const key = normalizeBookmarkKey(item);
            await recordVisit(catName, key);
          } catch (_) {}
        });

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
      // 绑定拖拽信息（拖拽：图标或整个区块头部均可）
      section.dataset.key = title.textContent;
      handle.draggable = true;
      header.draggable = true;
      const onDragStart = (e) => {
        dragSrcSection = section;
        section.classList.add('dragging');
        document.body.classList.add('drag-active');
        e.dataTransfer.setData('text/plain', section.dataset.key);
        e.dataTransfer.effectAllowed = 'move';
        // 自定义拖拽预览
        try {
          const dragTitle = section.querySelector('.section-title')?.textContent || section.dataset.key || '';
          dragGhostEl = document.createElement('div');
          dragGhostEl.textContent = dragTitle;
          dragGhostEl.style.position = 'fixed';
          dragGhostEl.style.top = '-1000px';
          dragGhostEl.style.left = '-1000px';
          dragGhostEl.style.padding = '6px 10px';
          dragGhostEl.style.borderRadius = '8px';
          dragGhostEl.style.background = getComputedStyle(document.documentElement).getPropertyValue('--card') || '#151922';
          dragGhostEl.style.border = `1px solid ${getComputedStyle(document.documentElement).getPropertyValue('--border') || '#232838'}`;
          dragGhostEl.style.boxShadow = getComputedStyle(document.documentElement).getPropertyValue('--shadow') || '0 8px 24px rgba(0,0,0,0.25)';
          dragGhostEl.style.color = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#e6e8ea';
          dragGhostEl.style.font = '600 13px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, PingFang SC, Microsoft YaHei, sans-serif';
          document.body.appendChild(dragGhostEl);
          if (e.dataTransfer && e.dataTransfer.setDragImage) {
            e.dataTransfer.setDragImage(dragGhostEl, 10, 10);
          }
        } catch (_) {}
      };
      handle.addEventListener('dragstart', onDragStart);
      header.addEventListener('dragstart', onDragStart);

      const decideBefore = (clientY) => {
        const rect = section.getBoundingClientRect();
        const offsetY = clientY - rect.top;
        const threshold = Math.max(20, Math.min(rect.height * 0.33, 60));
        return offsetY < threshold;
      };

      section.addEventListener('dragenter', (e) => {
        if (!dragSrcSection || dragSrcSection === section || dragSrcSection.parentElement !== elSections) return;
        const toBefore = decideBefore(e.clientY);
        section.classList.toggle('drop-before', toBefore);
        section.classList.toggle('drop-after', !toBefore);
      });
      section.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragSrcSection || dragSrcSection.parentElement !== elSections) return;
        const toBefore = decideBefore(e.clientY);
        section.classList.toggle('drop-before', toBefore);
        section.classList.toggle('drop-after', !toBefore);
      });
      // 视口边缘自动滚动，提升长列表拖拽体验
      const autoScroll = (e) => {
        const margin = 48; // 边缘触发区
        const speed = 12;  // 滚动速度
        const y = e.clientY;
        const vh = window.innerHeight;
        if (y < margin) {
          window.scrollBy({ top: -speed, behavior: 'auto' });
        } else if (y > vh - margin) {
          window.scrollBy({ top: speed, behavior: 'auto' });
        }
      };
      document.addEventListener('dragover', autoScroll);
      section.addEventListener('dragleave', () => {
        section.classList.remove('drop-before', 'drop-after');
      });
      section.addEventListener('drop', (e) => {
        e.preventDefault();
        section.classList.remove('drop-before', 'drop-after');
        if (dragSrcSection && dragSrcSection !== section && dragSrcSection.parentElement === elSections) {
          const toBefore = decideBefore(e.clientY);
          if (toBefore) {
            elSections.insertBefore(dragSrcSection, section);
          } else {
            elSections.insertBefore(dragSrcSection, section.nextSibling);
          }
          persistCurrentCategoryOrder();
        }
      });
      const onDragEnd = () => {
        section.classList.remove('dragging');
        document.body.classList.remove('drag-active');
        dragSrcSection = null;
        elSections.querySelectorAll('.section').forEach(s => s.classList.remove('drop-before', 'drop-after'));
        document.removeEventListener('dragover', autoScroll);
        if (dragGhostEl && dragGhostEl.parentNode) {
          dragGhostEl.parentNode.removeChild(dragGhostEl);
        }
        dragGhostEl = null;
      };
      handle.addEventListener('dragend', onDragEnd);
      header.addEventListener('dragend', onDragEnd);

      section.appendChild(header);
      section.appendChild(list);
      elSections.appendChild(section);
    }
  }

  await loadCategoryOrder();
  loadAndRenderBookmarks();
  // 加载天气（根据设置决定是否显示）
  loadWeather();

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
      link.addEventListener('click', async () => {
        const catName = formatCategory(item.parentPath);
        const bookmarkKey = normalizeBookmarkKey(item);
        await recordVisit(catName, bookmarkKey);
      });
      li.appendChild(link);
      list.appendChild(li);
    });

    section.appendChild(header);
    section.appendChild(list);
    if (elMain && elModulesRow) {
      const topVisited = document.getElementById('top-visited');
      if (topVisited) {
        elMain.insertBefore(section, topVisited);
      } else {
        elMain.insertBefore(section, elModulesRow);
      }
    } else if (elMain && elSections) {
      const topVisited = document.getElementById('top-visited');
      if (topVisited) {
        elMain.insertBefore(section, topVisited);
      } else {
        elMain.insertBefore(section, elSections);
      }
    } else if (elMain) {
      elMain.prepend(section);
    } else {
      document.body.appendChild(section);
    }
  }

  // ---- 访问统计与热门栏目 ----
  async function loadVisitStats() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const { visitStats: vs } = await chrome.storage.local.get(['visitStats']);
        if (vs && typeof vs === 'object') {
          visitStats = {
            byCategory: vs.byCategory || {},
            byBookmark: vs.byBookmark || {},
            lastByBookmark: vs.lastByBookmark || {}
          };
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('visitStats');
        if (raw) {
          const vs = JSON.parse(raw);
          visitStats = {
            byCategory: vs.byCategory || {},
            byBookmark: vs.byBookmark || {},
            lastByBookmark: vs.lastByBookmark || {}
          };
        }
      }
    } catch (e) {
      console.warn('加载访问统计失败', e);
    }
  }

  async function saveVisitStats() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ visitStats });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('visitStats', JSON.stringify(visitStats));
      }
    } catch (e) {
      console.warn('保存访问统计失败', e);
    }
  }

  function normalizeBookmarkKey(item) {
    if (item.url) {
      let url = String(item.url);
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      return url;
    }
    if (item.id) return String(item.id);
    return `${item.title}|${item.url}`;
  }

  function getBookmarkKeys(item) {
    const keys = new Set();
    if (item.url) {
      const url = String(item.url);
      keys.add(url);
      if (url.endsWith('/')) {
        keys.add(url.slice(0, -1));
      } else {
        keys.add(url + '/');
      }
    }
    if (item.id) {
      keys.add(String(item.id));
    }
    keys.add(`${item.title}|${item.url}`);
    return Array.from(keys);
  }

  async function recordVisit(categoryName, bookmarkKey) {
    const cat = String(categoryName || '未分类');
    const key = String(bookmarkKey || '');
    visitStats.byCategory[cat] = (visitStats.byCategory[cat] || 0) + 1;
    if (key) visitStats.byBookmark[key] = (visitStats.byBookmark[key] || 0) + 1;
    if (key) visitStats.lastByBookmark[key] = Date.now();
    await saveVisitStats();
    if (navShowTopVisited && categoriesMapCache) {
      renderTopVisitedCategories(categoriesMapCache);
    }
    updateCategoryHotness();
    // 重新渲染分类列表以更新排序
    if (categoriesMapCache) {
      renderCategories(categoriesMapCache);
    }
  }

  async function deleteVisitRecord(bookmarkKey) {
    const key = String(bookmarkKey || '');
    if (!key) return;
    
    // 查找书签对象以获取所有可能的 key 和分类信息
    let bookmark = null;
    let bookmarkCategory = null;
    for (const [category, items] of Object.entries(categoriesMapCache || {})) {
      for (const it of items) {
        const keys = getBookmarkKeys(it);
        if (keys.includes(key)) {
          bookmark = it;
          bookmarkCategory = category;
          break;
        }
      }
      if (bookmark) break;
    }
    
    // 删除该书签的所有可能 key
    if (bookmark) {
      const keys = getBookmarkKeys(bookmark);
      for (const k of keys) {
        delete visitStats.byBookmark[k];
        delete visitStats.lastByBookmark[k];
      }
    } else {
      // 如果找不到书签对象，只删除传入的 key
      delete visitStats.byBookmark[key];
      delete visitStats.lastByBookmark[key];
    }
    
    // 重新计算分类的点击次数
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

    // 清空所有分类的点击次数
    visitStats.byCategory = {};
    
    // 重新计算每个分类的点击次数
    for (const [category, items] of Object.entries(categoriesMapCache || {})) {
      const catName = formatCategory(category);
      let catVisitCount = 0;
      for (const item of items) {
        const keys = getBookmarkKeys(item);
        for (const k of keys) {
          if (visitStats.byBookmark[k]) {
            catVisitCount += visitStats.byBookmark[k];
            break;
          }
        }
      }
      if (catVisitCount > 0) {
        visitStats.byCategory[catName] = catVisitCount;
      }
    }
    
    // 重新计算并更新热门书签缓存
    const byBm = visitStats.byBookmark || {};
    const bmEntries = Object.entries(byBm);
    bmEntries.sort((a, b) => b[1] - a[1]);
    const topBookmarks = bmEntries.slice(0, navTopVisitedCount);
    
    // 保存更新后的统计
    await saveVisitStats();
    
    // 重新渲染热门栏目
    if (navShowTopVisited && categoriesMapCache) {
      renderTopVisitedCategories(categoriesMapCache);
    }
    
    // 更新分类列表的热门书签标记
    updateCategoryHotness();
    
    // 重新渲染分类列表以更新排序
    if (categoriesMapCache) {
      renderCategories(categoriesMapCache);
    }
  }

  async function resetVisitStats() {
    if (!confirm('确定要清空所有访问统计吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      visitStats = {
        byCategory: {},
        byBookmark: {},
        lastByBookmark: {}
      };
      
      await saveVisitStats();
      
      if (navShowTopVisited && categoriesMapCache) {
        renderTopVisitedCategories(categoriesMapCache);
      }
      
      updateCategoryHotness();
      
      if (categoriesMapCache) {
        renderCategories(categoriesMapCache);
      }
    } catch (e) {
      console.error('重置访问统计失败', e);
      alert('重置访问统计失败，请重试');
    }
  }

  function updateCategoryHotness() {
    if (!categoriesMapCache) return;
    
    const entriesRaw = Object.entries(categoriesMapCache);
    const byBm = visitStats.byBookmark || {};
    const bmEntries = Object.entries(byBm);
    bmEntries.sort((a, b) => b[1] - a[1]);
    const topBookmarks = new Set(bmEntries.slice(0, navTopVisitedCount).map(([key]) => key));

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

    const categoryHotness = {};
    for (const [category, items] of entriesRaw) {
      const catName = formatCategory(category);
      let hotCount = 0;
      for (const item of items) {
        const keys = getBookmarkKeys(item);
        let isHot = false;
        for (const key of keys) {
          if (topBookmarks.has(key)) {
            isHot = true;
            break;
          }
        }
        if (isHot) {
          hotCount++;
        }
      }
      categoryHotness[catName] = hotCount;
    }

    const visitBadges = document.querySelectorAll('.visit-badge');
    visitBadges.forEach(badge => {
      const section = badge.closest('.section');
      if (section) {
        const titleEl = section.querySelector('.section-title');
        if (titleEl) {
          const catName = titleEl.textContent;
          const hotCount = categoryHotness[catName] || 0;
          const visitCount = visitStats.byCategory[catName] || 0;
          
          if (hotCount > 0 || visitCount > 0) {
            badge.innerHTML = `<span class="visit-icon">🔥</span><span class="visit-count">${hotCount}</span><span class="visit-separator">|</span><span class="visit-clicks">${visitCount}</span>`;
            badge.style.display = 'flex';
          } else {
            badge.style.display = 'none';
          }
        }
      }
    });
  }

  async function loadTopVisitedPreference() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { navShowTopVisited: showTop, navTopVisitedCount: topN } = await chrome.storage.sync.get(['navShowTopVisited','navTopVisitedCount']);
        navShowTopVisited = !!showTop;
        navTopVisitedCount = Number.isFinite(topN) ? Math.max(1, Math.min(50, Number(topN))) : 10;
      } else if (typeof localStorage !== 'undefined') {
        const showRaw = localStorage.getItem('navShowTopVisited');
        const nRaw = localStorage.getItem('navTopVisitedCount');
        navShowTopVisited = showRaw ? showRaw === 'true' : false;
        navTopVisitedCount = nRaw ? Math.max(1, Math.min(50, Number(nRaw))) : 10;
      }
    } catch (e) {
      navShowTopVisited = false;
      navTopVisitedCount = 10;
    }
  }

  async function loadBookmarkColumnsPreference() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { bookmarkColumns: cols } = await chrome.storage.sync.get(['bookmarkColumns']);
        bookmarkColumns = Number.isFinite(cols) ? Math.max(1, Math.min(5, Number(cols))) : 2;
      } else if (typeof localStorage !== 'undefined') {
        const colsRaw = localStorage.getItem('bookmarkColumns');
        bookmarkColumns = colsRaw ? Math.max(1, Math.min(5, Number(colsRaw))) : 2;
      }
    } catch (e) {
      bookmarkColumns = 2;
    }
    applyBookmarkColumns();
  }

  async function saveBookmarkColumnsPreference(columns) {
    try {
      bookmarkColumns = Math.max(1, Math.min(5, Number(columns)));
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        await chrome.storage.sync.set({ bookmarkColumns });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem('bookmarkColumns', bookmarkColumns);
      }
      applyBookmarkColumns();
    } catch (e) {
      console.warn('保存列数配置失败', e);
    }
  }

  function applyBookmarkColumns() {
    const bookmarksEl = document.getElementById('bookmark-sections');
    if (bookmarksEl) {
      const windowWidth = window.innerWidth;
      let columns = bookmarkColumns;
      
      // 响应式调整实际显示的列数
      if (windowWidth < 900) {
        columns = 1;
      } else if (windowWidth < 1200 && bookmarkColumns > 2) {
        columns = 2;
      }
      
      // 应用到书签网格
      bookmarksEl.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
    
    // 更新下拉菜单高亮状态 - 始终显示保存的设置值
    const elColumnsMenu = document.getElementById('columns-menu');
    if (elColumnsMenu) {
      elColumnsMenu.querySelectorAll('.dropdown-item').forEach(item => {
        const val = parseInt(item.dataset.columns);
        if (val === bookmarkColumns) {
          item.style.background = 'rgba(79,140,255,0.15)';
          item.style.color = 'var(--accent)';
        } else {
          item.style.background = '';
          item.style.color = '';
        }
      });
    }
  }

  window.addEventListener('resize', applyBookmarkColumns);

  function renderTopVisitedCategories(categoriesMap) {
    try {
      const existing = document.getElementById('top-visited');
      if (existing) existing.remove();
      const byCat = visitStats.byCategory || {};
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
      function resolveBookmark(key) {
        const searchKey = String(key);
        
        for (const items of Object.values(categoriesMap || {})) {
          for (const it of items) {
            const keys = getBookmarkKeys(it);
            if (keys.includes(searchKey)) {
              return it;
            }
          }
        }
        
        if (searchKey.includes('|')) {
          const [t, u] = searchKey.split('|');
          return { title: t || u || '未命名', url: u || '', parentPath: '', id: key, isDeleted: true };
        }
        
        return { title: searchKey, url: '', parentPath: '', id: key, isDeleted: true };
      }
      const byBm = visitStats.byBookmark || {};
      const bmEntries = Object.entries(byBm);
      bmEntries.sort((a, b) => b[1] - a[1]);
      const top = bmEntries.slice(0, navTopVisitedCount);

      const section = document.createElement('section');
      section.className = 'section';
      section.id = 'top-visited';

      const header = document.createElement('div');
      header.className = 'section-header';
      const headLeft = document.createElement('div');
      headLeft.className = 'section-head-left';
      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.textContent = '🔥';
      const title = document.createElement('div');
      title.className = 'section-title';
      title.textContent = (window.I18n ? window.I18n.tf('newtab.topVisited.title', { n: top.length }) : `热门书签 Top ${top.length}`);
      const count = document.createElement('div');
      count.className = 'section-count';
      count.textContent = (window.I18n ? window.I18n.tf('newtab.topVisited.count', { count: bmEntries.length }) : `${bmEntries.length} 书签参与统计`);
      headLeft.appendChild(handle);
      headLeft.appendChild(title);
      header.appendChild(headLeft);
      header.appendChild(count);
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'reset-stats-btn';
      resetBtn.textContent = '🗑️';
      resetBtn.title = '清空访问统计';
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetVisitStats();
      });
      header.appendChild(resetBtn);

      const list = document.createElement('ul');
      list.className = 'list';
      if (top.length === 0) {
        const li = document.createElement('li');
        const tipBlock = document.createElement('div');
        tipBlock.className = 'item';
        const bullet = document.createElement('span');
        bullet.className = 'bullet';
        const main = document.createElement('div');
        main.className = 'item-main';
        const t = document.createElement('div');
        t.className = 'title';
        t.textContent = (window.I18n ? window.I18n.t('newtab.topVisited.empty') : '暂无访问记录，点击书签后将统计');
        main.appendChild(t);
        tipBlock.appendChild(bullet);
        tipBlock.appendChild(main);
        li.appendChild(tipBlock);
        list.appendChild(li);
      } else {
      for (const [key, c] of top) {
        const li = document.createElement('li');
        const item = document.createElement('div');
        item.className = 'item';
        const link = document.createElement('a');
        const bm = resolveBookmark(key);
        link.href = bm.url || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const bullet = document.createElement('span');
        bullet.className = 'bullet';
        const main = document.createElement('div');
        main.className = 'item-main';
        const t = document.createElement('div');
        t.className = 'title';
        
        if (bm.isDeleted) {
          t.textContent = `${bm.title || bm.url || '未命名'}（${c} 次，已删除）`;
          t.title = `${bm.title || bm.url || '未命名'}（${c} 次，已删除）`;
          t.style.color = 'var(--muted)';
          link.style.pointerEvents = 'none';
          link.style.cursor = 'default';
        } else {
          t.textContent = `${bm.title || bm.url || '未命名'}（${c} 次）`;
          t.title = `${bm.title || bm.url || '未命名'}（${c} 次）`;
        }
        
        const u = document.createElement('div');
        u.className = 'url';
        u.textContent = bm.url || '';
        main.appendChild(t);
        main.appendChild(u);
        link.appendChild(bullet);
        link.appendChild(main);
        
        if (!bm.isDeleted) {
          link.addEventListener('click', () => {
            const catName = formatCategory(bm.parentPath);
            const normalizedKey = normalizeBookmarkKey(bm);
            recordVisit(catName, normalizedKey);
          });
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = '删除此记录';
        deleteBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await deleteVisitRecord(key);
        });
        
        item.appendChild(link);
        item.appendChild(deleteBtn);
        li.appendChild(item);
        list.appendChild(li);
      }
      }

      section.appendChild(header);
      section.appendChild(list);
      // 启用顶层模块拖拽（在 main 容器内重排）
      enableDragOnSection(section);
      if (elMain && elModulesRow) {
        elMain.insertBefore(section, elModulesRow);
      } else if (elMain && elSections) {
        elMain.insertBefore(section, elSections);
      } else {
        document.body.prepend(section);
      }
      // 根据持久化顺序进行调整（如存在）
      applyMainModuleOrder();
    } catch (e) {
      console.warn('渲染热门栏目失败', e);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && (changes.navShowTopVisited || changes.navTopVisitedCount)) {
        loadTopVisitedPreference().then(() => {
          if (navShowTopVisited && categoriesMapCache) {
            renderTopVisitedCategories(categoriesMapCache);
          } else {
            const existingTop = document.getElementById('top-visited');
            if (existingTop) existingTop.remove();
          }
        });
      }
      if (area === 'sync' && changes.calendarEnabled) {
        loadCalendarPreference();
      }
      if (area === 'sync' && (changes.weatherEnabled || changes.weatherCity)) {
        cachedWeatherSettings = null;
        loadWeather(true);
      }
    });
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'navShowTopVisited' || e.key === 'navTopVisitedCount') {
      loadTopVisitedPreference().then(() => {
        if (navShowTopVisited && categoriesMapCache) {
          renderTopVisitedCategories(categoriesMapCache);
        } else {
          const existingTop = document.getElementById('top-visited');
          if (existingTop) existingTop.remove();
        }
      });
    }
    if (e.key === 'calendarEnabled') {
      loadCalendarPreference();
    }
    if (e.key === 'weatherEnabled' || e.key === 'weatherCity') {
      cachedWeatherSettings = null;
      loadWeather(true);
    }
  });
  // 启用 60s 顶层模块拖拽（在 main 容器内重排）
  if (elSixty) enableDragOnSection(elSixty);
  // 初次加载尝试应用持久化顺序（可能仅有 60s 或热门栏目）
  applyMainModuleOrder();

  // 日历模块
  const elCalendarSection = document.getElementById('calendar-section');
  const elCalendarBody = document.getElementById('calendar-body');
  const elCalendarMonthYear = document.getElementById('calendar-month-year');
  const elCalendarPrev = document.getElementById('calendar-prev');
  const elCalendarNext = document.getElementById('calendar-next');

  let calendarCurrentDate = new Date();
  const calendarCache = new Map();
  const CALENDAR_CACHE_KEY_PREFIX = 'calendar_';
  let currentRenderKey = '';
  const holidayYearCache = new Map();

  async function fetchHolidayYear(year) {
    if (holidayYearCache.has(year)) {
      return holidayYearCache.get(year);
    }

    try {
      const url = `https://timor.tech/api/holiday/year/${year}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Holiday API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code === 0 && data.holiday) {
        holidayYearCache.set(year, data.holiday);
        return data.holiday;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to fetch holiday year:', error);
      return null;
    }
  }

  async function fetchCalendarInfo(year, month, day) {
    const cacheKey = `${CALENDAR_CACHE_KEY_PREFIX}${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (calendarCache.has(cacheKey)) {
      return calendarCache.get(cacheKey);
    }

    try {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let lunarDay = '';
      let festival = '';
      let holidayName = '';
      let isHoliday = false;

      if (typeof Lunar !== 'undefined') {
        try {
          const lunar = Lunar.fromDate(new Date(year, month, day));
          lunarDay = lunar.getDayInChinese();
          const festivals = lunar.getFestivals();
          festival = Array.isArray(festivals) ? festivals.join(' ') : '';
        } catch (e) {
          console.warn('Lunar library error:', e);
        }
      }

      const monthDayKey = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holidayYearData = await fetchHolidayYear(year);
      
      if (holidayYearData && holidayYearData[monthDayKey]) {
        const holidayInfo = holidayYearData[monthDayKey];
        isHoliday = holidayInfo.holiday || false;
        holidayName = holidayInfo.name || '';
      }

      const info = {
        lunar: lunarDay,
        lunarDay: lunarDay,
        festival: festival,
        term: '',
        isHoliday: isHoliday,
        holidayName: holidayName
      };
      
      calendarCache.set(cacheKey, info);
      return info;
    } catch (error) {
      console.warn('Failed to fetch calendar info:', error);
      return null;
    }
  }

  async function renderCalendar(date) {
    if (!elCalendarBody || !elCalendarMonthYear) return;

    const year = date.getFullYear();
    const month = date.getMonth();
    const renderKey = `${year}-${month}`;

    currentRenderKey = renderKey;

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const monthNames = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];

    elCalendarMonthYear.textContent = `${year}年 ${monthNames[month]}`;

    // 使用DocumentFragment批量更新DOM，减少重排
    const fragment = document.createDocumentFragment();
    elCalendarBody.innerHTML = '';

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    weekDays.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-weekday';
      dayEl.textContent = day;
      fragment.appendChild(dayEl);
    });

    for (let i = 0; i < startDayOfWeek; i++) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'calendar-day empty';
      fragment.appendChild(emptyEl);
    }

    const calendarPromises = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';

      const numberEl = document.createElement('div');
      numberEl.className = 'day-number';
      numberEl.textContent = day;
      dayEl.appendChild(numberEl);

      if (year === todayYear && month === todayMonth && day === todayDate) {
        dayEl.classList.add('today');
      }

      const infoPromise = fetchCalendarInfo(year, month, day);
      calendarPromises.push({ dayEl, infoPromise, day, year, month });

      dayEl.addEventListener('click', () => {
        const clickedDate = new Date(year, month, day);
        const dateStr = clickedDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        console.log('Selected date:', dateStr);
      });

      fragment.appendChild(dayEl);
    }

    // 一次性将所有元素添加到DOM
    elCalendarBody.appendChild(fragment);

    const results = await Promise.allSettled(calendarPromises.map(p => p.infoPromise));
    
    if (currentRenderKey !== renderKey) {
      return;
    }
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const { dayEl, day } = calendarPromises[index];
        const info = result.value;

        if (info.holidayName) {
          const holidayEl = document.createElement('div');
          holidayEl.className = 'holiday';
          holidayEl.textContent = info.holidayName;
          dayEl.appendChild(holidayEl);
        } else if (info.lunarDay) {
          const lunarEl = document.createElement('div');
          lunarEl.className = 'lunar-day';
          lunarEl.textContent = info.lunarDay;
          dayEl.appendChild(lunarEl);
        }
      }
    });
  }

  function initCalendar() {
    if (!elCalendarSection || !elCalendarBody) return;

    renderCalendar(calendarCurrentDate);

    if (elCalendarPrev) {
      elCalendarPrev.addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        renderCalendar(calendarCurrentDate);
      });
    }

    if (elCalendarNext) {
      elCalendarNext.addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        renderCalendar(calendarCurrentDate);
      });
    }

    elCalendarSection.hidden = false;

    if (typeof enableDragOnSection === 'function') {
      enableDragOnSection(elCalendarSection);
    }
  }

  initCalendar();

  // 壁纸随机刷新按钮功能
  const wallpaperRefreshBtn = document.getElementById('wallpaper-refresh-btn');
  if (wallpaperRefreshBtn) {
    wallpaperRefreshBtn.addEventListener('click', async () => {
      // 添加旋转动画
      wallpaperRefreshBtn.classList.add('refreshing');
      
      try {
        // 强制刷新随机壁纸
        await loadRandomWallpaper();
        
        // 显示成功提示
        console.log('随机壁纸已刷新');
      } catch (error) {
        console.error('壁纸刷新失败:', error);
        // 显示错误提示（使用简单的alert，因为导航页没有复杂的消息系统）
        alert('壁纸刷新失败，请检查网络连接或稍后重试');
      } finally {
        // 移除旋转动画
        setTimeout(() => {
          wallpaperRefreshBtn.classList.remove('refreshing');
        }, 500);
      }
    });
  }

  window.setBookmarkColumns = async (columns) => {
    await saveBookmarkColumnsPreference(columns);
    console.log(`书签列数已设置为: ${columns}`);
  };
})();
