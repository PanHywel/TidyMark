# Dynamic Wallpaper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add video wallpaper support alongside existing Bing daily wallpaper, with switching via Options page.

**Architecture:** Route `wallpaperType` preference in newtab `loadWallpaper()` to either existing Bing path or new video path. Video uses a `<video>` element with `object-fit: cover` positioned as fullscreen background. Custom URLs are fetched as blobs to work within existing CSP.

**Tech Stack:** Vanilla JS, Chrome Extension MV3, WebM video

---

## File Structure

| File | Role |
|---|---|
| `src/pages/newtab/index.js` | Wallpaper routing + video management (create this first) |
| `src/pages/newtab/index.css` | Video element background styles |
| `src/pages/options/index.html` | Wallpaper type selector UI |
| `src/pages/options/index.js` | wallpaperType/videoUrl load/save/render |
| `services/i18n.js` | Translation keys for new UI |
| `assets/wallpaper/default.webm` | Built-in landscape video |

---

### Task 1: Add i18n translation keys

**Files:**
- Modify: `services/i18n.js`

- [ ] **Step 1: Add wallpaper type i18n keys**

Insert after the existing `options.nav.wallpaper.tip` block (currently around line 570). Find the exact location:

```javascript
// After: 'options.nav.wallpaper.tip': { ... }
```

Add:

```javascript
    'options.nav.wallpaper.type': { 'zh-CN': '壁纸类型', 'zh-TW': '壁紙類型', 'en': 'Wallpaper type', 'ru': 'Тип обоев' },
    'options.nav.wallpaper.type.bing': { 'zh-CN': 'Bing 每日壁纸', 'zh-TW': 'Bing 每日壁紙', 'en': 'Bing daily wallpaper', 'ru': 'Ежедневные обои Bing' },
    'options.nav.wallpaper.type.video': { 'zh-CN': '动态视频壁纸', 'zh-TW': '動態視訊壁紙', 'en': 'Dynamic video wallpaper', 'ru': 'Динамические видеообои' },
    'options.nav.wallpaper.type.none': { 'zh-CN': '关闭壁纸', 'zh-TW': '關閉壁紙', 'en': 'No wallpaper', 'ru': 'Без обоев' },
    'options.nav.wallpaper.videoUrl': { 'zh-CN': '自定义视频 URL（可选）', 'zh-TW': '自訂視訊 URL（可選）', 'en': 'Custom video URL (optional)', 'ru': 'Пользовательский URL видео (необязательно)' },
    'options.nav.wallpaper.videoUrl.desc': { 'zh-CN': '留空则使用内置风景视频。支持 WebM/MP4 格式', 'zh-TW': '留空則使用內建風景視訊。支援 WebM/MP4 格式', 'en': 'Leave empty to use built-in landscape video. Supports WebM/MP4', 'ru': 'Оставьте пустым для использования встроенного видео. Поддерживает WebM/MP4' },
```

- [ ] **Step 2: Verify i18n keys exist**

Run: `grep "options.nav.wallpaper.type" services/i18n.js`
Expected: shows all 6 new keys

---

### Task 2: Add wallpaper type selector to Options HTML

**Files:**
- Modify: `src/pages/options/index.html`

- [ ] **Step 1: Replace the wallpaperEnabled checkbox with type selector**

Find the current wallpaper block (approximately lines 90-99):

```html
        <div class="setting-item">
          <div class="toggle-row">
            <label class="setting-label">
              <input type="checkbox" id="wallpaperEnabled">
              <span class="checkmark"></span>
              <span data-i18n="options.nav.wallpaper.toggle">显示 Bing 壁纸背景</span>
            </label>
            <p class="setting-desc inline-hint" data-i18n="options.nav.wallpaper.tip">开启后，新标签页将使用 Bing 每日壁纸作为背景</p>
          </div>
        </div>
```

Replace with:

```html
        <div class="setting-item">
          <label class="setting-label" data-i18n="options.nav.wallpaper.type">壁纸类型</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="wallpaperType" value="bing">
              <span data-i18n="options.nav.wallpaper.type.bing">Bing 每日壁纸</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="wallpaperType" value="video">
              <span data-i18n="options.nav.wallpaper.type.video">动态视频壁纸</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="wallpaperType" value="none">
              <span data-i18n="options.nav.wallpaper.type.none">关闭壁纸</span>
            </label>
          </div>
          <p class="setting-desc inline-hint" data-i18n="options.nav.wallpaper.tip">选择新标签页的背景壁纸类型</p>
        </div>
        <div class="setting-item" id="videoUrlGroup" hidden>
          <label class="setting-label" for="wallpaperVideoUrl" data-i18n="options.nav.wallpaper.videoUrl">自定义视频 URL（可选）</label>
          <input type="text" id="wallpaperVideoUrl" class="setting-input" data-i18n-placeholder="options.nav.wallpaper.videoUrl" placeholder="https://example.com/wallpaper.webm">
          <p class="setting-desc" data-i18n="options.nav.wallpaper.videoUrl.desc">留空则使用内置风景视频。支持 WebM/MP4 格式</p>
        </div>
```

