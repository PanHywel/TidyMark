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

async function ensureLanguage(page, lang) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(`(async () => { if (window.I18n) { try { await window.I18n.init(); } catch(e){} } })()`);
  await page.evaluate(`(async () => { if (window.I18n && window.I18n.setLanguage) { await window.I18n.setLanguage('${lang}'); } })()`);
  await page.waitForTimeout(300);
}

async function screenshotNewtab(context, base, outDir, width, height, lang) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(`${base}/src/pages/newtab/index.html`, { waitUntil: 'domcontentloaded' });
  await ensureLanguage(page, lang);
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