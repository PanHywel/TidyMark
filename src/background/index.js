// background.js - 后台脚本
import '../../services/i18n.js';
// 导入云同步服务
import '../../services/cloudSyncService.js';

// 初始化 i18n（后台环境无 DOM，避免顶层 await）
try {
  if (globalThis.I18n && typeof globalThis.I18n.init === 'function') {
    // 不阻塞 SW 注册，异步初始化
    globalThis.I18n.init().catch((e) => console.warn('[I18n] 初始化失败', e));
  }
} catch (e) {
  console.warn('[I18n] 初始化异常', e);
}

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('TidyMark 扩展已安装/更新');

  if (details.reason === 'install') {
    // 首次安装时的初始化
    await initializeExtension();
  } else if (details.reason === 'update') {
    // 更新时的处理
    console.log('扩展已更新到新版本');
  }

  // 注册每日自动同步闹钟（MV3 service worker可被唤醒）
  try {
    chrome.alarms.create('tidymarkDailyGithubAutoSync', { periodInMinutes: 1440 });
    chrome.alarms.create('tidymarkDailyWebdavAutoSync', { periodInMinutes: 1440 });
    console.log('[AutoSync] 已注册每日 GitHub/WebDAV 自动同步闹钟');
  } catch (e) {
    console.warn('[AutoSync] 创建自动同步闹钟失败', e);
  }

  // 注册右键菜单
  try {
    await registerContextMenus();
  } catch (e) {
    console.warn('[ContextMenus] 注册失败', e);
  }
});

// 扩展启动时的初始化
chrome.runtime.onStartup.addListener(async () => {
  console.log('TidyMark 扩展已启动');
  await checkAndBackupBookmarks();
  await checkAndArchiveOldBookmarks();
  // 启动后尝试进行每日自动同步（仅当配置完整且当天未同步）
  try {
    await maybeRunDailyGithubAutoSync('startup');
    await maybeRunDailyWebdavAutoSync('startup');
  } catch (e) {
    console.warn('[AutoSync] 启动自动同步失败', e);
  }

  // 启动时尝试注册右键菜单（避免开发模式热重载缺失）
  try {
    await registerContextMenus();
  } catch (e) {
    console.warn('[ContextMenus] 启动时注册失败', e);
  }

  // 尝试初始化通知能力（无需显式初始化，只做能力检测日志）
  try {
    if (chrome.notifications) {
      console.log('[Notifications] 能力可用');
    }
  } catch (e) {
    console.warn('[Notifications] 能力检测失败', e);
  }
});

// 点击扩展图标直接打开设置页面（始终以新标签页方式打开）
chrome.action.onClicked.addListener(() => {
  try {
    const url = chrome.runtime.getURL('src/pages/options/index.html');
    console.log('[Action] 点击图标，打开设置页:', url);
    chrome.tabs.create({ url });
  } catch (e) {
    console.warn('[Action] 打开设置页失败', e);
  }
});

// 监听快捷键命令：打开普通窗口并加载搜索页面（占位版）
try {
  chrome.commands?.onCommand.addListener(async (command) => {
    if (command !== 'open_quick_search') return;
    try {
      // 若用户关闭了快捷键打开搜索页，则不响应
      try {
        const { quickSearchShortcutEnabled } = await chrome.storage.sync.get(['quickSearchShortcutEnabled']);
        if (quickSearchShortcutEnabled === false) {
          console.log('[Commands] 快捷键打开搜索已关闭，忽略本次触发');
          return;
        }
      } catch (_) {
        // 忽略读取失败，按默认开启处理
      }
      const url = chrome.runtime.getURL('src/pages/search/index.html');
      const urlDir = chrome.runtime.getURL('src/pages/search/');
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const windowId = activeTab?.windowId;
      console.log('[Commands] 触发快速搜索：复用或在当前窗口新开标签', url, 'windowId=', windowId);

      let createdOrExistingTabId = null;
      const isSearchTab = (t) => {
        const u = (t && (t.url || t.pendingUrl)) || '';
        return typeof u === 'string' && (
          u === url || u.startsWith(url) ||
          u === urlDir || u.startsWith(urlDir)
        );
      };

      if (windowId) {
        const tabsInWindow = await chrome.tabs.query({ windowId });
        const existing = tabsInWindow.find(isSearchTab);
        if (existing?.id) {
          createdOrExistingTabId = existing.id;
          await chrome.tabs.update(existing.id, { active: true });
          try { await chrome.windows.update(windowId, { focused: true }); } catch (_) {}
        } else {
          // 当前窗口未找到，则尝试跨窗口全局查找并激活
          const allTabs = await chrome.tabs.query({});
          const existingGlobal = allTabs.find(isSearchTab);
          if (existingGlobal?.id) {
            createdOrExistingTabId = existingGlobal.id;
            await chrome.tabs.update(existingGlobal.id, { active: true });
            try { await chrome.windows.update(existingGlobal.windowId, { focused: true }); } catch (_) {}
          } else {
            const newTab = await chrome.tabs.create({ windowId, url, active: true });
            createdOrExistingTabId = newTab?.id ?? null;
          }
        }
      } else {
        // 无当前窗口信息，尝试全局复用
        const allTabs = await chrome.tabs.query({});
        const existingGlobal = allTabs.find(isSearchTab);
        if (existingGlobal?.id) {
          createdOrExistingTabId = existingGlobal.id;
          await chrome.tabs.update(existingGlobal.id, { active: true });
          try { await chrome.windows.update(existingGlobal.windowId, { focused: true }); } catch (_) {}
        } else {
          const newTab = await chrome.tabs.create({ url, active: true });
          createdOrExistingTabId = newTab?.id ?? null;
        }
      }

      // 使用 runtime 广播消息，扩展页可直接接收，避免 tabs.sendMessage 仅面向内容脚本的问题
      try {
        // 小延迟以确保新标签内容完成初次渲染
        setTimeout(() => {
          try { chrome.runtime.sendMessage({ type: 'focusSearchInput' }); } catch (_) {}
        }, 50);
      } catch (_) {}
    } catch (err) {
      console.warn('[Commands] 在当前窗口打开标签页失败，尝试直接创建', err);
      try {
        const fallbackUrl = chrome.runtime.getURL('src/pages/search/index.html');
        await chrome.tabs.create({ url: fallbackUrl, active: true });
      } catch (e2) {
        console.warn('[Commands] 直接创建标签页也失败', e2);
      }
    }
  });
} catch (e) {
  console.warn('[Commands] 注册命令监听失败', e);
}

// 通过闹钟周期性唤醒并执行每日一次的 GitHub 自动同步
try {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (!alarm || !alarm.name) return;
    try {
      if (alarm.name === 'tidymarkDailyGithubAutoSync') {
        await maybeRunDailyGithubAutoSync('alarm');
      } else if (alarm.name === 'tidymarkDailyWebdavAutoSync') {
        await maybeRunDailyWebdavAutoSync('alarm');
      }
    } catch (e) {
      console.warn('[AutoSync] 闹钟触发自动同步失败', e);
    }
  });
} catch (e) {
  console.warn('[AutoSync] 注册闹钟监听失败', e);
}

// 初始化扩展
async function initializeExtension() {
  try {
    // 设置默认配置
    const defaultSettings = {
      autoBackup: true,
      backupPath: '',
      autoClassify: true,
      classificationRules: getDefaultClassificationRules(resolveClassificationLanguage('auto')),
      enableAI: false,
      aiProvider: 'openai',
      aiApiKey: '',
      aiApiUrl: '',
      aiModel: 'gpt-3.5-turbo',
      maxTokens: 8192,
      // AI 请求优化参数（提升默认值）
      aiBatchSize: 120,
      aiConcurrency: 3,
      classificationLanguage: 'auto',
      maxCategories: 10,
      // 新标签页相关默认：首次安装默认开启壁纸
      wallpaperEnabled: true,
      searchEnabled: true,
      showStats: true,
      // Misc：快捷键打开搜索页默认开启
      quickSearchShortcutEnabled: true,
      lastBackupTime: null,
      backupInterval: 24 * 60 * 60 * 1000 // 24小时
    };

    // 检查是否已有设置
    const existingSettings = await chrome.storage.sync.get(Object.keys(defaultSettings));

    // 只设置不存在的配置项
    const settingsToSet = {};
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (existingSettings[key] === undefined) {
        settingsToSet[key] = value;
      }
    }

    if (Object.keys(settingsToSet).length > 0) {
      await chrome.storage.sync.set(settingsToSet);
      console.log('默认设置已初始化:', settingsToSet);
    }

    // 已移除默认搜索引擎的初始化，遵循浏览器默认搜索提供商

    // 创建初始备份
    await createBookmarkBackup();

    console.log('扩展初始化完成');
  } catch (error) {
    console.error('扩展初始化失败:', error);
  }
}

// 分类名称中英文映射与语言解析
const CATEGORY_EN_MAP = {
  '开源与代码托管': 'Open Source & Repos',
  '开发文档与API': 'Docs & API',
  '前端框架': 'Frontend Frameworks',
  '后端框架': 'Backend Frameworks',
  '云服务与DevOps': 'Cloud & DevOps',
  '数据库与数据': 'Databases & Data',
  'AI与机器学习': 'AI & Machine Learning',
  '产品设计': 'Product Design',
  '设计资源与素材': 'Design Assets',
  '学习教程与课程': 'Courses & Tutorials',
  '技术博客与社区': 'Tech Blogs & Communities',
  '新闻资讯与媒体': 'News & Media',
  '在线工具与服务': 'Online Tools & Services',
  '下载与资源': 'Downloads & Resources',
  '视频与音乐': 'Videos & Music',
  '游戏与娱乐': 'Games & Entertainment',
  '购物电商': 'Shopping',
  '社交媒体': 'Social Media',
  '办公与协作': 'Work & Collaboration',
  '笔记与知识库': 'Notes & Knowledge Base',
  '项目与任务管理': 'Projects & Tasks',
  '地图与导航': 'Maps & Navigation',
  '博客平台与CMS': 'Blogs & CMS',
  '数据科学与分析': 'Data Science & Analytics',
  'API测试与开发': 'API Testing & Dev',
  '邮件与通讯': 'Mail & Communication',
  '求职与招聘': 'Jobs & Recruiting',
  '金融与理财': 'Finance',
  '生活服务': 'Lifestyle Services',
  '阅读与电子书': 'Reading & eBooks',
  '科研与论文': 'Research & Papers',
  '浏览器与扩展': 'Browsers & Extensions',
  '摄影与照片': 'Photography',
  '图片处理与修图': 'Photo Editing',
  '器材与评测': 'Gear & Reviews',
  '图片托管与分享': 'Image Hosting & Sharing',
  '摄影品牌与官网': 'Photo Brands',
  '器材评测与资讯': 'Gear News & Reviews',
  '版权素材与购买': 'Stock & Licensing',
  '摄影教程与灵感': 'Photo Tutorials & Inspiration',
  '其他': 'Others'
};

function resolveClassificationLanguage(langSetting) {
  const v = (langSetting || 'auto');
  if (v === 'auto') {
    const nav = (navigator?.language || 'en').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }
  return (v === 'zh' || v === 'en') ? v : 'zh';
}

function translateCategoryName(name, lang) {
  if (lang === 'en') return CATEGORY_EN_MAP[name] || name;
  return name;
}