---

### Task 3: Update Options JS — load keys, defaults, bind events, render

**Files:**
- Modify: `src/pages/options/index.js`

This task has 4 sub-steps, each a focused edit.

- [ ] **Step 1: Add keys to sync storage get list**

At line 54 (after `'wallpaperEnabled'`), add the two new keys:

```javascript
          'wallpaperEnabled',
          'wallpaperType',
          'wallpaperVideoUrl',
```

- [ ] **Step 2: Add keys to localStorage fallback list**

At line 109 (after `'wallpaperEnabled'`), add the same two keys:

```javascript
          'wallpaperEnabled',
          'wallpaperType',
          'wallpaperVideoUrl',
```

- [ ] **Step 3: Add to settings defaults**

At line 183-184 (where `wallpaperEnabled` default is set), add migration logic and new defaults. Find:

```javascript
        wallpaperEnabled: result.wallpaperEnabled !== undefined ? !!result.wallpaperEnabled : true,
```

Replace with:

```javascript
        wallpaperEnabled: result.wallpaperEnabled !== undefined ? !!result.wallpaperEnabled : true,
        wallpaperType: (() => {
          if (result.wallpaperType && ['bing','video','none'].includes(result.wallpaperType)) return result.wallpaperType;
          // Migrate: if old wallpaperEnabled is explicitly false, default to 'none'
          if (result.wallpaperType === undefined && result.wallpaperEnabled === false) return 'none';
          return 'bing';
        })(),
        wallpaperVideoUrl: (result.wallpaperVideoUrl || '').trim(),
```

- [ ] **Step 4: Replace wallpaperEnabled event binding**

Find the wallpaperEnabled checkbox binding (lines 648-655):

```javascript
    // 壁纸开关
    const wallpaperEnabled = document.getElementById('wallpaperEnabled');
    if (wallpaperEnabled) {
      wallpaperEnabled.addEventListener('change', (e) => {
        this.settings.wallpaperEnabled = !!e.target.checked;
        this.saveSettings();
      });
    }
```

Replace with:

```javascript
    // 壁纸类型选择
    const wallpaperTypeRadios = document.querySelectorAll('input[name="wallpaperType"]');
    wallpaperTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.settings.wallpaperType = e.target.value;
          this.settings.wallpaperEnabled = e.target.value !== 'none';
          this.saveSettings();
          this.updateVideoUrlVisibility();
        }
      });
    });

    // 自定义视频 URL
    const wallpaperVideoUrl = document.getElementById('wallpaperVideoUrl');
    if (wallpaperVideoUrl) {
      wallpaperVideoUrl.addEventListener('input', (e) => {
        this.settings.wallpaperVideoUrl = (e.target.value || '').trim();
        this.saveSettings();
      });
    }
```

- [ ] **Step 5: Replace wallpaperEnabled render in updateWidgetConfig**

Find the wallpaperEnabled render (lines 2295-2300):

```javascript
    const wallpaperEnabled = document.getElementById('wallpaperEnabled');
    if (wallpaperEnabled) {
      wallpaperEnabled.checked = this.settings.wallpaperEnabled !== undefined
        ? !!this.settings.wallpaperEnabled
        : true; // 默认开启
    }
```

Replace with:

```javascript
    const wallpaperType = this.settings.wallpaperType || 'bing';
    const checkedRadio = document.querySelector(`input[name="wallpaperType"][value="${wallpaperType}"]`);
    if (checkedRadio) checkedRadio.checked = true;
    const wallpaperVideoUrl = document.getElementById('wallpaperVideoUrl');
    if (wallpaperVideoUrl) wallpaperVideoUrl.value = this.settings.wallpaperVideoUrl || '';
    this.updateVideoUrlVisibility();
```

- [ ] **Step 6: Add updateVideoUrlVisibility helper method**

Find a suitable location near the other render methods (around line 2290, inside the class). Add this method to the class:

