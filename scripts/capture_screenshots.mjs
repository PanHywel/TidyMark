import { chromium } from 'playwright';
import fs from 'fs/promises';

const DEFAULT_LANGS = ['zh-CN', 'zh-TW', 'en', 'ru'];

function arg(name, def) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
}

const BASE = arg('base', 'http://localhost:8000');
const WIDTH = parseInt(arg('width', '1280'), 10);
const HEIGHT = parseInt(arg('height', '800'), 10);
const OUT = arg('out', 'assets/screenshots');
const LANGS = (arg('langs', DEFAULT_LANGS.join(','))).split(',').map(s => s.trim()).filter(Boolean);
const PREWAIT_MS = parseInt(arg('prewait', '5000'), 10); // 新标签页截图前的预等待毫秒数
const HIDE_SIXTY = String(arg('hideSixty', 'true')).toLowerCase() === 'true'; // 是否隐藏 60s 栏目

async function ensureLanguage(page, lang) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(`(async () => { if (window.I18n) { try { await window.I18n.init(); } catch(e){} } })()`);
  await page.evaluate(`(async () => { if (window.I18n && window.I18n.setLanguage) { await window.I18n.setLanguage('${lang}'); } })()`);
  await page.waitForTimeout(300);
}

async function waitForWallpaperOrDisabled(page, timeout = 20000) {
  // 等待：
  // 1) 壁纸被禁用（无 has-wallpaper），或
  // 2) body 背景图 url 可解析且图片已成功加载
  await page.waitForFunction(() => {
    const body = document && document.body;
    if (!body) return false;
    const has = body.classList.contains('has-wallpaper');
    const bg = getComputedStyle(body).backgroundImage;
    // 壁纸关闭，则无需等待
    if (!has) return true;
    if (!bg || bg === 'none') return false;
    const m = bg.match(/url\((['"]?)(.*?)\1\)/);
    const url = m && m[2];
    if (!url) return false;
    const img = (window.__bgImgReady ||= new Image());
    if (img.src !== url) img.src = url;
    return img.complete && img.naturalWidth > 0;
  }, { timeout });
}

async function waitForVisibleImages(page, timeout = 15000) {
  // 等待页面上“可见”的 <img> 元素加载完成（如 60s 封面）
  await page.waitForFunction(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
      .filter(img => !!(img.offsetWidth || img.offsetHeight || img.getClientRects().length));
    if (imgs.length === 0) return true;
    return imgs.every(img => img.complete && img.naturalWidth > 0);
  }, { timeout });
}

async function screenshotNewtab(context, base, outDir, width, height, lang) {
  const page = await context.newPage();
  // 转发页面 console 到 Node 侧，便于观察等待过程
  page.on('console', (msg) => {
    const type = msg.type();
    if (['log','debug','warning','error'].includes(type)) {
      console.log(`[page:${lang}] ${type}:`, msg.text());
    }
  });

  console.log(`[shots] [newtab] lang=${lang} -> ${base}/src/pages/newtab/index.html`);
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/src/pages/newtab/index.html`, { waitUntil: 'domcontentloaded' });
  await ensureLanguage(page, lang);
  console.log(`[shots] [newtab] hideSixty=${HIDE_SIXTY}`);
  if (HIDE_SIXTY) {
    // 双保险：即使偏好未及时被读取，也直接隐藏元素
    await page.evaluate(() => { try { const x = document.getElementById('sixty-seconds'); if (x) x.hidden = true; } catch {} });
  }
  console.log(`[shots] [newtab] prewait ${PREWAIT_MS}ms before loading checks`);
  await page.waitForTimeout(PREWAIT_MS);
  // 记录当前语言与壁纸初始状态
  const activeLang = await page.evaluate(() => {
    try {
      if (window.I18n) {
        if (typeof window.I18n.getLanguageSync === 'function') return window.I18n.getLanguageSync();
        if (typeof window.I18n.getLanguage === 'function') return window.I18n.getLanguage();
      }
    } catch {}
    return null;
  });
  console.log(`[shots] [newtab] activeLang=`, activeLang);
  const startPrefs = await page.evaluate(() => {
    const body = document && document.body;
    const bg = body ? getComputedStyle(body).backgroundImage : '';
    const has = body ? body.classList.contains('has-wallpaper') : false;
    let ls = null;
    try { ls = localStorage.getItem('wallpaperEnabled'); } catch {}
    console.debug('[wait] init has-wallpaper=', has, 'bg=', bg, 'ls=', ls);
    return { wallpaperEnabledLocalStorage: ls, hasWallpaperClass: has, backgroundImage: bg };
  });
  console.log(`[shots] [newtab] before-wait prefs=`, startPrefs);
  // 等待壁纸与可见图片加载完毕（或确认壁纸关闭）
  await waitForWallpaperOrDisabled(page, 22000);
  const afterWallpaper = await page.evaluate(() => {
    const body = document && document.body;
    const has = body ? body.classList.contains('has-wallpaper') : false;
    const bg = body ? getComputedStyle(body).backgroundImage : '';
    const m = bg && bg !== 'none' ? bg.match(/url\((['"]?)(.*?)\1\)/) : null;
    const url = m && m[2];
    let complete = false, naturalWidth = 0;
    if (url) {
      const img = new Image();
      img.src = url;
      complete = img.complete;
      naturalWidth = img.naturalWidth || 0;
    }
    console.debug('[wait] after wallpaper has=', has, 'bg=', bg, 'url=', url, 'complete=', complete, 'nw=', naturalWidth);
    return { has, bg, url, complete, naturalWidth };
  });
  console.log(`[shots] [newtab] after-wait wallpaper=`, afterWallpaper);
  await waitForVisibleImages(page, 12000);
  const visibleImgs = await page.evaluate(() => {
    const vis = Array.from(document.querySelectorAll('img'))
      .filter(img => !!(img.offsetWidth || img.offsetHeight || img.getClientRects().length))
      .map(img => ({ src: img.src, complete: img.complete, nw: img.naturalWidth || 0, display: getComputedStyle(img).display }));
    console.debug('[wait-imgs] visible imgs=', vis);
    return vis;
  });
  console.log(`[shots] [newtab] visible-imgs=`, visibleImgs);
  await page.waitForTimeout(120);
  await fs.mkdir(`${outDir}/${lang}`, { recursive: true });
  await page.screenshot({ path: `${outDir}/${lang}/newtab_${lang}.png`, fullPage: false });
  await page.close();
}

async function screenshotOptionsTab(context, base, outDir, width, height, lang, tab, filename) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/src/pages/options/index.html`, { waitUntil: 'domcontentloaded' });
  await ensureLanguage(page, lang);
  await page.click(`.tab-btn[data-tab="${tab}"]`);
  await page.waitForSelector(`section.tab-content#${tab}`);
  await page.waitForTimeout(400);
  await fs.mkdir(`${outDir}/${lang}`, { recursive: true });
  await page.screenshot({ path: `${outDir}/${lang}/${filename}_${lang}.png`, fullPage: false });
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  // 预置偏好：确保壁纸开启，且支持隐藏 60s（预览环境无 chrome.storage.sync，使用 localStorage）
  await context.addInitScript((cfg) => {
    try {
      if (cfg && cfg.wallpaperEnabled) localStorage.setItem('wallpaperEnabled', 'true');
      if (cfg && cfg.hideSixty) localStorage.setItem('sixtySecondsEnabled', 'false');
    } catch {}
  }, { wallpaperEnabled: true, hideSixty: HIDE_SIXTY });

  for (const lang of LANGS) {
    await screenshotNewtab(context, BASE, OUT, WIDTH, HEIGHT, lang);
    await screenshotOptionsTab(context, BASE, OUT, WIDTH, HEIGHT, lang, 'rules', 'classification');
    await screenshotOptionsTab(context, BASE, OUT, WIDTH, HEIGHT, lang, 'deadlinks', 'deadlinks');
    await screenshotOptionsTab(context, BASE, OUT, WIDTH, HEIGHT, lang, 'nav', 'navigation');
    await screenshotOptionsTab(context, BASE, OUT, WIDTH, HEIGHT, lang, 'ai', 'ai');
  }

  await context.close();
  await browser.close();
})();