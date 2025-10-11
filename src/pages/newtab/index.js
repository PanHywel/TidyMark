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
  const elWeather = document.getElementById('weather-bar');
  const elSubtitleMain = document.getElementById('subtitle-main');
  const elWallpaperBtn = document.getElementById('wallpaper-toggle-btn');
  // 书签展示由配置控制；不再使用顶部按钮
  const elBookmarksPlaceholder = document.getElementById('bookmarks-placeholder');
  // 60s 读懂世界
  const elSixty = document.getElementById('sixty-seconds');
  const elSixtyBody = document.getElementById('sixty-body');
  const elSixtyDate = document.getElementById('sixty-date');
  // 已移除单独的“查看原文”按钮
  
  // 壁纸：60s Bing 壁纸
  const WALLPAPER_TTL = 6 * 60 * 60 * 1000; // 6小时缓存
  const WALLPAPER_CACHE_KEY = 'bing_wallpaper_cache_v1';
  // 60s 项目的多实例备用路由（用于 60s 与 Bing 壁纸）
  const SIXTY_INSTANCES = [
    'https://60s.viki.moe',
    'https://60api.09cdn.xyz',
    'https://60s.zeabur.app',
    'https://60s.crystelf.top',
    'https://cqxx.site',
    'https://api.yanyua.icu',
    'https://60s.tmini.net',
    'https://60s.7se.cn'
  ];

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

  async function setCachedWallpaper(data) {
    const payload = { timestamp: Date.now(), data };
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [WALLPAPER_CACHE_KEY]: payload });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WALLPAPER_CACHE_KEY, JSON.stringify(payload));
      }
    } catch {}
  }

  async function fetchBingWallpaper60s(signal) {
    // 1) 依次尝试 60s 实例 /v2/bing
    let lastErr;
    for (const base of SIXTY_INSTANCES) {
      try {
        const url = `${base}/v2/bing`;
        const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
        if (!resp.ok) throw new Error(`壁纸服务返回状态 ${resp.status}`);
        const json = await resp.json();
        if (!json || typeof json !== 'object') throw new Error('壁纸响应非JSON');
        if (json.code !== 200) throw new Error(`壁纸服务错误码 ${json.code}`);
        const d = json.data || {};
        const cover = d.cover_4k || d.cover;
        if (!cover) throw new Error('未提供壁纸链接');
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
      if (!resp.ok) throw new Error(`Bing 接口返回状态 ${resp.status}`);
      const json = await resp.json();
      const img = json && Array.isArray(json.images) ? json.images[0] : null;
      const rel = img && (img.url || '');
      if (!rel) throw new Error('Bing 接口未提供图片URL');
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
      let wp = null;
      if (!force) wp = await getCachedWallpaper();
      if (!wp) {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 15000); // 最多等待15秒
        try {
          wp = await fetchBingWallpaper60s(ac.signal);
        } finally {
          clearTimeout(timer);
        }
        if (wp) await setCachedWallpaper(wp);
      }
      if (wp && document && document.body) {
        document.body.style.backgroundImage = `url('${wp.cover}')`;
        document.body.classList.add('has-wallpaper');
      } else if (document && document.body) {
        document.body.style.backgroundImage = 'none';
        document.body.classList.remove('has-wallpaper');
      }
    } catch (err) {
      console.warn('加载壁纸失败', err);
      if (document && document.body) {
        document.body.style.backgroundImage = 'none';
        document.body.classList.remove('has-wallpaper');
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
    elWallpaperBtn.title = wallpaperEnabled ? '壁纸：已开启' : '壁纸：已关闭';
  }

  // 壁纸偏好由设置页控制；新标签页不再提供按钮切换

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
  // 加载壁纸偏好与壁纸
  await loadWallpaperPreference();
  await loadWallpaper();

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
  });

  // 加载非聚焦透明度偏好并应用到页面（分离：搜索框与书签框）
  async function loadOpacityPreferences() {
    let sVal = 0.86;
    let bVal = 0.86;
    let xVal = 0.86; // 60s栏目透明度
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { searchUnfocusedOpacity, bookmarksUnfocusedOpacity, sixtyUnfocusedOpacity } = await chrome.storage.sync.get(['searchUnfocusedOpacity','bookmarksUnfocusedOpacity','sixtyUnfocusedOpacity']);
        const sNum = typeof searchUnfocusedOpacity === 'string' ? parseFloat(searchUnfocusedOpacity) : searchUnfocusedOpacity;
        const bNum = typeof bookmarksUnfocusedOpacity === 'string' ? parseFloat(bookmarksUnfocusedOpacity) : bookmarksUnfocusedOpacity;
        const xNum = typeof sixtyUnfocusedOpacity === 'string' ? parseFloat(sixtyUnfocusedOpacity) : sixtyUnfocusedOpacity;
        if (Number.isFinite(sNum) && sNum >= 0.6 && sNum <= 1) sVal = sNum;
        if (Number.isFinite(bNum) && bNum >= 0.6 && bNum <= 1) bVal = bNum;
        if (Number.isFinite(xNum) && xNum >= 0.6 && xNum <= 1) xVal = xNum;
      } else if (typeof localStorage !== 'undefined') {
        const sRaw = localStorage.getItem('searchUnfocusedOpacity');
        const bRaw = localStorage.getItem('bookmarksUnfocusedOpacity');
        const xRaw = localStorage.getItem('sixtyUnfocusedOpacity');
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
      }
    } catch {}
    document.documentElement.style.setProperty('--search-unfocused-opacity', String(sVal));
    document.documentElement.style.setProperty('--bookmarks-unfocused-opacity', String(bVal));
    document.documentElement.style.setProperty('--sixty-unfocused-opacity', String(xVal));
  }
  await loadOpacityPreferences();

  // 60s 读懂世界：配置与渲染
  const SIXTY_TTL = 30 * 60 * 1000; // 30分钟缓存
  const SIXTY_CACHE_KEY = 'sixty_seconds_cache_v1';
  const DEFAULT_SUBTITLE = '愿你高效、专注地浏览每一天';
  let currentSixtyTip = '';

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

  async function fetchSixtyData(signal) {
    let lastErr;
    for (const base of SIXTY_INSTANCES) {
      try {
        const url = `${base}/v2/60s`;
        const resp = await fetch(url, { method: 'GET', redirect: 'follow', signal });
        if (!resp.ok) throw new Error(`60s 服务返回状态 ${resp.status}`);
        const json = await resp.json();
        if (!json || typeof json !== 'object') throw new Error('60s 响应非JSON');
        if (json.code !== 200) throw new Error(`60s 服务错误码 ${json.code}`);
        const d = json.data || {};
        if (!Array.isArray(d.news)) d.news = [];
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
      const tip = data.tip || '';
      const link = data.link || '';
      const news = Array.isArray(data.news) ? data.news : [];
      const newsItems = news.slice(0, 8).map(n => `
        <li>
          <span class="sixty-bullet" aria-hidden="true"></span>
          <span>${n}</span>
        </li>
      `).join('');
      elSixtyBody.innerHTML = `
        <img class="sixty-cover" ${cover ? `src="${cover}"` : ''} alt="每日封面" onerror="this.style.display='none'" loading="lazy" />
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
      currentSixtyTip = tip || '';
      renderSubtitle();
    } catch {}
  }

  let sixtyEnabled = true;

  function applySixtyEnabled(enabled) {
    sixtyEnabled = !!enabled;
    if (elSixty) elSixty.hidden = !sixtyEnabled;
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
    let enabled = true;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { sixtySecondsEnabled } = await chrome.storage.sync.get(['sixtySecondsEnabled']);
        enabled = sixtySecondsEnabled !== undefined ? !!sixtySecondsEnabled : true;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('sixtySecondsEnabled');
        if (raw != null) {
          try { enabled = !!JSON.parse(raw); } catch { enabled = raw === 'true'; }
        } else {
          enabled = true;
        }
      }
    } catch {}
    applySixtyEnabled(enabled);
  }

  async function loadSixty(force = false) {
    if (!elSixty) return;
    try {
      if (!force) {
        const cached = await getCachedSixty();
        if (cached) {
          renderSixty(cached);
          return;
        }
      }
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 15000);
      let data = null;
      try {
        data = await fetchSixtyData(ac.signal);
      } finally {
        clearTimeout(timer);
      }
      if (data) {
        await setCachedSixty(data);
        renderSixty(data);
      }
    } catch (err) {
      console.warn('加载 60s 栏目失败', err);
      if (elSixtyBody) {
        elSixtyBody.innerHTML = '<div class="sixty-tip">加载失败，请稍后重试</div>';
      }
      // 清空提示，回退到默认副标题
      currentSixtyTip = '';
      renderSubtitle();
    }
  }

  await loadSixtyPreference();
  if (!elSixty.hidden) {
    await loadSixty();
  }

  function renderSubtitle() {
    if (!elSubtitleMain) return;
    const t = (currentSixtyTip || '').trim();
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
    return { weatherEnabled, weatherCity };
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
    if (!data) {
      elWeather.innerHTML = `
        <span class="weather-desc">天气加载失败</span>
        <button type="button" class="weather-refresh" id="weather-refresh-btn" title="刷新">↻ 刷新</button>
      `;
      elWeather.hidden = false;
      const rbtn = document.getElementById('weather-refresh-btn');
      if (rbtn) {
        rbtn.onclick = () => loadWeather(true);
      }
      // 点击天气区域弹出设置
      elWeather.onclick = async (e) => {
        if (e.target && e.target.id === 'weather-refresh-btn') return;
        const val = prompt('请输入城市名称（例如：南京、雨花台）', '');
        if (val !== null) {
          const city = (val || '').trim();
          await saveWeatherCity(city);
          loadWeather(true);
        }
      };
      return;
    }
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
      <button type="button" class="weather-refresh" id="weather-refresh-btn" title="刷新">↻ 刷新</button>
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
      const val = prompt('请输入城市名称（例如：南京、雨花台）', city === '—' ? '' : city);
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
    // 60s v2 天气端点候选（均支持 HTTPS，按顺序回退）
    const instances = [
      'https://60s.viki.moe',
      'https://60api.09cdn.xyz',
      'https://60s.zeabur.app',
      'https://60s.crystelf.top',
      'https://cqxx.site',
      'https://api.yanyua.icu',
      'https://60s.tmini.net',
      'https://60s.7se.cn'
    ];
    let lastError = null;
    for (const base of instances) {
      const url = `${base}/v2/weather${city ? `?query=${encodeURIComponent(city)}` : ''}`;
      try {
        const resp = await fetch(url, { cache: 'no-store', redirect: 'follow' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        // 要求 code===200 才视为成功
        if (typeof json.code === 'number' && json.code === 200 && json.data) {
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
      function mapWeatherCode(c) {
        const m = {
          0: '晴', 1: '少云', 2: '多云', 3: '阴',
          45: '雾', 48: '雾',
          51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
          56: '冻毛毛雨', 57: '冻毛毛雨',
          61: '小雨', 63: '中雨', 65: '大雨',
          66: '冻雨', 67: '冻雨',
          71: '小雪', 73: '中雪', 75: '大雪',
          77: '雪粒',
          80: '阵雨', 81: '阵雨', 82: '阵雨',
          85: '阵雪', 86: '阵雪',
          95: '雷暴', 96: '雷暴冰雹', 99: '强雷暴冰雹'
        };
        return m[c] || '未知';
      }
      const desc = mapWeatherCode(code);
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
      // 若未填写城市：直接提示用户设置城市，不进行默认请求
      let city = weatherCity || '';
      if (!city) {
        if (elWeather) {
          elWeather.innerHTML = `<span class="weather-desc">未设置城市</span>`;
          elWeather.hidden = false;
          // 点击天气区域弹出设置
          elWeather.onclick = async () => {
            const val = prompt('请输入城市名称（例如：南京、雨花台）', '');
            if (val !== null) {
              const nextCity = (val || '').trim();
              await saveWeatherCity(nextCity);
              loadWeather(true);
            }
          };
        }
        return;
      }
      if (!force) {
        const cached = await getCachedWeather(city);
        if (cached) {
          renderWeather(cached);
          return;
        }
      }
      const data = await fetchWeather(city);
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
      console.warn('天气加载失败', err);
      renderWeather(null);
    }
  }

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
      light: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42Zm10.48 0 1.8-1.79 1.41 1.41-1.79 1.8-1.42-1.42ZM12 4V1h-2v3h2Zm0 19v-3h-2v3h2ZM4 12H1v2h3v-2Zm22 0h-3v2h3v-2ZM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79Zm10.48 0 1.42 1.42 1.79-1.8-1.41-1.41-1.8 1.79ZM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z"/></svg>`,
      dark: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>`
    };
    const isSystem = mode === 'system';
    const systemIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = isSystem ? (systemIsDark ? 'dark' : 'light') : mode;
    elThemeBtn.innerHTML = icons[effective] || icons.light;
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
    if (elMain && elSixty) {
      // 将搜索结果插入到 60s 栏目之前
      elMain.insertBefore(section, elSixty);
    } else if (elMain && elSections) {
      // 兜底：插入到书签列表之前
      elMain.insertBefore(section, elSections);
    } else if (elMain) {
      // 最后兜底：插入到主区域最前面
      elMain.prepend(section);
    } else {
      document.body.appendChild(section);
    }
  }
})();