```javascript
  updateVideoUrlVisibility() {
    const group = document.getElementById('videoUrlGroup');
    if (!group) return;
    group.hidden = this.settings.wallpaperType !== 'video';
  }
```

The `this.updateVideoUrlVisibility` is already called from the radio change handler and render in steps 4 and 5.

---

### Task 4: Add video wallpaper management to newtab index.js

**Files:**
- Modify: `src/pages/newtab/index.js`

This is the core change. Each step modifies a specific section.

- [ ] **Step 1: Add wallpaperType/wallpaperVideoUrl variables**

At line 37-38 (near other wallpaper constants), add:

```javascript
  let wallpaperType = 'bing'; // 'bing' | 'video' | 'none'
  let wallpaperVideoUrl = '';
```

Insert after:

```javascript
  const WALLPAPER_CACHE_KEY = 'bing_wallpaper_cache_v2';
```

- [ ] **Step 2: Replace loadWallpaperPreference to load new keys and migrate**

Find `loadWallpaperPreference()` (lines 330-341):

```javascript
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
```

Replace with:

```javascript
  async function loadWallpaperPreference() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
        const { wallpaperType: storedType, wallpaperVideoUrl: storedUrl, wallpaperEnabled: storedEnabled } = await chrome.storage.sync.get(['wallpaperType', 'wallpaperVideoUrl', 'wallpaperEnabled']);
        wallpaperVideoUrl = (storedUrl || '').trim();
        if (storedType && ['bing','video','none'].includes(storedType)) {
          wallpaperType = storedType;
        } else if (storedType === undefined && storedEnabled === false) {
          // Migrate: old user explicitly disabled wallpaper
          wallpaperType = 'none';
        } else {
          wallpaperType = 'bing';
        }
        wallpaperEnabled = wallpaperType !== 'none';
      } else if (typeof localStorage !== 'undefined') {
        const type = localStorage.getItem('wallpaperType');
        const url = localStorage.getItem('wallpaperVideoUrl');
        wallpaperVideoUrl = (url || '').replace(/^"|"$/g, '').trim();
        if (type && ['bing','video','none'].includes(type.replace(/^"|"$/g, ''))) {
          wallpaperType = type.replace(/^"|"$/g, '');
        } else {
          const enabled = localStorage.getItem('wallpaperEnabled');
          if (enabled === 'false') wallpaperType = 'none';
          else wallpaperType = 'bing';
        }
        wallpaperEnabled = wallpaperType !== 'none';
      }
    } catch {}
    renderWallpaperToggle();
  }
```

- [ ] **Step 3: Replace loadWallpaper to branch on type**

Find `loadWallpaper()` (lines 273-328). Replace the entire function body after the initial check:

Replace the entire function with:

```javascript
  let videoEl = null;
  let videoBlobUrl = null;

  function removeVideoWallpaper() {
    if (videoEl) {
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.load();
      videoEl.remove();
      videoEl = null;
    }
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      videoBlobUrl = null;
    }
  }

  function clearWallpaper() {
    if (document && document.body) {
      document.body.style.backgroundImage = 'none';
      document.body.classList.remove('has-wallpaper');
    }
    removeVideoWallpaper();
  }

  async function getVideoSource() {
    if (wallpaperVideoUrl) {
      try {
        const resp = await fetch(wallpaperVideoUrl, { mode: 'cors' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const blob = await resp.blob();
        videoBlobUrl = URL.createObjectURL(blob);
        return videoBlobUrl;
      } catch (e) {
        console.warn('Failed to load custom video, falling back to built-in', e);
      }
    }
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('assets/wallpaper/default.webm');
    }
    return 'assets/wallpaper/default.webm';
  }

  async function manageVideoWallpaper() {
    try {
      // Clear any Bing background first
      if (document && document.body) {
        document.body.style.backgroundImage = 'none';
      }

      const src = await getVideoSource();

      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.className = 'wallpaper-video';
        videoEl.muted = true;
        videoEl.loop = true;
        videoEl.playsInline = true;
        videoEl.autoplay = true;
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('preload', 'auto');
        videoEl.onerror = () => {
          console.warn('Video wallpaper failed to load');
          clearWallpaper();
        };
        document.body.prepend(videoEl);
      }

      if (videoEl.src !== src) {
        videoEl.src = src;
        videoEl.load();
      }

      videoEl.play().catch(() => {});
      if (document && document.body) {
        document.body.classList.add('has-wallpaper');
      }
    } catch (err) {
      console.warn('Failed to manage video wallpaper', err);
      clearWallpaper();
    }
  }

  async function loadWallpaper(force = false) {
    try {
      if (wallpaperType === 'none') {
        clearWallpaper();
        return;
      }
      if (wallpaperType === 'video') {
        await manageVideoWallpaper();
        return;
      }
      // Clean up video element if switching from video mode
      removeVideoWallpaper();
      // ---- existing Bing logic below (unchanged) ----
      // 先应用缓存（即便不是"新鲜"的），避免空白背景
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
        const timer = setTimeout(() => ac.abort(), 15000);
        try {
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
```