// 获取默认分类规则（按语言生成分类名称）
function getDefaultClassificationRules(lang = 'zh') {
  const t = (zh) => translateCategoryName(zh, lang);
  return [
    { category: t('开源与代码托管'), keywords: ['github', 'gitlab', 'gitee', 'bitbucket', 'source code', 'repository', 'repo'] },
    { category: t('开发文档与API'), keywords: ['docs', 'documentation', 'api', 'sdk', 'developer', 'developers', 'reference', '文档', '接口'] },
    { category: t('前端框架'), keywords: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'vite', 'webpack', 'babel', 'preact', 'solidjs', 'ember'] },
    { category: t('后端框架'), keywords: ['spring', 'springboot', 'django', 'flask', 'fastapi', 'express', 'koa', 'rails', 'laravel', 'nestjs', 'micronaut', 'quarkus', 'fastify', 'hapi', 'gin', 'asp.net', 'dotnet', 'phoenix'] },
    { category: t('云服务与DevOps'), keywords: ['aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'k8s', 'docker', 'ci', 'cd', 'devops', 'terraform', 'cloudflare', 'vercel', 'netlify', 'digitalocean', 'heroku', 'render', 'linode', 'railway'] },
    { category: t('数据库与数据'), keywords: ['mysql', 'postgres', 'mongodb', 'redis', 'sqlite', 'elasticsearch', 'clickhouse', 'snowflake', 'data', '数据库', 'mariadb', 'oracle', 'sql server', 'mssql', 'dynamodb', 'bigquery', 'firestore', 'cassandra'] },
    { category: t('AI与机器学习'), keywords: ['ai', 'ml', 'deep learning', 'nn', 'transformer', 'openai', 'huggingface', 'stable diffusion', 'llm', '机器学习', 'midjourney', 'dalle', 'runway', 'colab', 'tensorflow', 'pytorch', 'sklearn', 'xgboost'] },
    { category: t('产品设计'), keywords: ['product', 'ux', 'ui', 'prototype', '设计', '交互', '体验'] },
    { category: t('设计资源与素材'), keywords: ['dribbble', 'behance', 'figma', 'psd', 'svg', 'icon', 'font', '素材', '配色', 'icons8', 'fontawesome', 'material icons', 'coolors', 'colorhunt'] },
    { category: t('学习教程与课程'), keywords: ['course', '教程', 'tutorial', 'learn', '学习', 'class', 'lesson', 'udemy', 'coursera', 'edx', 'pluralsight', 'codecademy', 'freecodecamp'] },
    { category: t('技术博客与社区'), keywords: ['blog', '博客', 'medium', 'dev.to', 'reddit', '讨论', 'community', '论坛', 'hashnode'] },
    { category: t('新闻资讯与媒体'), keywords: ['news', '资讯', 'headline', '媒体', 'press', 'newsletter', 'cnn', 'bbc', 'reuters', 'nytimes', 'theverge', 'wired', 'techcrunch', 'hacker news'] },
    { category: t('在线工具与服务'), keywords: ['tool', '工具', 'software', 'app', '应用', 'utility', 'converter', 'online', 'remove.bg', 'smallpdf', 'ilovepdf', 'convertio', 'tinypng', 'tinyurl'] },
    { category: t('下载与资源'), keywords: ['download', '下载', '镜像', '资源', 'release', 'release notes', 'npmjs', 'pypi', 'maven', 'rubygems', 'crates.io', 'chocolatey'] },
    { category: t('视频与音乐'), keywords: ['youtube', 'bilibili', 'netflix', 'spotify', 'video', '音乐', '音频', '影视', 'vimeo', 'soundcloud', 'apple music', 'deezer', 'qq音乐', '网易云音乐', 'youku', 'iqiyi', '腾讯视频'] },
    { category: t('游戏与娱乐'), keywords: ['game', 'gaming', 'steam', 'xbox', 'ps5', '游戏', '娱乐', 'epic', 'uplay', 'origin', 'battlenet', 'psn', 'nintendo'] },
    { category: t('购物电商'), keywords: ['shop', '购物', 'buy', '购买', 'store', '商店', 'mall', '商城', 'taobao', 'jd', 'amazon', 'aliexpress', 'etsy', 'ebay', 'shopify', 'xiaomi', 'apple store'] },
    { category: t('社交媒体'), keywords: ['twitter', 'x.com', 'facebook', 'instagram', 'tiktok', 'linkedin', '社交', '分享', '社区', 'wechat', 'weibo', 'discord', 'telegram', 'whatsapp', 'line', 'kakao', 'quora'] },
    { category: t('办公与协作'), keywords: ['notion', 'confluence', 'slack', 'teams', 'jira', 'office', '文档', '协作', 'drive', 'google drive', 'dropbox', 'onedrive', 'monday', 'miro'] },
    { category: t('笔记与知识库'), keywords: ['obsidian', 'evernote', 'note', 'wiki', '知识库'] },
    { category: t('项目与任务管理'), keywords: ['asana', 'trello', 'todoist', 'clickup', 'kanban', '项目管理', '任务'] },
    { category: t('地图与导航'), keywords: ['google maps', 'maps', 'gaode', '高德', 'baidu map', '百度地图', 'openstreetmap', 'osm', '导航'] },
    { category: t('博客平台与CMS'), keywords: ['wordpress', 'ghost', 'blogger', 'cms', '内容管理'] },
    { category: t('数据科学与分析'), keywords: ['kaggle', 'jupyter', 'databricks', 'data science', '数据科学'] },
    { category: t('API测试与开发'), keywords: ['postman', 'insomnia', 'swagger', 'openapi', 'api 测试'] },
    { category: t('邮件与通讯'), keywords: ['gmail', 'outlook', 'mail', '邮箱', 'imap', 'smtp', 'message', 'chat', 'protonmail', 'fastmail', 'zoho mail', 'mailchimp', 'sendgrid'] },
    { category: t('求职与招聘'), keywords: ['jobs', '招聘', '求职', 'career', 'hr', '猎头', '简历', 'indeed', 'glassdoor', 'lever', 'greenhouse', '拉勾', 'boss直聘', '前程无忧'] },
    { category: t('金融与理财'), keywords: ['bank', 'finance', '投资', '基金', '股票', 'trading', 'crypto', '区块链', 'paypal', 'stripe', 'alipay', 'wechat pay', 'wise'] },
    { category: t('生活服务'), keywords: ['生活', '服务', '家政', '外卖', '出行', '住宿', '旅游', 'uber', 'didi', '美团', '饿了么', 'airbnb', 'booking', 'trip', 'expedia'] },
    { category: t('阅读与电子书'), keywords: ['read', '阅读', '电子书', 'epub', 'pdf', 'kindle', 'goodreads', 'gutenberg', 'scribd'] },
    { category: t('科研与论文'), keywords: ['arxiv', '论文', 'research', '科研', 'paper', 'citation', 'nature', 'science', 'springer', 'ieee', 'acm', 'doi', 'researchgate'] },
    { category: t('浏览器与扩展'), keywords: ['extension', '插件', 'chrome web store', 'edge add-ons', '浏览器', 'addons.mozilla.org', 'opera addons', 'chrome.google.com'] },
    { category: t('摄影与照片'), keywords: ['photography', 'photo', '照片', '摄影', 'camera', '拍照', '拍摄', 'photrio', 'fredmiranda'] },
    { category: t('图片处理与修图'), keywords: ['lightroom', 'photoshop', 'capture one', '修图', '编辑', 'raw', '后期', '色彩', 'darktable', 'affinity photo', 'gimp', 'luminar'] },
    { category: t('器材与评测'), keywords: ['dslr', 'mirrorless', '微单', '单反', '镜头', 'lens', '评测', 'review', '光圈', '焦距', 'dxomark', 'cameralabs', 'the-digital-picture'] },
    { category: t('图片托管与分享'), keywords: ['flickr', '500px', 'unsplash', 'pixabay', 'pexels', '图库', 'portfolio', '作品集', '图床', 'smugmug', 'zenfolio', 'imgur', 'pixiv'] },
    { category: t('摄影品牌与官网'), keywords: ['canon', 'nikon', 'sonyalpha', 'fujifilm', 'leica', 'sigma', 'tamron', '富士', '徕卡'] },
    { category: t('器材评测与资讯'), keywords: ['dpreview', 'petapixel', 'fstoppers', '评测', '测评', '评估'] },
    { category: t('版权素材与购买'), keywords: ['getty', 'gettyimages', 'shutterstock', 'adobe stock', 'istock', 'pond5', '版权', '素材购买'] },
    { category: t('摄影教程与灵感'), keywords: ['教程', 'tips', 'composition', '构图', '布光', '灵感', 'inspiration', 'kelbyone', 'phlearn', 'magnum photos'] }
  ];
}

// 监听来自options页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  const action = (request && typeof request.action === 'string') ? request.action.trim() : request.action;
  try {
    const codes = Array.from(String(action || '')).map(c => c.charCodeAt(0));
    console.log('[onMessage] action 调试：', { action, length: String(action || '').length, codes });
  } catch (_) { }

  // 兼容不可见空白字符导致的匹配失败
  if (typeof action === 'string' && action.replace(/\s/g, '') === 'syncGithubBackup') {
    handleSyncGithubBackup(request.payload, sendResponse);
    return true;
  }
  if (typeof action === 'string' && action.replace(/\s/g, '') === 'syncCloudBackup') {
    handleSyncCloudBackup(request.payload, sendResponse);
    return true;
  }
  if (typeof action === 'string' && action.replace(/\s/g, '') === 'testCloudConnection') {
    handleTestCloudConnection(request.payload, sendResponse);
    return true;
  }

  switch (action) {
    case 'getBookmarks':
      handleGetBookmarks(sendResponse);
      break;
    case 'createBackup':
      handleCreateBackup(sendResponse);
      break;
    case 'autoClassify':
      handleAutoClassify(sendResponse);
      break;
    case 'organizeBookmarks':
      // 执行实际整理（支持dryRun=false）
      handleAutoClassify(sendResponse, request);
      break;
    case 'previewOrganize':
      // 返回整理预览（dryRun=true）
      handleAutoClassify(sendResponse, {
        dryRun: true,
        // 支持多范围：优先使用数组，其次兼容单值
        scopeFolderIds: Array.isArray(request.scopeFolderIds)
          ? request.scopeFolderIds.map(id => String(id)).filter(Boolean)
          : (request.scopeFolderId ? [String(request.scopeFolderId)] : [])
      });
      break;
    case 'searchBookmarks':
      handleSearchBookmarks(request.query, sendResponse);
      break;
    case 'getStats':
      handleGetStats(sendResponse);
      break;
    case 'classifyWithAI':
      handleClassifyWithAI(request.bookmarks, sendResponse);
      break;
    case 'refineOrganizeWithAI':
      handleRefineOrganizeWithAI(request.preview, sendResponse);
      break;
    case 'organizeByPlan':
      handleOrganizeByPlan(request.plan, sendResponse);
      break;
    case 'organizeByAiInference':
      handleOrganizeByAiInference(sendResponse, request);
      break;
    case 'syncGithubBackup':
      handleSyncGithubBackup(request.payload, sendResponse);
      break;
    case 'syncGithubConfig':
      handleSyncGithubConfig(request.payload, sendResponse);
      break;
    case 'importGithubConfig':
      handleImportGithubConfig(request.payload, sendResponse);
      break;
    case 'syncCloudBackup':
      handleSyncCloudBackup(request.payload, sendResponse);
      break;
    case 'testCloudConnection':
      handleTestCloudConnection(request.payload, sendResponse);
      break;
    default:
      console.warn('[onMessage] 未知操作:', action, '完整请求:', request);
      sendResponse({ success: false, error: `未知操作: ${String(action)}` });
  }

  // 返回true表示异步响应
  return true;
});