- [ ] **Step 4: Add Page Visibility handling for video**

At the end of the IIFE (before the closing `})();`), insert:

```javascript
  // Page Visibility: pause/resume video wallpaper to save resources
  document.addEventListener('visibilitychange', () => {
    if (!videoEl || wallpaperType !== 'video') return;
    if (document.hidden) {
      videoEl.pause();
    } else {
      videoEl.play().catch(() => {});
    }
  });
```

- [ ] **Step 5: Handle storage changes for wallpaper type**

In the existing `chrome.storage.onChanged` listener (around line 420), add handling for wallpaper type changes. Find the block:

```javascript
      if (area === 'sync' && changes.showBookmarks) {
        applyShowBookmarks(!!changes.showBookmarks.newValue);
      }
```

Add after:

```javascript
      if (area === 'sync' && (changes.wallpaperType || changes.wallpaperVideoUrl)) {
        loadWallpaperPreference().then(() => loadWallpaper(true));
      }
```

Also add to the `window.addEventListener('storage', ...)` block (around line 438), after the existing handlers:

```javascript
    if (e.key === 'wallpaperType' || e.key === 'wallpaperVideoUrl') {
      loadWallpaperPreference().then(() => loadWallpaper(true));
    }
```

---

### Task 5: Add video wallpaper CSS

**Files:**
- Modify: `src/pages/newtab/index.css`

- [ ] **Step 1: Add .wallpaper-video styles**

At the end of the file, add:

```css
/* 动态视频壁纸背景层 */
.wallpaper-video {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
  pointer-events: none;
  /* 与现有 Bing 壁纸暗层效果配合，为页面内容提供可读性 */
  background: var(--bg); /* solid fallback while loading */
}
```

---

### Task 6: Download and add built-in landscape video

**Files:**
- Create: `assets/wallpaper/default.webm`

- [ ] **Step 1: Create directory and download video**

Run:
```bash
mkdir -p /Users/hywel/workspaces/TidyMark/assets/wallpaper
```

Download a free landscape WebM video from Pexels (or similar). Suggested search: "nature landscape loop" on pixabay.com or pexels.com. The video should be:
- WebM format, VP9 or VP8 codec
- 1080p or lower resolution
- ~2-4 MB in size
- Seamless loop (start and end frames match)
- Landscape/scenery content (mountains, ocean, forest, etc.)

Run to download a suitable video:
```bash
# Example using a free stock video URL (replace with actual chosen video)
curl -L -o /Users/hywel/workspaces/TidyMark/assets/wallpaper/default.webm "https://example.com/landscape.webm"
```

Note: pick an actual free stock video URL. One option is from the Pexels API or a direct Pixabay download.

- [ ] **Step 2: Verify video**

Run: `file /Users/hywel/workspaces/TidyMark/assets/wallpaper/default.webm`
Expected: `WebM` in output

Run: `ls -lh /Users/hywel/workspaces/TidyMark/assets/wallpaper/default.webm`
Expected: reasonable file size (2-5 MB)

---

### Task 7: Verify the full flow

- [ ] **Step 1: Load the newtab page and check default Bing mode**

Open the newtab page (directly in browser for preview, or load the extension). Verify Bing wallpaper still works as before.

- [ ] **Step 2: Switch to video wallpaper in Options**

Open Options page → Navigate to "导航页" tab → Select "动态视频壁纸" → Save. Open a new tab. Verify video plays as fullscreen background.

- [ ] **Step 3: Switch to no wallpaper**

In Options, select "关闭壁纸" → New tab should show solid background.

- [ ] **Step 4: Test custom URL**

In Options, enter a custom WebM/MP4 URL → Verify it loads instead of built-in.

- [ ] **Step 5: Test Page Visibility**

Open newtab with video wallpaper → Switch to another tab → Switch back. Video should pause/resume.

- [ ] **Step 6: Test mobile responsive**

Use browser DevTools responsive mode at 375px width → Verify video still covers viewport correctly.