// 处理获取书签请求
async function handleGetBookmarks(sendResponse) {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    sendResponse({ success: true, data: bookmarks });
  } catch (error) {
    console.error('获取书签失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理创建备份请求
async function handleCreateBackup(sendResponse) {
  try {
    const result = await createBookmarkBackup();
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('创建备份失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理自动分类请求
async function handleAutoClassify(sendResponse, request = {}) {
  try {
    const result = await autoClassifyBookmarks(request);
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('自动分类失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理搜索书签请求
async function handleSearchBookmarks(query, sendResponse) {
  try {
    const results = await searchBookmarks(query);
    sendResponse({ success: true, data: results });
  } catch (error) {
    console.error('搜索书签失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理获取统计信息请求
async function handleGetStats(sendResponse) {
  try {
    const stats = await getBookmarkStats();
    sendResponse({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理AI分类请求
async function handleClassifyWithAI(bookmarks, sendResponse) {
  try {
    const result = await classifyBookmarksWithAI(bookmarks);
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('AI分类失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理预览的AI二次整理请求
async function handleRefineOrganizeWithAI(preview, sendResponse) {
  try {
    const result = await refinePreviewWithAI(preview);
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('AI二次整理失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 按AI计划执行整理
async function handleOrganizeByPlan(plan, sendResponse) {
  try {
    const result = await organizeByPlan(plan);
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('按计划整理失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 基于 AI 推理生成全量整理计划（不提供预置分类）
async function handleOrganizeByAiInference(sendResponse, request = {}) {
  try {
    const scopeFolderIds = Array.isArray(request?.scopeFolderIds)
      ? request.scopeFolderIds.map(id => String(id)).filter(Boolean)
      : (request?.scopeFolderId ? [String(request.scopeFolderId)] : []);
    const plan = await organizePlanByAiInference(scopeFolderIds);
    sendResponse({ success: true, data: plan });
  } catch (error) {
    console.error('AI 推理归类失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理 GitHub 同步备份
async function handleSyncGithubBackup(payload, sendResponse) {
  try {
    console.log('[SyncGithub] 进入处理器，收到 payload:', {
      hasToken: !!(payload && payload.token),
      owner: payload && payload.owner,
      repo: payload && payload.repo,
      format: payload && payload.format,
      dualUpload: payload && payload.dualUpload
    });
    const { token, owner, repo, format = 'json', dualUpload = false } = payload || {};
    if (!token || !owner || !repo) {
      sendResponse({ success: false, error: '配置不完整' });
      return;
    }

    // 使用默认分支与默认路径
    let branch = 'main';
    const path = 'tidymark/backups/tidymark-backup.json';
    const pathHtml = 'tidymark/backups/tidymark-bookmarks.html';
    const fmt = ['json', 'html'].includes(String(format)) ? String(format) : 'json';

    // 确保有最新备份
    let { lastBackup } = await chrome.storage.local.get(['lastBackup']);
    if (!lastBackup) {
      await createBookmarkBackup();
      ({ lastBackup } = await chrome.storage.local.get(['lastBackup']));
    }
    if (!lastBackup) {
      sendResponse({ success: false, error: '无法获取备份数据' });
      return;
    }

    // Base64 编码工具（兼容中文）
    const toBase64 = (str) => {
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (_) {
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        bytes.forEach(b => { binary += String.fromCharCode(b); });
        return btoa(binary);
      }
    };

    // HTML 生成（Chrome 兼容 Netscape 书签格式）
    const escapeHtml = (text = '') => String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    const processBookmarkNode = (node, depth, defaultTimestamp) => {
      const indent = '    '.repeat(depth);
      let html = '';
      if (node.children) {
        const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : defaultTimestamp;
        const lastModified = node.dateGroupModified ? Math.floor(node.dateGroupModified / 1000) : defaultTimestamp;
        html += `${indent}<DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}">${escapeHtml(node.title || '未命名文件夹')}</H3>\n`;
        html += `${indent}<DL><p>\n`;
        for (const child of node.children) {
          html += processBookmarkNode(child, depth + 1, defaultTimestamp);
        }
        html += `${indent}</DL><p>\n`;
      } else if (node.url) {
        const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : defaultTimestamp;
        const icon = node.icon || '';
        html += `${indent}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${addDate}"`;
        if (icon) html += ` ICON_URI="${escapeHtml(icon)}"`;
        html += `>${escapeHtml(node.title || node.url)}</A>\n`;
      }
      return html;
    };
    const generateChromeBookmarkHTML = (bookmarkTree) => {
      const timestamp = Math.floor(Date.now() / 1000);
      let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<!-- This is an automatically generated file.\n     It will be read and overwritten.\n     DO NOT EDIT! -->\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n\n<DL><p>\n`;
      if (bookmarkTree && bookmarkTree.length > 0) {
        const rootNode = bookmarkTree[0];
        if (rootNode.children) {
          for (const child of rootNode.children) {
            html += processBookmarkNode(child, 1, timestamp);
          }
        }
      }
      html += `</DL><p>\n`;
      return html;
    };

    // 获取仓库默认分支（更稳健，兼容 master/main 等）
    try {
      const repoInfoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (repoInfoRes.ok) {
        const info = await repoInfoRes.json();
        if (info && typeof info.default_branch === 'string' && info.default_branch.trim()) {
          branch = info.default_branch.trim();
        }
        console.log('[SyncGithub] 仓库信息已获取，默认分支:', branch);
      }
    } catch (e) {
      console.warn('获取仓库默认分支失败，使用 main 作为默认', e);
    }

    // 上传单个文件的封装
    const uploadOne = async (filePath, contentStr) => {
      const segs = String(filePath).split('/').map(s => encodeURIComponent(s)).join('/');
      const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${segs}`;
      const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };
      // 获取 sha
      let sha;
      try {
        const getRes = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}`, { headers });
        if (getRes.status === 200) {
          const data = await getRes.json();
          sha = data && data.sha;
        }
      } catch (e) {
        console.warn('检查现有文件失败（忽略）', e);
      }
      console.log('[SyncGithub] 准备上传文件:', { path: filePath, hasSha: !!sha, branch });
      const body = {
        message: `TidyMark backup: ${new Date().toISOString()}`,
        content: toBase64(contentStr),
        branch
      };
      if (sha) body.sha = sha;
      let putRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (putRes.status === 201 || putRes.status === 200) {
        const data = await putRes.json();
        console.log('[SyncGithub] 上传成功:', { path: filePath, status: putRes.status });
        return { success: true, data };
      }
      // 若 404 且当前分支为 main，尝试 master 分支重新上传
      if (putRes.status === 404 && branch === 'main') {
        try {
          const fallbackBranch = 'master';
          console.warn('[SyncGithub] main 分支上传 404，尝试使用 master 分支重新上传');
          const fbBody = { ...body, branch: fallbackBranch };
          // 重新获取 sha（针对 master）
          let fbSha;
          try {
            const fbGetRes = await fetch(`${baseUrl}?ref=${encodeURIComponent(fallbackBranch)}`, { headers });
            if (fbGetRes.status === 200) {
              const fbData = await fbGetRes.json();
              fbSha = fbData && fbData.sha;
              if (fbSha) fbBody.sha = fbSha;
            }
          } catch (e) {
            console.warn('检查 master 分支现有文件失败（忽略）', e);
          }
          const fbPutRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(fbBody) });
          if (fbPutRes.status === 201 || fbPutRes.status === 200) {
            const fbData = await fbPutRes.json();
            console.log('[SyncGithub] 使用 master 分支上传成功:', { path: filePath, status: fbPutRes.status });
            return { success: true, data: fbData };
          } else {
            const fbErrText = await fbPutRes.text();
            console.error('[SyncGithub] master 分支上传失败:', { path: filePath, status: fbPutRes.status, errText: fbErrText });
          }
        } catch (e) {
          console.warn('尝试回退至 master 分支上传时出现异常（忽略）', e);
        }
      }
      const errText = await putRes.text();
      console.error('[SyncGithub] 上传失败:', { path: filePath, status: putRes.status, errText });
      return { success: false, error: `GitHub 响应 ${putRes.status}: ${errText}` };
    };

    const results = [];
    if (dualUpload || fmt === 'json') {
      results.push(await uploadOne(path, JSON.stringify(lastBackup, null, 2)));
    }
    if (dualUpload || fmt === 'html') {
      const htmlStr = generateChromeBookmarkHTML(lastBackup.bookmarks || []);
      results.push(await uploadOne(pathHtml, htmlStr));
    }

    const allOk = results.every(r => r.success);
    if (allOk) {
      const last = results[results.length - 1];
      console.log('[SyncGithub] 所有上传成功，最后一个文件链接:', last && last.data);
      sendResponse({
        success: true, data: {
          contentPath: dualUpload ? `${path} & ${pathHtml}` : (fmt === 'json' ? path : pathHtml),
          htmlUrl: (last && last.data && last.data.content && last.data.content.html_url) || (last && last.data && last.data.commit && last.data.commit.html_url) || null
        }
      });
    } else {
      const firstErr = results.find(r => !r.success)?.error || '未知错误';
      console.error('[SyncGithub] 有上传失败，错误信息:', firstErr);
      sendResponse({ success: false, error: firstErr });
    }
  } catch (error) {
    console.error('GitHub 同步失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 配置备份：收集 sync 与 local 的所有键，保存到本地并返回
async function createConfigBackup() {
  try {
    const manifest = chrome.runtime.getManifest ? chrome.runtime.getManifest() : { version: '0.0.0' };
    const syncAll = await chrome.storage.sync.get(null);
    const localAll = await chrome.storage.local.get(null);
    // 过滤掉体积较大的书签备份（仅做配置备份）
    const { lastBackup, ...syncWithoutLastBackup } = syncAll || {};
    const { lastBackup: _ignoredLocalLastBackup, ...localWithoutLastBackup } = localAll || {};
    const backup = {
      type: 'config',
      version: manifest.version || '0.0.0',
      timestamp: Date.now(),
      sync: syncWithoutLastBackup,
      local: localWithoutLastBackup
    };
    await chrome.storage.local.set({ lastConfigBackup: backup });
    return backup;
  } catch (e) {
    console.error('[ConfigBackup] 创建配置备份失败', e);
    throw e;
  }
}

// 处理将配置备份上传到 GitHub（JSON）
async function handleSyncGithubConfig(payload, sendResponse) {
  try {
    const { token, owner, repo } = payload || {};
    if (!token || !owner || !repo) {
      sendResponse({ success: false, error: '配置不完整' });
      return;
    }

    let branch = 'main';
    const path = 'tidymark/backups/tidymark-config.json';

    // 确保有最新配置备份
    let { lastConfigBackup } = await chrome.storage.local.get(['lastConfigBackup']);
    if (!lastConfigBackup) {
      lastConfigBackup = await createConfigBackup();
    }
    if (!lastConfigBackup) {
      sendResponse({ success: false, error: '无法获取配置备份数据' });
      return;
    }

    // 获取默认分支
    try {
      const repoInfoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (repoInfoRes.ok) {
        const info = await repoInfoRes.json();
        if (info && typeof info.default_branch === 'string' && info.default_branch.trim()) {
          branch = info.default_branch.trim();
        }
      }
    } catch (e) {
      console.warn('[ConfigSync] 获取仓库默认分支失败，使用 main 作为默认', e);
    }

    // 复用上传封装逻辑
    const fixMojibake = (s) => {
      try {
        const original = String(s);
        const cjkCount = (str) => (str.match(/[\u4E00-\u9FFF]/g) || []).length;
        let repaired = original;
        try {
          // 尝试将被当作 Latin-1 的 UTF-8 字节串还原为 UTF-8
          repaired = decodeURIComponent(escape(original));
        } catch { }
        // 选择包含更多中文字符的版本；若修复产生替换符或不可打印字符则回退
        const hasReplacement = /\uFFFD/.test(repaired);
        const repairedCJK = cjkCount(repaired);
        const originalCJK = cjkCount(original);
        if (!hasReplacement && repairedCJK > originalCJK) {
          return repaired;
        }
        return original;
      } catch {
        return s;
      }
    };
    const normalizeStringsDeep = (val) => {
      if (val == null) return val;
      if (typeof val === 'string') return fixMojibake(val);
      if (Array.isArray(val)) return val.map(v => normalizeStringsDeep(v));
      if (typeof val === 'object') {
        const out = {}; for (const k of Object.keys(val)) { out[k] = normalizeStringsDeep(val[k]); }
        return out;
      }
      return val;
    };
    const toBase64 = (str) => {
      try { return btoa(unescape(encodeURIComponent(str))); } catch (_) {
        const bytes = new TextEncoder().encode(str);
        let binary = ''; bytes.forEach(b => { binary += String.fromCharCode(b); });
        return btoa(binary);
      }
    };
    const uploadOne = async (filePath, contentStr) => {
      const segs = String(filePath).split('/').map(s => encodeURIComponent(s)).join('/');
      const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${segs}`;
      const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };
      let sha;
      try {
        const getRes = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}`, { headers });
        if (getRes.status === 200) { const data = await getRes.json(); sha = data && data.sha; }
      } catch (e) { console.warn('[ConfigSync] 检查现有文件失败（忽略）', e); }
      const body = { message: `TidyMark config backup: ${new Date().toISOString()}`, content: toBase64(contentStr), branch };
      if (sha) body.sha = sha;
      let putRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (putRes.status === 201 || putRes.status === 200) { const data = await putRes.json(); return { success: true, data }; }
      if (putRes.status === 404 && branch === 'main') {
        try {
          const fallbackBranch = 'master';
          let fbSha;
          try { const fbGetRes = await fetch(`${baseUrl}?ref=${encodeURIComponent(fallbackBranch)}`, { headers }); if (fbGetRes.status === 200) { const fbData = await fbGetRes.json(); fbSha = fbData && fbData.sha; } } catch { }
          const fbBody = { ...body, branch: fallbackBranch }; if (fbSha) fbBody.sha = fbSha;
          const fbPutRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(fbBody) });
          if (fbPutRes.status === 201 || fbPutRes.status === 200) { const fbData = await fbPutRes.json(); return { success: true, data: fbData }; }
        } catch (e) { console.warn('[ConfigSync] master 分支上传异常（忽略）', e); }
      }
      const errText = await putRes.text();
      return { success: false, error: `GitHub 响应 ${putRes.status}: ${errText}` };
    };

    const normalized = normalizeStringsDeep(lastConfigBackup);
    const result = await uploadOne(path, JSON.stringify(normalized, null, 2));
    if (result && result.success) {
      sendResponse({ success: true, data: { contentPath: path, htmlUrl: (result && result.data && result.data.content && result.data.content.html_url) || (result && result.data && result.data.commit && result.data.commit.html_url) || null } });
    } else {
      sendResponse({ success: false, error: result?.error || '未知错误' });
    }
  } catch (error) {
    console.error('[ConfigSync] GitHub 配置上传失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 从 GitHub 拉取配置并导入到本地（覆盖现有配置）
async function handleImportGithubConfig(payload, sendResponse) {
  try {
    const { token, owner, repo, path = 'tidymark/backups/tidymark-config.json' } = payload || {};
    if (!token || !owner || !repo) {
      sendResponse({ success: false, error: '配置不完整' });
      return;
    }

    // 获取默认分支
    let branch = 'main';
    try {
      const repoInfoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (repoInfoRes.ok) {
        const info = await repoInfoRes.json();
        if (info && typeof info.default_branch === 'string' && info.default_branch.trim()) {
          branch = info.default_branch.trim();
        }
      }
    } catch (e) {
      console.warn('[ConfigImport] 获取仓库默认分支失败，使用 main 作为默认', e);
    }

    // 拉取文件内容
    const segs = String(path).split('/').map(s => encodeURIComponent(s)).join('/');
    const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${segs}`;
    const headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
    const res = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    if (res.status !== 200) {
      // 尝试 master 作为回退
      if (branch === 'main') {
        const res2 = await fetch(`${baseUrl}?ref=master`, { headers });
        if (res2.status !== 200) {
          const errText = await res2.text();
          sendResponse({ success: false, error: `无法获取配置文件（${res.status}/${res2.status}）: ${errText}` });
          return;
        }
        const data2 = await res2.json();
        const decodeBase64Utf8 = (b64) => {
          try {
            return decodeURIComponent(escape(atob(b64)));
          } catch (_) {
            const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
            return new TextDecoder('utf-8').decode(bytes);
          }
        };
        const jsonStr2 = decodeBase64Utf8(data2.content || '');
        const parsed2 = JSON.parse(jsonStr2);
        await importConfigData(parsed2);
        sendResponse({ success: true });
        return;
      }
      const errText = await res.text();
      sendResponse({ success: false, error: `无法获取配置文件（${res.status}）: ${errText}` });
      return;
    }
    const data = await res.json();
    const decodeBase64Utf8 = (b64) => {
      try {
        return decodeURIComponent(escape(atob(b64)));
      } catch (_) {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
      }
    };
    const jsonStr = decodeBase64Utf8(data.content || '');
    const parsed = JSON.parse(jsonStr);
    await importConfigData(parsed);
    sendResponse({ success: true });
  } catch (error) {
    console.error('[ConfigImport] 从 GitHub 导入配置失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 覆盖导入配置到本地存储
async function importConfigData(backup) {
  const syncData = (backup && backup.sync) || {};
  const localData = (backup && backup.local) || {};
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    if (syncData && typeof syncData === 'object') {
      await chrome.storage.sync.set(syncData);
    }
    if (localData && typeof localData === 'object') {
      await chrome.storage.local.set(localData);
    }
  } catch (e) {
    console.error('[ConfigImport] 写入本地配置失败', e);
    throw e;
  }
}

// 创建书签备份
async function createBookmarkBackup() {
  try {
    // 获取所有书签
    const bookmarks = await chrome.bookmarks.getTree();

    // 获取当前设置
    const settings = await chrome.storage.sync.get();

    // 创建备份数据
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      bookmarks: bookmarks,
      settings: settings,
      metadata: {
        totalBookmarks: await countBookmarks(bookmarks),
        extensionVersion: chrome.runtime.getManifest().version
      }
    };

    // 保存备份信息到存储
    await chrome.storage.local.set({
      lastBackup: backupData,
      lastBackupTime: Date.now()
    });

    // 更新设置中的最后备份时间
    await chrome.storage.sync.set({
      lastBackupTime: Date.now()
    });

    console.log('书签备份创建成功');
    return {
      timestamp: backupData.timestamp,
      totalBookmarks: backupData.metadata.totalBookmarks
    };
  } catch (error) {
    console.error('创建书签备份失败:', error);
    throw error;
  }
}

// 检查并自动备份书签
async function checkAndBackupBookmarks() {
  try {
    const settings = await chrome.storage.sync.get(['autoBackup', 'lastBackupTime', 'backupInterval']);

    if (!settings.autoBackup) {
      return;
    }

    const now = Date.now();
    const lastBackupTime = settings.lastBackupTime || 0;
    const backupInterval = settings.backupInterval || 24 * 60 * 60 * 1000; // 默认24小时

    if (now - lastBackupTime > backupInterval) {
      console.log('执行自动备份...');
      await createBookmarkBackup();
    }
  } catch (error) {
    console.error('自动备份检查失败:', error);
  }
}

// 检查并自动归档旧书签
async function checkAndArchiveOldBookmarks() {
  try {
    const { autoArchiveOldBookmarks, archiveOlderThanDays } = await chrome.storage.sync.get(['autoArchiveOldBookmarks', 'archiveOlderThanDays']);
    if (!autoArchiveOldBookmarks) return;

    const days = Number.isFinite(archiveOlderThanDays) ? Math.max(7, Math.min(3650, archiveOlderThanDays)) : 180;
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

    const tree = await chrome.bookmarks.getTree();
    const all = flattenBookmarks(tree);
    if (!Array.isArray(all) || all.length === 0) return;

    // 读取最近访问时间映射（来自新标签页统计）
    let lastByBookmark = {};
    try {
      const { visitStats: vs } = await chrome.storage.local.get(['visitStats']);
      if (vs && typeof vs === 'object' && vs.lastByBookmark) lastByBookmark = vs.lastByBookmark || {};
    } catch (_) { }

    // 找到/创建“归档”文件夹
    const archiveFolder = await findOrCreateFolder('归档');
    const archiveId = String(archiveFolder.id);

    const toArchive = all.filter(b => {
      const idKey = String(b.id);
      const urlKey = String(b.url || '');
      const lastVisit = Number(lastByBookmark[idKey] || lastByBookmark[urlKey] || 0);
      let shouldArchive = false;
      if (Number.isFinite(lastVisit) && lastVisit > 0) {
        shouldArchive = lastVisit < threshold;
      } else {
        // 无访问记录时，回退到 dateAdded；如也无则不归档
        const added = Number(b.dateAdded || 0);
        shouldArchive = Number.isFinite(added) && added > 0 && added < threshold;
      }
      return b.url && shouldArchive && String(b.parentId) !== archiveId;
    });

    if (toArchive.length === 0) return;

    console.log(`[Archive] 发现需要归档的书签 ${toArchive.length} 条（>${days} 天）`);
    const parentIds = new Set();
    for (const b of toArchive) {
      try {
        if (b.parentId) parentIds.add(String(b.parentId));
        await chrome.bookmarks.move(String(b.id), { parentId: archiveId });
      } catch (e) {
        console.warn('[Archive] 移动书签失败:', b.id, e);
      }
    }

    // 归档后清理可能出现的空目录（非系统目录）
    try {
      await cleanupEmptyFolders(Array.from(parentIds));
    } catch (e) {
      console.warn('[Archive] 清理空目录失败', e);
    }
  } catch (error) {
    console.error('自动归档检查失败:', error);
  }
}

// 每日自动同步（后台，无需打开任何页面）
async function maybeRunDailyGithubAutoSync(trigger = 'manual') {
  // 读取必要配置
  const settings = await chrome.storage.sync.get([
    'githubAutoSyncDaily', 'githubToken', 'githubOwner', 'githubRepo', 'githubFormat', 'githubDualUpload', 'githubLastAutoSyncDate'
  ]);

  if (!settings.githubAutoSyncDaily) {
    console.log('[AutoSync] 未开启每日自动同步，跳过');
    return;
  }
  const token = String(settings.githubToken || '').trim();
  const owner = String(settings.githubOwner || '').trim();
  const repo = String(settings.githubRepo || '').trim();
  const format = (settings.githubFormat === 'html' ? 'html' : 'json');
  const dualUpload = !!settings.githubDualUpload;
  if (!token || !owner || !repo) {
    console.warn('[AutoSync] GitHub 配置不完整，跳过自动同步');
    return;
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (settings.githubLastAutoSyncDate === todayStr) {
    console.log('[AutoSync] 今日已自动同步过，跳过');
    return;
  }

  console.log(`[AutoSync] 触发每日自动同步（${trigger}）`);
  const payload = { token, owner, repo, format, dualUpload };
  const bookmarkResp = await new Promise((resolve) => {
    try { handleSyncGithubBackup(payload, (result) => resolve(result)); } catch (e) { resolve({ success: false, error: e?.message || String(e) }); }
  });
  const configResp = await new Promise((resolve) => {
    try { handleSyncGithubConfig({ token, owner, repo }, (result) => resolve(result)); } catch (e) { resolve({ success: false, error: e?.message || String(e) }); }
  });

  if (bookmarkResp?.success && configResp?.success) {
    console.log('[AutoSync] GitHub 自动同步成功（书签+配置）');
    try { await chrome.storage.sync.set({ githubLastAutoSyncDate: todayStr }); } catch (e) { console.warn('[AutoSync] 记录最后自动同步日期失败', e); }
  } else {
    console.warn('[AutoSync] GitHub 自动同步失败', { bookmarkError: bookmarkResp?.error, configError: configResp?.error });
    // 失败不更新日期，以便下一次重试
  }
}

// 每日自动同步 WebDAV（后台）
async function maybeRunDailyWebdavAutoSync(trigger = 'manual') {
  const settings = await chrome.storage.sync.get([
    'webdavAutoSyncDaily', 'webdavUrl', 'webdavUsername', 'webdavPassword', 'webdavPath', 'webdavFormat', 'webdavDualUpload', 'webdavLastAutoSyncDate'
  ]);

  if (!settings.webdavAutoSyncDaily) {
    console.log('[AutoSync] 未开启 WebDAV 每日自动同步，跳过');
    return;
  }

  const baseUrl = String(settings.webdavUrl || '').trim();
  const username = String(settings.webdavUsername || '').trim();
  const password = String(settings.webdavPassword || '').trim();
  const targetPath = String(settings.webdavPath || '').trim();
  const format = (settings.webdavFormat === 'html' ? 'html' : 'json');
  const dualUpload = !!settings.webdavDualUpload;

  if (!baseUrl || !username || !password || !targetPath) {
    console.warn('[AutoSync] WebDAV 配置不完整，跳过自动同步');
    return;
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (settings.webdavLastAutoSyncDate === todayStr) {
    console.log('[AutoSync] WebDAV 今日已自动同步过，跳过');
    return;
  }

  // 检查动态权限（后台无法弹窗请求，只在已有权限时执行）
  try {
    const origin = new URL(baseUrl).origin;
    const originPattern = `${origin}/*`;
    const hasPerm = await chrome.permissions.contains({ origins: [originPattern] });
    if (!hasPerm) {
      console.warn('[AutoSync] 无 WebDAV 域名访问权限，跳过自动同步:', originPattern);
      return;
    }
  } catch (e) {
    console.warn('[AutoSync] 检查 WebDAV 权限失败，尝试继续执行', e);
  }

  // 构建同步配置
  const config = { baseUrl, username, password, targetPath, format, dualUpload };

  console.log(`[AutoSync] 触发 WebDAV 每日自动同步（${trigger}）`);

  try {
    const cloudSyncService = globalThis.CloudSyncService;
    if (!cloudSyncService) {
      console.warn('[AutoSync] 云同步服务未初始化');
      return;
    }

    // 确保备份数据可用
    await createBookmarkBackup();
    const { lastBackup } = await chrome.storage.local.get(['lastBackup']);
    const backup = lastBackup;
    if (!backup || !backup.bookmarks) {
      console.warn('[AutoSync] 无法获取书签备份数据，跳过');
      return;
    }

    const result = await cloudSyncService.syncBackup('webdav', config, backup);
    if (result && result.success) {
      console.log('[AutoSync] WebDAV 自动同步成功');
      try { await chrome.storage.sync.set({ webdavLastAutoSyncDate: todayStr }); } catch (e) { console.warn('[AutoSync] 记录 WebDAV 最后自动同步日期失败', e); }
    } else {
      console.warn('[AutoSync] WebDAV 自动同步失败', result?.error);
    }
  } catch (e) {
    console.warn('[AutoSync] WebDAV 自动同步异常', e);
  }
}

// 自动分类书签
async function autoClassifyBookmarks(options = {}) {
  try {
    const { dryRun = false } = options;
    // 获取分类规则
    let rules;
    try {
      const { classificationRules, classificationLanguage } = await chrome.storage.sync.get(['classificationRules', 'classificationLanguage']);
      const lang = resolveClassificationLanguage(classificationLanguage);
      rules = classificationRules || getDefaultClassificationRules(lang);
      console.log('[autoClassify] 规则加载完成:', Array.isArray(rules) ? rules.length : 0);
    } catch (e) {
      console.warn('[autoClassify] 规则加载失败，使用默认规则:', e);
      const { classificationLanguage } = await chrome.storage.sync.get('classificationLanguage');
      const lang = resolveClassificationLanguage(classificationLanguage);
      rules = getDefaultClassificationRules(lang);
    }

    // 获取书签（支持限定范围，兼容多范围与单范围）
    let bookmarksTrees = [];
    try {
      const ids = Array.isArray(options.scopeFolderIds)
        ? options.scopeFolderIds.map(id => String(id)).filter(Boolean)
        : [];
      if (ids.length > 0) {
        for (const id of ids) {
          const tree = await chrome.bookmarks.getSubTree(String(id));
          bookmarksTrees.push({ scopeId: String(id), tree });
          console.log('[autoClassify] 获取指定范围子树成功:', id);
        }
      } else if (options.scopeFolderId) {
        const id = String(options.scopeFolderId);
        const tree = await chrome.bookmarks.getSubTree(id);
        bookmarksTrees.push({ scopeId: id, tree });
        console.log('[autoClassify] 获取指定范围子树成功(兼容单值):', id);
      } else {
        const tree = await chrome.bookmarks.getTree();
        bookmarksTrees.push({ scopeId: '', tree });
        console.log('[autoClassify] 获取书签树成功');
      }
    } catch (e) {
      console.error('[autoClassify] 获取书签树失败:', e);
      throw new Error('无法读取书签，请检查权限');
    }
    let flatBookmarks = [];
    for (const { scopeId, tree } of bookmarksTrees) {
      const flat = flattenBookmarks(tree);
      flat.forEach(b => flatBookmarks.push({ ...b, _originScopeId: scopeId }));
    }
    console.log('[autoClassify] 扁平化书签数量:', flatBookmarks.length);

    // 构建预览分类结果
    const preview = {
      total: flatBookmarks.length,
      classified: 0,
      categories: {}, // { [category]: { count, bookmarks: [] } }
      details: []
    };

    const { classificationLanguage: clsLangRaw } = await chrome.storage.sync.get('classificationLanguage');
    const clsLang = resolveClassificationLanguage(clsLangRaw);
    const otherName = translateCategoryName('其他', clsLang);
    for (const bookmark of flatBookmarks) {
      if (!bookmark.url) continue; // 跳过文件夹
      const category = classifyBookmark(bookmark, rules) || otherName;
      preview.details.push({ bookmark, category, scopeFolderId: bookmark._originScopeId || '' });
      if (!preview.categories[category]) {
        preview.categories[category] = { count: 0, bookmarks: [] };
      }
      preview.categories[category].count++;
      preview.categories[category].bookmarks.push(bookmark);
      if (category !== otherName) preview.classified++;
    }

    if (dryRun) {
      console.log('整理预览生成:', {
        total: preview.total,
        classified: preview.classified,
        categories: Object.keys(preview.categories)
      });
      return preview;
    }

    // 实际整理：仅为有书签的分类创建文件夹
    // 多范围下按范围创建分类文件夹；未指定范围则默认书签栏('1')
    const categoryFoldersByScope = {};
    const categoriesPerScope = {};
    for (const { category, scopeFolderId } of preview.details) {
      const sid = scopeFolderId || '';
      if (category === otherName) continue;
      if (!categoriesPerScope[sid]) categoriesPerScope[sid] = new Set();
      categoriesPerScope[sid].add(category);
    }
    for (const [sid, set] of Object.entries(categoriesPerScope)) {
      const parentId = sid ? String(sid) : '1';
      if (!categoryFoldersByScope[sid]) categoryFoldersByScope[sid] = {};
      for (const category of set) {
        const folder = await findOrCreateFolder(category, { parentId });
        categoryFoldersByScope[sid][category] = folder;
      }
    }

    // 移动书签到对应文件夹
    let moved = 0;
    const oldParentCandidates = new Set();
    for (const { bookmark, category, scopeFolderId } of preview.details) {
      const sid = scopeFolderId || '';
      if (!categoryFoldersByScope[sid]) categoryFoldersByScope[sid] = {};
      // 懒创建“其他/Others”文件夹（仅当需要移动到该分类时）
      let targetFolder = categoryFoldersByScope[sid][category];
      if (!targetFolder && category === otherName) {
        const otherNm = translateCategoryName('其他', clsLang);
        const parentId = sid ? String(sid) : '1';
        categoryFoldersByScope[sid][otherNm] = await findOrCreateFolder(otherNm, { parentId });
        targetFolder = categoryFoldersByScope[sid][otherNm];
      }
      if (!targetFolder) continue; // 未创建文件夹则不移动
      if (bookmark.parentId !== targetFolder.id) {
        if (bookmark.parentId) oldParentCandidates.add(bookmark.parentId);
        await chrome.bookmarks.move(bookmark.id, { parentId: targetFolder.id });
        moved++;
      }
    }

    const results = {
      ...preview,
      moved
    };
    // 整理完成后，写入存储：organizedBookmarks 与 categories
    try {
      const organizedBookmarkIds = preview.details
        .filter(({ category, scopeFolderId }) => Boolean(categoryFoldersByScope[scopeFolderId || '']?.[category]))
        .map(({ bookmark }) => bookmark.id);

      const categoriesArr = [];
      for (const [sid, map] of Object.entries(categoryFoldersByScope)) {
        for (const [name, folder] of Object.entries(map)) {
          const bookmarkIds = preview.details
            .filter(d => (d.scopeFolderId || '') === sid && d.category === name)
            .map(d => d.bookmark.id);
          categoriesArr.push({
            id: folder.id,
            name,
            bookmarkIds,
            keywords: [],
            createdAt: new Date().toISOString()
          });
        }
      }

      await chrome.storage.local.set({
        organizedBookmarks: organizedBookmarkIds,
        categories: categoriesArr
      });
      console.log('[autoClassify] 已更新存储: organizedBookmarks 与 categories');
    } catch (e) {
      console.warn('[autoClassify] 写入存储失败，不影响整理结果:', e);
    }

    // 清理源空目录（删除在此次移动中涉及的且已变为空的文件夹）
    try {
      const deleted = await cleanupEmptyFolders([...oldParentCandidates]);
      if (deleted.length > 0) {
        console.log('[autoClassify] 已删除空目录:', deleted);
      }
    } catch (e) {
      console.warn('[autoClassify] 清理空目录失败:', e);
    }

    console.log('自动分类完成:', results);
    return results;
  } catch (error) {
    console.error('自动分类失败:', error);
    throw error;
  }
}

// 分类单个书签
function classifyBookmark(bookmark, rules) {
  const title = bookmark.title.toLowerCase();
  const url = bookmark.url.toLowerCase();

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      if (title.includes(keyword.toLowerCase()) || url.includes(keyword.toLowerCase())) {
        return rule.category;
      }
    }
  }

  return '其他';
}

// 查找或创建文件夹（若提供 parentId，仅在该父目录下匹配/创建）
async function findOrCreateFolder(name) {
  try {
    const hasOptions = (typeof arguments[1] === 'object' && arguments[1]);
    const specifiedParentId = hasOptions && arguments[1].parentId ? String(arguments[1].parentId) : '';

    // 搜索现有同名文件夹
    const results = await chrome.bookmarks.search(name);
    let folder = null;
    if (typeof name === 'string') {
      if (specifiedParentId) {
        // 严格限定：只复用同一父目录下的同名文件夹
        folder = results.find(item => !item.url && item.title === name && String(item.parentId) === specifiedParentId);
      } else {
        // 未指定父目录时，可复用任意同名文件夹
        folder = results.find(item => !item.url && item.title === name);
      }
    }

    if (folder) {
      return folder;
    }

    // 未找到则在目标父目录下创建（未指定时默认书签栏 '1'）
    const parentId = specifiedParentId || '1';
    const newFolder = await chrome.bookmarks.create({
      title: name,
      parentId
    });
    return newFolder;
  } catch (error) {
    console.error(`创建文件夹 "${name}" 失败:`, error);
    throw error;
  }
}

// 扁平化书签树
function flattenBookmarks(bookmarkTree) {
  const result = [];

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.url) {
        result.push(node);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(bookmarkTree);
  return result;
}

// 搜索书签
async function searchBookmarks(query) {
  try {
    const results = await chrome.bookmarks.search(query);
    return results.filter(bookmark => bookmark.url); // 只返回书签，不包括文件夹
  } catch (error) {
    console.error('搜索书签失败:', error);
    throw error;
  }
}

// 获取书签统计信息
async function getBookmarkStats() {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    const flatBookmarks = flattenBookmarks(bookmarks);

    // 按文件夹统计
    const folderStats = {};
    const bookmarksByFolder = {};

    function traverseForStats(nodes, parentTitle = '根目录') {
      for (const node of nodes) {
        if (node.url) {
          // 这是一个书签
          if (!bookmarksByFolder[parentTitle]) {
            bookmarksByFolder[parentTitle] = [];
          }
          bookmarksByFolder[parentTitle].push(node);
        } else if (node.children) {
          // 这是一个文件夹
          folderStats[node.title] = 0;
          traverseForStats(node.children, node.title);
        }
      }
    }

    traverseForStats(bookmarks);

    // 计算每个文件夹的书签数量
    for (const [folder, bookmarkList] of Object.entries(bookmarksByFolder)) {
      folderStats[folder] = bookmarkList.length;
    }

    return {
      totalBookmarks: flatBookmarks.length,
      totalFolders: Object.keys(folderStats).length,
      folderStats: folderStats,
      lastBackupTime: (await chrome.storage.sync.get('lastBackupTime')).lastBackupTime
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    throw error;
  }
}

// 计算书签总数
async function countBookmarks(bookmarkTree) {
  let count = 0;

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.url) {
        count++;
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(bookmarkTree);
  return count;
}

// AI分类功能（第二版功能）
async function classifyBookmarksWithAI(bookmarks) {
  try {
    const { aiProvider, aiApiKey, aiApiUrl, classificationLanguage } = await chrome.storage.sync.get(['aiProvider', 'aiApiKey', 'aiApiUrl', 'classificationLanguage']);

    if (!aiApiKey) {
      throw new Error('AI API Key 未配置');
    }

    // 这里应该实现实际的AI API调用
    // 由于这是示例代码，我们返回模拟结果
    const lang = resolveClassificationLanguage(classificationLanguage);
    const mockResults = bookmarks.map(bookmark => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      suggestedCategory: classifyBookmark(bookmark, getDefaultClassificationRules(lang)),
      confidence: Math.random() * 0.5 + 0.5 // 0.5-1.0的置信度
    }));

    return mockResults;
  } catch (error) {
    console.error('AI分类失败:', error);
    throw error;
  }
}

// 使用AI对预览进行二次整理
// 解析 AI 返回内容中的 JSON（兼容 ```json ... ``` 包裹、前后说明文本）
function parseAiJsonContent(result) {
  if (result == null) return null;
  let text = '';
  if (typeof result === 'string') {
    text = result;
  } else if (typeof result === 'object') {
    // 兼容 OpenAI/DeepSeek 响应对象或 {content} 结构
    if (typeof result.content === 'string') {
      text = result.content;
    } else if (result.choices && result.choices[0] && result.choices[0].message && typeof result.choices[0].message.content === 'string') {
      text = result.choices[0].message.content;
    } else {
      try {
        text = JSON.stringify(result);
      } catch (_) {
        return null;
      }
    }
  } else {
    return null;
  }

  if (!text || typeof text !== 'string') return null;
  let candidate = text.trim();

  // 若包含 ```json ... ``` 栅栏，优先提取其中内容
  const fenced = candidate.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
  if (fenced && fenced[1]) {
    candidate = fenced[1].trim();
  }
  // 移除可能的起止栅栏残留
  candidate = candidate.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();

  // 去掉前置说明，保留第一个 JSON 起始到末尾的平衡块
  const firstBrace = candidate.indexOf('{');
  if (firstBrace > 0) {
    candidate = candidate.slice(firstBrace);
  }
  const lastBrace = candidate.lastIndexOf('}');
  if (lastBrace >= 0 && lastBrace < candidate.length - 1) {
    candidate = candidate.slice(0, lastBrace + 1);
  }

  try {
    return JSON.parse(candidate);
  } catch (_) {
    const balanced = extractBalancedJson(candidate);
    if (balanced) {
      try {
        return JSON.parse(balanced);
      } catch (e2) {
        console.warn('[AI] JSON 解析失败（平衡块尝试）:', e2);
        // 尝试对象级别的挽救：从文本中提取条目对象
        const salvaged = salvageReassignedItemsFromText(candidate);
        if (salvaged && salvaged.reassigned_items && salvaged.reassigned_items.length > 0) {
          console.warn('[AI] 使用挽救的 reassigned_items，条目数:', salvaged.reassigned_items.length);
          return salvaged;
        }
        return null;
      }
    }
    // 尝试对象级别的挽救：从文本中提取条目对象
    const salvaged = salvageReassignedItemsFromText(candidate);
    if (salvaged && salvaged.reassigned_items && salvaged.reassigned_items.length > 0) {
      console.warn('[AI] 使用挽救的 reassigned_items，条目数:', salvaged.reassigned_items.length);
      return salvaged;
    }
    console.warn('[AI] JSON 解析失败，原始内容片段:', candidate.slice(0, 200));
    return null;
  }
}

function extractBalancedJson(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let prev = '';
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '"' && prev !== '\\') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    prev = ch;
  }
  return null;
}

// 从文本中挖掘多个平衡的对象，构建最小合法结构
function salvageReassignedItemsFromText(text) {
  const items = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf('{', i);
    if (start < 0) break;
    let depth = 0;
    let inStr = false;
    let prev = '';
    let end = -1;
    for (let j = start; j < text.length; j++) {
      const ch = text[j];
      if (inStr) {
        if (ch === '"' && prev !== '\\') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) { end = j; break; }
        }
      }
      prev = ch;
    }
    if (end > start) {
      const objText = text.slice(start, end + 1);
      try {
        const obj = JSON.parse(objText);
        // 粗过滤：需要含 id 与 to_key 字段才视为条目
        if (obj && typeof obj === 'object' && obj.id && (obj.to_key || obj.toKey || obj.to)) {
          const normalized = {
            id: String(obj.id),
            from_key: obj.from_key ?? obj.fromKey ?? obj.from ?? null,
            to_key: obj.to_key ?? obj.toKey ?? obj.to ?? null,
            confidence: typeof obj.confidence === 'number' ? obj.confidence : undefined,
            reason: obj.reason ?? ''
          };
          if (normalized.to_key) items.push(normalized);
        }
      } catch (_) {
        // 忽略无法解析的对象块
      }
      i = end + 1;
    } else {
      // 若未找到闭合，推进一个字符继续尝试，跳过当前不完整块
      i = start + 1;
      continue;
    }
  }
  if (items.length === 0) return null;
  return {
    reassigned_items: items,
    notes: {
      global_rules: [],
      low_confidence_items: [],
      followups: []
    }
  };
}
async function refinePreviewWithAI(preview) {
  const settings = await chrome.storage.sync.get(['enableAI', 'aiProvider', 'aiApiKey', 'aiApiUrl', 'aiModel', 'maxTokens', 'classificationLanguage', 'maxCategories', 'aiBatchSize', 'aiConcurrency']);
  if (!settings.enableAI) {
    return preview;
  }
  if ((String(settings.aiProvider || '').toLowerCase() !== 'ollama') && !settings.aiApiKey) {
    throw new Error('AI 未启用或 API Key 未配置');
  }

  // 打印输入预览摘要（AI 优化前）
  try {
    const beforeSummary = {
      total: preview.total,
      classified: preview.classified,
      categories: Object.fromEntries(Object.entries(preview.categories || {}).map(([k, v]) => [k, v?.count || 0]))
    };
    console.log('[后台AI优化] 输入预览摘要:', beforeSummary);
  } catch (e) {
    console.warn('[后台AI优化] 输入预览摘要打印失败:', e);
  }

  // 构建输入：分类与条目
  const categories = Object.keys(preview.categories).map(name => ({ name, keywords: [] }));
  const items = preview.details.map(d => ({ id: d.bookmark.id, title: d.bookmark.title || '', url: d.bookmark.url || '', from_key: d.category }));
  const language = settings.classificationLanguage || 'auto';

  // 分批与并发参数（带默认值）
  const batchSize = Number(settings.aiBatchSize) > 0 ? Number(settings.aiBatchSize) : 50;
  const concurrency = Number(settings.aiConcurrency) > 0 ? Math.min(Number(settings.aiConcurrency), 5) : 2;

  // 将 items 分批构造任务
  const chunks = chunkArray(items, batchSize);
  const tasks = chunks.map((chunk, idx) => async () => {
    const prompt = await buildOptimizationPrompt({ language, categories, items: chunk });
    const aiResult = await requestAIWithRetry({
      provider: settings.aiProvider || 'openai',
      apiUrl: settings.aiApiUrl || '',
      apiKey: settings.aiApiKey,
      model: settings.aiModel || 'gpt-3.5-turbo',
      maxTokens: settings.maxTokens || 8192,
      prompt
    }, { retries: 2, baseDelayMs: 1200, label: `batch-${idx + 1}/${chunks.length}` });
    const parsed = parseAiJsonContent(aiResult);
    return parsed;
  });

  const results = await runPromisesWithConcurrency(tasks, concurrency);

  // 合并分批结果
  const merged = { reassigned_items: [], notes: { low_confidence_items: [] } };
  for (const r of results) {
    if (!r || !Array.isArray(r.reassigned_items)) continue;
    merged.reassigned_items.push(...r.reassigned_items);
    const lows = (r.notes && Array.isArray(r.notes.low_confidence_items)) ? r.notes.low_confidence_items : [];
    merged.notes.low_confidence_items.push(...lows);
  }
  if (merged.reassigned_items.length === 0) {
    console.warn('[AI] 分批返回缺少有效的 reassigned_items，使用原始预览');
    return preview;
  }

  // 应用重分配
  const newPreview = { ...preview, categories: {}, details: [] };
  // 先复制原详情
  const idToDetail = new Map();
  for (const d of preview.details) {
    idToDetail.set(d.bookmark.id, { bookmark: d.bookmark, category: d.category });
  }
  const allowedCategories = new Set(Object.keys(preview.categories));
  const lowConfSet = new Set(Array.isArray(merged.notes?.low_confidence_items) ? merged.notes.low_confidence_items : []);
  const movedItems = [];
  // 应用AI重分配
  for (const item of merged.reassigned_items) {
    const d = idToDetail.get(item.id);
    if (!d) continue;
    // 跳过低置信度或未在允许分类中的目标
    if (lowConfSet.has(item.id)) continue;
    if (typeof item.confidence === 'number' && item.confidence < 0.5) continue;
    const target = item.to_key || d.category;
    if (allowedCategories.has(target)) {
      if (target !== d.category) {
        movedItems.push({
          id: String(item.id),
          title: d.bookmark.title || '',
          from: d.category,
          to: target,
          confidence: typeof item.confidence === 'number' ? item.confidence : undefined
        });
      }
      d.category = target;
    }
  }
  // 重建 categories
  for (const d of idToDetail.values()) {
    newPreview.details.push(d);
    if (!newPreview.categories[d.category]) {
      newPreview.categories[d.category] = { count: 0, bookmarks: [] };
    }
    newPreview.categories[d.category].count++;
    newPreview.categories[d.category].bookmarks.push(d.bookmark);
  }
  try {
    const { classificationLanguage } = await chrome.storage.sync.get('classificationLanguage');
    const lang = resolveClassificationLanguage(classificationLanguage);
    const otherName = translateCategoryName('其他', lang);
    newPreview.classified = Object.keys(newPreview.categories).reduce((sum, k) => sum + (k !== otherName ? (newPreview.categories[k]?.count || 0) : 0), 0);
  } catch (_) {
    newPreview.classified = Object.keys(newPreview.categories).reduce((sum, k) => sum + (k !== '其他' ? (newPreview.categories[k]?.count || 0) : 0), 0);
  }
  newPreview.total = preview.total;
  // 打印输出预览摘要（AI 优化后）与变更数
  try {
    const afterSummary = {
      total: newPreview.total,
      classified: newPreview.classified,
      categories: Object.fromEntries(Object.entries(newPreview.categories || {}).map(([k, v]) => [k, v?.count || 0]))
    };
    const beforeMap = new Map((preview.details || []).map(d => [d.bookmark?.id, d.category]));
    let changed = 0;
    for (const d of (newPreview.details || [])) {
      const prev = beforeMap.get(d.bookmark?.id);
      if (prev && prev !== d.category) changed++;
    }
    console.log('[后台AI优化] 输出预览摘要:', afterSummary, '变更条目数:', changed);
    if (movedItems.length > 0) {
      console.log('[后台AI优化] 移动明细:', movedItems);
    } else {
      console.log('[后台AI优化] 无条目发生移动');
    }
  } catch (e) {
    console.warn('[后台AI优化] 输出预览摘要打印失败:', e);
  }

  return newPreview;
}

// 将数组按固定大小切片
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// 并发执行 Promise 任务，限制最大并发数
async function runPromisesWithConcurrency(tasks, limit = 2) {
  const results = new Array(tasks.length);
  let idx = 0;
  let running = 0;
  return new Promise((resolve, reject) => {
    const next = () => {
      if (idx >= tasks.length && running === 0) return resolve(results);
      while (running < limit && idx < tasks.length) {
        const cur = idx++;
        running++;
        Promise.resolve()
          .then(() => tasks[cur]())
          .then(res => { results[cur] = res; })
          .catch(err => { results[cur] = null; console.warn('[AI] 分批任务失败:', err?.message || err); })
          .finally(() => { running--; next(); });
      }
    };
    next();
  });
}

// 封装带重试与退避的 AI 请求
async function requestAIWithRetry(params, { retries = 2, baseDelayMs = 1000, label = '' } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await requestAI(params);
    } catch (e) {
      const msg = String(e?.message || e || '');
      const isRateLimit = msg.includes('429');
      if (attempt >= retries) throw e;
      const delay = Math.round(baseDelayMs * Math.pow(2, attempt));
      console.warn(`[AI] 请求失败${label ? ' [' + label + ']' : ''}，${isRateLimit ? '速率限制' : '错误'}，${delay}ms 后重试 (第 ${attempt + 1}/${retries} 次)`);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}

// 填充提示模板的占位符
function fillPromptTemplate(tpl, { language, categoriesJson, itemsJson }) {
  const map = { language, categoriesJson, itemsJson };
  return String(tpl).replace(/\{\{\s*(language|categoriesJson|itemsJson)\s*\}\}/g, (_, key) => map[key] ?? '');
}

// 构建AI提示词（支持用户配置模板）
async function buildOptimizationPrompt({ language, categories, items }) {
  const cats = Array.isArray(categories) ? categories : [];
  const its = Array.isArray(items) ? items : [];
  const categoriesJson = JSON.stringify(cats, null, 2);
  const itemsJson = JSON.stringify(its, null, 2);

  // 尝试读取用户自定义模板
  try {
    const { aiPromptOrganize } = await chrome.storage.sync.get(['aiPromptOrganize']);
    if (aiPromptOrganize && String(aiPromptOrganize).trim().length > 0) {
      return fillPromptTemplate(aiPromptOrganize, { language, categoriesJson, itemsJson });
    }
  } catch (_) { }

  // 默认模板（与旧版一致）
  return (
    `
You are a meticulous Information Architecture and Intelligent Classification Expert.
Your task is not to modify or create categories.
Instead, you must intelligently reassign and organize bookmarks within the existing category structure.

Input Description:

- Current language: ${language}
- Existing categories and keywords (array): ${categoriesJson}
- Bookmarks to be reorganized (optional array): ${itemsJson}

Objective:

Based on the names and keywords of the existing categories, intelligently determine the most appropriate category for each bookmark.
You must not add, delete, or modify categories.
If multiple categories are possible, return the one with the highest confidence score and explain your reasoning.

Rules & Principles (Strictly Follow):

- Only classify items into existing categories — no new ones may be created.
- Use the given ${language} for semantic and keyword-based matching.
- Prioritize bookmark titles for matching, then URLs, and then descriptions (if available).
- If the confidence score is below 0.5, mark the item as "low confidence".
- Output must strictly conform to the JSON structure below.
- No extra commentary or text is allowed outside the JSON.

Output Format (strict JSON, no extra text):
{
  "reassigned_items": [
    {
      "id": "string",
      "from_key": "string | null",
      "to_key": "string",
      "confidence": 0.0,
      "reason": "string"
    }
  ],
  "notes": {
    "global_rules": ["string"],
    "low_confidence_items": ["id"],
    "followups": ["string"]
  }
}

Output Requirement:
Return only a valid JSON object strictly following the above format — no markdown, no explanations, no text outside the JSON.`
  );
}

// 构建 AI 推理提示词（支持用户配置模板，不预设分类）
async function buildInferencePrompt({ language, items }) {
  const its = Array.isArray(items) ? items : [];
  const itemsJson = JSON.stringify(its, null, 2);

  // 尝试读取用户自定义模板
  try {
    const { aiPromptInfer } = await chrome.storage.sync.get(['aiPromptInfer']);
    if (aiPromptInfer && String(aiPromptInfer).trim().length > 0) {
      return fillPromptTemplate(aiPromptInfer, { language, categoriesJson: '', itemsJson });
    }
  } catch (_) { }

  // 默认模板（与旧版一致）
  return (
    `
You are a world-class Information Architecture and Taxonomy Expert.
Your task is to infer a clean, human-understandable category taxonomy from bookmarks, without any preset categories.

Input Description:
- Current language: ${language}
- Bookmarks (array): ${itemsJson}

Objective:
- Infer appropriate, concise category names that best group the bookmarks.
- Assign every bookmark to exactly one inferred category.
- Use the given language (${language}) for category naming when applicable.

Rules & Principles:
- Do not return any commentary outside JSON.
- Keep category names short (1–3 words) and meaningful.
- Prefer semantic grouping by title first, URL second.
- Mark low confidence assignments with confidence < 0.5; list their ids in notes.low_confidence_items.

Output Format (strict JSON, no extra text):
{
  "categories": ["string"],
  "assignments": [
    { "id": "string", "to_key": "string", "confidence": 0.0 }
  ],
  "notes": {
    "low_confidence_items": ["id"],
    "followups": ["string"]
  }
}

Output Requirement:
Return only a valid JSON object strictly following the above format — no markdown, no explanations, no text outside the JSON.`
  );
}

// 验证模型与提供商的兼容性
function validateModelForProvider(model, provider) {
  if (!model || !provider) {
    return { valid: false, error: '模型和提供商参数不能为空' };
  }

  const modelName = String(model).trim().toLowerCase();
  const providerName = String(provider).trim().toLowerCase();

  // 检查 reasoner 类思考模型（返回格式不符合扩展期望）
  if (modelName.includes('reasoner')) {
    return { valid: false, error: '当前选择的模型暂不支持该扩展的返回格式，请切换到标准对话模型（如 deepseek-chat、gpt-3.5-turbo、gpt-4 等）。' };
  }

  // 根据提供商验证模型
  switch (providerName) {
    case 'deepseek':
      // DeepSeek 官方 API 只支持特定模型
      if (!['deepseek-chat'].includes(modelName)) {
        return { valid: false, error: `DeepSeek 官方 API 不支持模型 "${model}"。请使用 "deepseek-chat"，或选择"自定义提供商"并配置支持该模型的 API 端点。` };
      }
      break;
    case 'openai':
      const openaiModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
      if (!openaiModels.includes(modelName)) {
        return { valid: false, error: `OpenAI API 不支持模型 "${model}"。支持的模型: ${openaiModels.join(', ')}` };
      }
      break;
    case 'ollama':
      // Ollama 支持任意模型，跳过验证
      break;
    case 'custom':
      // 自定义提供商支持任意模型，包括所有 OpenAI 兼容格式
      // 不进行模型验证，让用户自由配置 API 端点和模型
      break;
    default:
      return { valid: false, error: `未知的AI提供商: "${provider}"` };
  }

  return { valid: true };
}

// 调用AI服务
async function requestAI({ provider, apiUrl, apiKey, model, maxTokens, prompt }) {
  // 屏蔽不兼容的「reasoner」思考型模型（返回格式不符合本扩展期望）
  try {
    const m = String(model || '').toLowerCase();
    if (m.includes('reasoner')) {
      throw new Error('当前选择的模型暂不支持该扩展的返回格式，请切换到标准对话模型（如 deepseek-chat、gpt-3.5-turbo、gpt-4 等）。');
    }
  } catch (_) { }
  const p = String(provider || '').toLowerCase();

  // 验证模型配置
  const validationResult = validateModelForProvider(model, provider);
  if (!validationResult.valid) {
    throw new Error(validationResult.error);
  }
  let url = apiUrl && apiUrl.trim().length > 0 ? apiUrl : 'https://api.openai.com/v1/chat/completions';
  let headers = { 'Content-Type': 'application/json' };
  let body;

  console.log('[AI Debug] === requestAI 开始 ===');
  console.log('[AI Debug] 请求参数:', {
    provider,
    url,
    model,
    maxTokens,
    promptLength: prompt.length,
    hasApiKey: !!apiKey
  });

  // 详细日志：验证结果
  if (!validationResult.valid) {
    console.log('[AI Debug] === 模型验证失败 ===');
    console.log('[AI Debug] 验证错误:', validationResult.error);
  }

  if (p === 'ollama') {
    url = apiUrl && apiUrl.trim().length > 0 ? apiUrl : 'http://localhost:11434/api/chat';
    // Ollama 本地服务无需鉴权
    body = {
      model,
      stream: false,
      options: {
        // 将 maxTokens 映射为生成长度上限，避免过大
        num_predict: Math.min(Number(maxTokens) > 0 ? Number(maxTokens) : 512, 1024),
        temperature: 0.2
      },
      messages: [
        { role: 'system', content: 'You are a rigorous assistant that only returns strict JSON.' },
        { role: 'user', content: prompt }
      ]
    };
    console.log('[AI Debug] 使用 Ollama 协议');
  } else {
    // OpenAI/DeepSeek/自定义提供商 兼容接口
    headers['Authorization'] = `Bearer ${apiKey}`;
    console.log('[AI Debug] 使用认证头: Bearer [API_KEY_HIDDEN]');
    body = {
      model,
      max_tokens: maxTokens || 8192,
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'You are a rigorous assistant that only returns strict JSON.' },
        { role: 'user', content: prompt }
      ]
    };
    console.log('[AI Debug] 使用 OpenAI 兼容协议');
  }

  console.log('[AI Debug] 最终请求URL:', url);
  console.log('[AI Debug] 请求体:', JSON.stringify(body, null, 2));

  try {
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    console.log('[AI Debug] HTTP响应状态:', resp.status);
    console.log('[AI Debug] HTTP响应头:', Object.fromEntries(resp.headers.entries()));

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[AI Debug] API请求失败详情:', {
        status: resp.status,
        statusText: resp.statusText,
        headers: Object.fromEntries(resp.headers.entries()),
        responseBody: text
      });
      throw new Error(`AI请求失败: ${resp.status} ${text}`);
    }

    const data = await resp.json();
    console.log('[AI Debug] API原始响应:', JSON.stringify(data, null, 2));

    // 提取内容为字符串
    try {
      if (p === 'ollama') {
        const content = (data && data.message && typeof data.message.content === 'string') ? data.message.content : '';
        console.log('[AI Debug] Ollama 解析内容:', content);
        return content || '';
      }
      const content = data.choices?.[0]?.message?.content;
      console.log('[AI Debug] 标准API解析内容:', content);
      return content || '';
    } catch (e) {
      console.error('[AI Debug] 响应解析失败:', e);
      console.error('[AI Debug] 响应数据:', data);
      throw new Error('AI响应解析失败');
    }
  } catch (error) {
    console.error('[AI Debug] fetch错误:', error);
    throw error;
  }
}

// 根据AI预览计划执行移动
async function organizeByPlan(plan) {
  // 计划格式直接复用预览结构：{ total, classified, categories: { name: {count, bookmarks[]} }, details, meta }
  // 创建需要的文件夹（支持多范围）
  const otherCandidates = ['其他', 'Others'];
  const categoryFoldersByScope = {};
  const categoriesPerScope = {};
  // 为非“其他”类别按范围预创建文件夹
  for (const { category, scopeFolderId } of plan.details || []) {
    if (otherCandidates.includes(category)) continue;
    const sid = scopeFolderId || '';
    if (!categoriesPerScope[sid]) categoriesPerScope[sid] = new Set();
    categoriesPerScope[sid].add(category);
  }
  for (const [sid, set] of Object.entries(categoriesPerScope)) {
    const parentId = sid ? String(sid) : '1';
    if (!categoryFoldersByScope[sid]) categoryFoldersByScope[sid] = {};
    for (const category of set) {
      const folder = await findOrCreateFolder(category, { parentId });
      categoryFoldersByScope[sid][category] = folder;
    }
  }

  // 执行移动，遇到“其他”时懒创建
  let moved = 0;
  const oldParentCandidates = new Set();
  for (const { bookmark, category, scopeFolderId } of plan.details || []) {
    const sid = scopeFolderId || '';
    if (!categoryFoldersByScope[sid]) categoryFoldersByScope[sid] = {};
    let targetFolder = categoryFoldersByScope[sid][category];
    if (!targetFolder && otherCandidates.includes(category)) {
      const parentId = sid ? String(sid) : '1';
      const otherName = plan.categories['其他'] ? '其他' : (plan.categories['Others'] ? 'Others' : '其他');
      categoryFoldersByScope[sid][otherName] = await findOrCreateFolder(otherName, { parentId });
      targetFolder = categoryFoldersByScope[sid][otherName];
    }
    if (!targetFolder) continue;
    if (bookmark.parentId !== targetFolder.id) {
      if (bookmark.parentId) oldParentCandidates.add(bookmark.parentId);
      await chrome.bookmarks.move(bookmark.id, { parentId: targetFolder.id });
      moved++;
    }
  }

  const results = { ...plan, moved };
  // 同步存储
  try {
    const organizedBookmarkIds = (plan.details || [])
      .filter(({ category, scopeFolderId }) => Boolean(categoryFoldersByScope[scopeFolderId || '']?.[category]))
      .map(({ bookmark }) => bookmark.id);

    const categoriesArr = [];
    for (const [sid, map] of Object.entries(categoryFoldersByScope)) {
      for (const [name, folder] of Object.entries(map)) {
        const bookmarkIds = (plan.details || [])
          .filter(d => (d.scopeFolderId || '') === sid && d.category === name)
          .map(d => d.bookmark.id);
        categoriesArr.push({
          id: folder.id,
          name,
          bookmarkIds,
          keywords: [],
          createdAt: new Date().toISOString()
        });
      }
    }

    await chrome.storage.local.set({
      organizedBookmarks: organizedBookmarkIds,
      categories: categoriesArr
    });
  } catch (e) {
    console.warn('[organizeByPlan] 写入存储失败，不影响整理结果:', e);
  }

  // 清理源空目录（删除在此次移动中涉及的且已变为空的文件夹）
  try {
    const deleted = await cleanupEmptyFolders([...oldParentCandidates]);
    if (deleted.length > 0) {
      console.log('[organizeByPlan] 已删除空目录:', deleted);
    }
  } catch (e) {
    console.warn('[organizeByPlan] 清理空目录失败:', e);
  }

  return results;
}

// 生成 AI 推理的整理计划（返回与预览一致的结构）
async function organizePlanByAiInference(scopeFolderIds = []) {
  // 读取设置以获取 AI 参数和语言
  const settings = await chrome.storage.sync.get(['enableAI','aiProvider','aiApiKey','aiApiUrl','aiModel','maxTokens','classificationLanguage','aiBatchSize','aiConcurrency']);

  // === AI推理调试日志开始 ===
  console.log('[AI Debug] === AI推理调试开始 ===');
  console.log('[AI Debug] 当前设置:', {
    enableAI: settings.enableAI,
    provider: settings.aiProvider,
    apiUrl: settings.aiApiUrl,
    model: settings.aiModel,
    apiKey: settings.aiApiKey ? `sk-****${settings.aiApiKey.slice(-6)}` : '未设置',
    maxTokens: settings.maxTokens,
    classificationLanguage: settings.classificationLanguage,
    scopeFolderIds: scopeFolderIds
  });
  if (!settings.enableAI) {
    console.error('[AI Debug] AI 未启用');
    throw new Error('AI 未启用');
  }
  if ((String(settings.aiProvider || '').toLowerCase() !== 'ollama') && !settings.aiApiKey) {
    console.error('[AI Debug] AI API Key 未配置');
    throw new Error('AI API Key 未配置');
  }

  // 拉取并扁平化书签
  let bookmarksTrees = [];
  try {
    const ids = Array.isArray(scopeFolderIds) ? scopeFolderIds.map(id => String(id)).filter(Boolean) : [];
    if (ids.length > 0) {
      for (const id of ids) {
        const tree = await chrome.bookmarks.getSubTree(id);
        bookmarksTrees.push({ scopeId: id, tree });
      }
    } else {
      const tree = await chrome.bookmarks.getTree();
      bookmarksTrees.push({ scopeId: '', tree });
    }
  } catch (e) {
    throw new Error('无法读取书签');
  }
  const flatRaw = [];
  for (const { scopeId, tree } of bookmarksTrees) {
    const flat = flattenBookmarks(tree).filter(b => b.url);
    flat.forEach(b => flatRaw.push({ ...b, _originScopeId: scopeId }));
  }

  // 调试日志：书签处理
  console.log('[AI Debug] 原始书签总数:', flattenBookmarks(bookmarksTrees).length);
  console.log('[AI Debug] 过滤后有URL的书签数量:', flatRaw.length);
  console.log('[AI Debug] 书签样例:', flatRaw.slice(0, 3).map(b => ({ id: b.id, title: b.title || '无标题', url: b.url || '无URL' })));

  const items = flatRaw.map(b => ({ id: b.id, title: b.title || '', url: b.url || '' }));
  const language = settings.classificationLanguage || 'auto';

  // 分批与并发（避免一次请求过大）
  const batchSize = Number(settings.aiBatchSize) > 0 ? Number(settings.aiBatchSize) : 120;
  const concurrency = Number(settings.aiConcurrency) > 0 ? Math.min(Number(settings.aiConcurrency), 5) : 3;
  const chunks = chunkArray(items, batchSize);

  console.log('[AI Debug] 分批设置:', { batchSize, concurrency, chunksCount: chunks.length });

  const tasks = chunks.map((chunk, idx) => async () => {
    console.log(`[AI Debug] 处理批次 ${idx + 1}/${chunks.length}, 书签数量:`, chunk.length);

    const prompt = await buildInferencePrompt({ language, items: chunk });
    console.log(`[AI Debug] 批次 ${idx + 1} 提示词长度:`, prompt.length);
    console.log(`[AI Debug] 批次 ${idx + 1} 提示词预览:`, prompt.substring(0, 200) + '...');

    const aiResult = await requestAIWithRetry({
      provider: settings.aiProvider || 'openai',
      apiUrl: settings.aiApiUrl || '',
      apiKey: settings.aiApiKey,
      model: settings.aiModel || 'gpt-3.5-turbo',
      maxTokens: settings.maxTokens || 8192,
      prompt
    }, { retries: 2, baseDelayMs: 1200, label: `infer-${idx+1}/${chunks.length}` });

    console.log(`[AI Debug] 批次 ${idx + 1} AI原始响应:`, aiResult);
    const parsed = parseAiJsonContent(aiResult);
    console.log(`[AI Debug] 批次 ${idx + 1} 解析结果:`, parsed);

    return parsed;
  });

  const results = await runPromisesWithConcurrency(tasks, concurrency);

  console.log('[AI Debug] 所有批次处理完成，结果数量:', results.length);
  console.log('[AI Debug] 所有批次结果:', results);

  // 合并分类与分配
  const allCategories = new Set();
  const assignments = [];
  const lowIds = new Set();
  for (const r of results) {
    console.log('[AI Debug] 处理单个结果:', r);
    if (!r || !Array.isArray(r.assignments)) {
      console.log('[AI Debug] 跳过无效结果:', r);
      continue;
    }
    if (Array.isArray(r.categories)) {
      r.categories.forEach(c => { if (c && typeof c === 'string') allCategories.add(c); });
    }
    for (const a of r.assignments) {
      if (!a || !a.id || !a.to_key) continue;
      assignments.push(a);
      allCategories.add(a.to_key);
      if (typeof a.confidence === 'number' && a.confidence < 0.5) lowIds.add(a.id);
    }
    const lows = (r.notes && Array.isArray(r.notes.low_confidence_items)) ? r.notes.low_confidence_items : [];
    lows.forEach(id => lowIds.add(id));
  }

  console.log('[AI Debug] 合并后统计:', {
    totalAssignments: assignments.length,
    categoriesCount: allCategories.size,
    lowConfidenceCount: lowIds.size,
    allCategories: Array.from(allCategories)
  });

  if (assignments.length === 0 || allCategories.size === 0) {
    console.error('[AI Debug] AI推理结果为空或无有效分类');
    console.error('[AI Debug] 详细状态:', {
      assignmentsLength: assignments.length,
      categoriesSize: allCategories.size,
      resultsLength: results.length,
      hasValidResults: results.some(r => r && Array.isArray(r.assignments))
    });
    throw new Error('AI 推理结果为空或无有效分类');
  }

  // 构建计划结构
  const plan = { total: flatRaw.length, classified: 0, categories: {}, details: [] };
  // 先为推理出的类别建占位
  for (const name of allCategories) {
    plan.categories[name] = { count: 0, bookmarks: [] };
  }

  const idToBookmark = new Map(flatRaw.map(b => [b.id, b]));
  for (const a of assignments) {
    const b = idToBookmark.get(a.id);
    if (!b) continue;
    const isLow = lowIds.has(a.id);
    const target = isLow ? '其他' : a.to_key;
    if (!plan.categories[target]) plan.categories[target] = { count: 0, bookmarks: [] };
    plan.details.push({ bookmark: b, category: target, scopeFolderId: b._originScopeId || '' });
    plan.categories[target].count++;
    plan.categories[target].bookmarks.push(b);
  }
  // 对于未出现在 assignments 的书签，归入 “其他”
  const assignedIds = new Set(assignments.map(a => a.id));
  for (const b of flatRaw) {
    if (assignedIds.has(b.id)) continue;
    if (!plan.categories['其他']) plan.categories['其他'] = { count: 0, bookmarks: [] };
    plan.details.push({ bookmark: b, category: '其他', scopeFolderId: b._originScopeId || '' });
    plan.categories['其他'].count++;
    plan.categories['其他'].bookmarks.push(b);
  }

  plan.classified = Object.keys(plan.categories).reduce((sum, k) => sum + (k !== '其他' ? plan.categories[k].count : 0), 0);

  console.log('[AI Debug] 最终计划结果:', {
    total: plan.total,
    classified: plan.classified,
    categoriesCount: Object.keys(plan.categories).length,
    categories: Object.keys(plan.categories),
    detailsCount: plan.details.length
  });

  // 附带元信息，便于前端确认时传递范围
  return { ...plan, meta: { scopeFolderIds: Array.isArray(scopeFolderIds) ? scopeFolderIds : [] } };
}

// 删除指定ID集合中已变为空的书签目录（避开系统目录）
async function cleanupEmptyFolders(folderIds) {
  const protectedIds = new Set(['0', '1', '2', '3']);
  const deleted = [];
  for (const id of (folderIds || [])) {
    try {
      if (!id || protectedIds.has(String(id))) continue;
      const children = await chrome.bookmarks.getChildren(String(id));
      if (Array.isArray(children) && children.length === 0) {
        await chrome.bookmarks.removeTree(String(id));
        deleted.push(String(id));
      }
    } catch (e) {
      // 忽略单个失败，继续其他
      console.warn('[cleanup] 删除空目录失败:', id, e);
    }
  }
  return deleted;
}

// 定期检查备份（每小时检查一次）
setInterval(checkAndBackupBookmarks, 60 * 60 * 1000);
// 定期检查归档（每小时检查一次）
setInterval(checkAndArchiveOldBookmarks, 60 * 60 * 1000);

console.log('TidyMark 后台脚本已加载');
// 注册右键菜单
async function registerContextMenus() {
  try {
    // 先清理旧菜单以避免重复
    if (chrome.contextMenus?.removeAll) {
      await chrome.contextMenus.removeAll();
    }
    const t = (k) => (globalThis.I18n ? globalThis.I18n.t(k) : k);
    chrome.contextMenus.create({
      id: 'tidymark_add_bookmark_page',
      title: t('bg.context.add.page'),
      contexts: ['page']
    });
    chrome.contextMenus.create({
      id: 'tidymark_add_bookmark_link',
      title: t('bg.context.add.link'),
      contexts: ['link']
    });
    chrome.contextMenus.create({
      id: 'tidymark_add_bookmark_selection',
      title: t('bg.context.add.selection'),
      contexts: ['selection']
    });
    console.log('[ContextMenus] 已创建右键菜单');
  } catch (e) {
    console.warn('[ContextMenus] 创建菜单失败', e);
  }
}

// 显示添加成功通知
async function showAddNotification({ title, url, category }) {
  try {
    if (!chrome.notifications) return;
    const iconUrl = chrome.runtime.getURL('icons/icon128.png');
    const message = (globalThis.I18n ? globalThis.I18n.tf('bg.notification.add.message', { category }) : `已添加到「${category}」文件夹`);
    chrome.notifications.create(`tidymark_add_${Date.now()}`, {
      type: 'basic',
      title: (globalThis.I18n ? globalThis.I18n.t('bg.notification.add.title') : 'TidyMark 添加成功'),
      message,
      iconUrl
    });
  } catch (e) {
    console.warn('[Notifications] 显示通知失败', e);
  }
}

// 处理右键菜单点击
chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  try {
    const { classificationRules, classificationLanguage } = await chrome.storage.sync.get(['classificationRules', 'classificationLanguage']);
    const lang = resolveClassificationLanguage(classificationLanguage);
    const rules = classificationRules || getDefaultClassificationRules(lang);

    const targetUrl = info.linkUrl || info.pageUrl || tab?.url || '';
    if (!targetUrl) return;
    const rawTitle = info.selectionText || info.linkText || tab?.title || targetUrl;
    // 标题长度限制，避免过长
    const title = String(rawTitle || targetUrl).slice(0, 255);

    // 创建在书签栏（parentId: '1'）
    let created;
    try {
      created = await chrome.bookmarks.create({ title, url: targetUrl, parentId: '1' });
    } catch (e) {
      console.warn('[ContextMenus] 创建书签失败，尝试查重后分类:', e);
      const dup = (await chrome.bookmarks.search({ url: targetUrl }))?.find(b => b.url === targetUrl);
      if (!dup) throw e;
      created = dup;
    }

    // 分类并移动
    const otherName = translateCategoryName('其他', lang);
    const category = classifyBookmark({ title, url: targetUrl }, rules) || otherName;
    const folder = await findOrCreateFolder(category);
    if (created && folder && String(created.parentId) !== String(folder.id)) {
      await chrome.bookmarks.move(created.id, { parentId: folder.id });
    }
    console.log(`[ContextMenus] 已添加并分类到 "${category}"`, { title, url: targetUrl });
  } catch (e) {
    console.warn('[ContextMenus] 处理失败:', e);
  }
});

// 通用云同步处理函数
async function handleSyncCloudBackup(payload, sendResponse) {
  try {
    console.log('[CloudSync] 开始云同步:', payload);

    const { provider, config } = payload;
    if (!provider || !config) {
      throw new Error('缺少必要的同步参数');
    }

    // 统一 provider 映射，兼容别名
    const normalizedProvider = (String(provider).trim().toLowerCase() === 'gdrive') ? 'googledrive' : String(provider).trim().toLowerCase();

    // 使用通用云同步服务
    const cloudSyncService = globalThis.CloudSyncService;
    if (!cloudSyncService) {
      throw new Error('云同步服务未初始化');
    }

    // 构建书签备份数据
    await createBookmarkBackup();
    const { lastBackup } = await chrome.storage.local.get(['lastBackup']);
    const backup = lastBackup;
    if (!backup || !backup.bookmarks) {
      throw new Error('无法获取书签备份数据');
    }

    const result = await cloudSyncService.syncBackup(normalizedProvider, config, backup);

    sendResponse({
      success: result.success,
      message: result.success ? '同步成功' : (result.error || '同步失败'),
      data: result
    });
  } catch (error) {
    console.error('[CloudSync] 同步失败:', error);
    sendResponse({
      success: false,
      error: error.message || '同步失败'
    });
  }
}

// 测试云连接处理函数
async function handleTestCloudConnection(payload, sendResponse) {
  try {
    console.log('[CloudSync] 测试连接:', payload);

    const { provider, config } = payload;
    if (!provider || !config) {
      throw new Error('缺少必要的连接参数');
    }

    // 统一 provider 映射，兼容别名
    const normalizedProvider = (String(provider).trim().toLowerCase() === 'gdrive') ? 'googledrive' : String(provider).trim().toLowerCase();

    // 使用通用云同步服务
    const cloudSyncService = globalThis.CloudSyncService;
    if (!cloudSyncService) {
      throw new Error('云同步服务未初始化');
    }

    const result = await cloudSyncService.testConnection(normalizedProvider, config);

    sendResponse({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('[CloudSync] 连接测试失败:', error);
    sendResponse({
      success: false,
      error: error.message || '连接测试失败'
    });
  }
}