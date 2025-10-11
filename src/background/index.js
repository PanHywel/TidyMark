// background.js - 后台脚本

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
});

// 扩展启动时的初始化
chrome.runtime.onStartup.addListener(async () => {
  console.log('TidyMark 扩展已启动');
  await checkAndBackupBookmarks();
});

// 初始化扩展
async function initializeExtension() {
  try {
    // 设置默认配置
  const defaultSettings = {
      autoBackup: true,
      backupPath: '',
      autoClassify: true,
      classificationRules: getDefaultClassificationRules(),
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

    // 初始化本地存储的默认搜索引擎（仅首次安装且未设置时）
    try {
      const { searchEngine } = await chrome.storage.local.get(['searchEngine']);
      if (searchEngine === undefined) {
        await chrome.storage.local.set({ searchEngine: 'bing' });
        console.log('默认搜索引擎已初始化: bing');
      }
    } catch (e) {
      console.warn('初始化默认搜索引擎失败', e);
    }

    // 创建初始备份
    await createBookmarkBackup();
    
    console.log('扩展初始化完成');
  } catch (error) {
    console.error('扩展初始化失败:', error);
  }
}

// 获取默认分类规则
function getDefaultClassificationRules() {
  return [
    { category: '开源与代码托管', keywords: ['github', 'gitlab', 'gitee', 'bitbucket', 'source code', 'repository', 'repo'] },
    { category: '开发文档与API', keywords: ['docs', 'documentation', 'api', 'sdk', 'developer', 'developers', 'reference', '文档', '接口'] },
    { category: '前端框架', keywords: ['react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt', 'vite', 'webpack', 'babel', 'preact', 'solidjs', 'ember'] },
    { category: '后端框架', keywords: ['spring', 'springboot', 'django', 'flask', 'fastapi', 'express', 'koa', 'rails', 'laravel', 'nestjs', 'micronaut', 'quarkus', 'fastify', 'hapi', 'gin', 'asp.net', 'dotnet', 'phoenix'] },
    { category: '云服务与DevOps', keywords: ['aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'k8s', 'docker', 'ci', 'cd', 'devops', 'terraform', 'cloudflare', 'vercel', 'netlify', 'digitalocean', 'heroku', 'render', 'linode', 'railway'] },
    { category: '数据库与数据', keywords: ['mysql', 'postgres', 'mongodb', 'redis', 'sqlite', 'elasticsearch', 'clickhouse', 'snowflake', 'data', '数据库', 'mariadb', 'oracle', 'sql server', 'mssql', 'dynamodb', 'bigquery', 'firestore', 'cassandra'] },
    { category: 'AI与机器学习', keywords: ['ai', 'ml', 'deep learning', 'nn', 'transformer', 'openai', 'huggingface', 'stable diffusion', 'llm', '机器学习', 'midjourney', 'dalle', 'runway', 'colab', 'tensorflow', 'pytorch', 'sklearn', 'xgboost'] },
    { category: '产品设计', keywords: ['product', 'ux', 'ui', 'prototype', '设计', '交互', '体验'] },
    { category: '设计资源与素材', keywords: ['dribbble', 'behance', 'figma', 'psd', 'svg', 'icon', 'font', '素材', '配色', 'icons8', 'fontawesome', 'material icons', 'coolors', 'colorhunt'] },
    { category: '学习教程与课程', keywords: ['course', '教程', 'tutorial', 'learn', '学习', 'class', 'lesson', 'udemy', 'coursera', 'edx', 'pluralsight', 'codecademy', 'freecodecamp'] },
    { category: '技术博客与社区', keywords: ['blog', '博客', 'medium', 'dev.to', 'reddit', '讨论', 'community', '论坛', 'hashnode'] },
    { category: '新闻资讯与媒体', keywords: ['news', '资讯', 'headline', '媒体', 'press', 'newsletter', 'cnn', 'bbc', 'reuters', 'nytimes', 'theverge', 'wired', 'techcrunch', 'hacker news'] },
    { category: '在线工具与服务', keywords: ['tool', '工具', 'software', 'app', '应用', 'utility', 'converter', 'online', 'remove.bg', 'smallpdf', 'ilovepdf', 'convertio', 'tinypng', 'tinyurl'] },
    { category: '下载与资源', keywords: ['download', '下载', '镜像', '资源', 'release', 'release notes', 'npmjs', 'pypi', 'maven', 'rubygems', 'crates.io', 'chocolatey'] },
    { category: '视频与音乐', keywords: ['youtube', 'bilibili', 'netflix', 'spotify', 'video', '音乐', '音频', '影视', 'vimeo', 'soundcloud', 'apple music', 'deezer', 'qq音乐', '网易云音乐', 'youku', 'iqiyi', '腾讯视频'] },
    { category: '游戏与娱乐', keywords: ['game', 'gaming', 'steam', 'xbox', 'ps5', '游戏', '娱乐', 'epic', 'uplay', 'origin', 'battlenet', 'psn', 'nintendo'] },
    { category: '购物电商', keywords: ['shop', '购物', 'buy', '购买', 'store', '商店', 'mall', '商城', 'taobao', 'jd', 'amazon', 'aliexpress', 'etsy', 'ebay', 'shopify', 'xiaomi', 'apple store'] },
    { category: '社交媒体', keywords: ['twitter', 'x.com', 'facebook', 'instagram', 'tiktok', 'linkedin', '社交', '分享', '社区', 'wechat', 'weibo', 'discord', 'telegram', 'whatsapp', 'line', 'kakao', 'quora'] },
    { category: '办公与协作', keywords: ['notion', 'confluence', 'slack', 'teams', 'jira', 'office', '文档', '协作', 'drive', 'google drive', 'dropbox', 'onedrive', 'monday', 'miro'] },
    { category: '笔记与知识库', keywords: ['obsidian', 'evernote', 'note', 'wiki', '知识库'] },
    { category: '项目与任务管理', keywords: ['asana', 'trello', 'todoist', 'clickup', 'kanban', '项目管理', '任务'] },
    { category: '地图与导航', keywords: ['google maps', 'maps', 'gaode', '高德', 'baidu map', '百度地图', 'openstreetmap', 'osm', '导航'] },
    { category: '博客平台与CMS', keywords: ['wordpress', 'ghost', 'blogger', 'cms', '内容管理'] },
    { category: '数据科学与分析', keywords: ['kaggle', 'jupyter', 'databricks', 'data science', '数据科学'] },
    { category: 'API测试与开发', keywords: ['postman', 'insomnia', 'swagger', 'openapi', 'api 测试'] },
    { category: '邮件与通讯', keywords: ['gmail', 'outlook', 'mail', '邮箱', 'imap', 'smtp', 'message', 'chat', 'protonmail', 'fastmail', 'zoho mail', 'mailchimp', 'sendgrid'] },
    { category: '求职与招聘', keywords: ['jobs', '招聘', '求职', 'career', 'hr', '猎头', '简历', 'indeed', 'glassdoor', 'lever', 'greenhouse', '拉勾', 'boss直聘', '前程无忧'] },
    { category: '金融与理财', keywords: ['bank', 'finance', '投资', '基金', '股票', 'trading', 'crypto', '区块链', 'paypal', 'stripe', 'alipay', 'wechat pay', 'wise'] },
    { category: '生活服务', keywords: ['生活', '服务', '家政', '外卖', '出行', '住宿', '旅游', 'uber', 'didi', '美团', '饿了么', 'airbnb', 'booking', 'trip', 'expedia'] },
    { category: '阅读与电子书', keywords: ['read', '阅读', '电子书', 'epub', 'pdf', 'kindle', 'goodreads', 'gutenberg', 'scribd'] },
    { category: '科研与论文', keywords: ['arxiv', '论文', 'research', '科研', 'paper', 'citation', 'nature', 'science', 'springer', 'ieee', 'acm', 'doi', 'researchgate'] },
    { category: '浏览器与扩展', keywords: ['extension', '插件', 'chrome web store', 'edge add-ons', '浏览器', 'addons.mozilla.org', 'opera addons', 'chrome.google.com'] },
    { category: '摄影与照片', keywords: ['photography', 'photo', '照片', '摄影', 'camera', '拍照', '拍摄', 'photrio', 'fredmiranda'] },
    { category: '图片处理与修图', keywords: ['lightroom', 'photoshop', 'capture one', '修图', '编辑', 'raw', '后期', '色彩', 'darktable', 'affinity photo', 'gimp', 'luminar'] },
    { category: '器材与评测', keywords: ['dslr', 'mirrorless', '微单', '单反', '镜头', 'lens', '评测', 'review', '光圈', '焦距', 'dxomark', 'cameralabs', 'the-digital-picture'] },
    { category: '图片托管与分享', keywords: ['flickr', '500px', 'unsplash', 'pixabay', 'pexels', '图库', 'portfolio', '作品集', '图床', 'smugmug', 'zenfolio', 'imgur', 'pixiv'] },
    { category: '摄影品牌与官网', keywords: ['canon', 'nikon', 'sonyalpha', 'fujifilm', 'leica', 'sigma', 'tamron', '富士', '徕卡'] },
    { category: '器材评测与资讯', keywords: ['dpreview', 'petapixel', 'fstoppers', '评测', '测评', '评估'] },
    { category: '版权素材与购买', keywords: ['getty', 'gettyimages', 'shutterstock', 'adobe stock', 'istock', 'pond5', '版权', '素材购买'] },
    { category: '摄影教程与灵感', keywords: ['教程', 'tips', 'composition', '构图', '布光', '灵感', 'inspiration', 'kelbyone', 'phlearn', 'magnum photos'] }
  ];
}

// 监听来自popup和options页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);

  switch (request.action) {
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
      handleAutoClassify(sendResponse, { dryRun: true });
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
    default:
      sendResponse({ success: false, error: '未知操作' });
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

// 自动分类书签
async function autoClassifyBookmarks(options = {}) {
  try {
    const { dryRun = false } = options;
    // 获取分类规则
    let rules;
    try {
      const { classificationRules } = await chrome.storage.sync.get('classificationRules');
      rules = classificationRules || getDefaultClassificationRules();
      console.log('[autoClassify] 规则加载完成:', Array.isArray(rules) ? rules.length : 0);
    } catch (e) {
      console.warn('[autoClassify] 规则加载失败，使用默认规则:', e);
      rules = getDefaultClassificationRules();
    }

    // 获取所有书签
    let bookmarks;
    try {
      bookmarks = await chrome.bookmarks.getTree();
      console.log('[autoClassify] 获取书签树成功');
    } catch (e) {
      console.error('[autoClassify] 获取书签树失败:', e);
      throw new Error('无法读取书签，请检查权限');
    }
    const flatBookmarks = flattenBookmarks(bookmarks);
    console.log('[autoClassify] 扁平化书签数量:', flatBookmarks.length);

    // 构建预览分类结果
    const preview = {
      total: flatBookmarks.length,
      classified: 0,
      categories: {}, // { [category]: { count, bookmarks: [] } }
      details: []
    };

    for (const bookmark of flatBookmarks) {
      if (!bookmark.url) continue; // 跳过文件夹
      const category = classifyBookmark(bookmark, rules) || '其他';
      preview.details.push({ bookmark, category });
      if (!preview.categories[category]) {
        preview.categories[category] = { count: 0, bookmarks: [] };
      }
      preview.categories[category].count++;
      preview.categories[category].bookmarks.push(bookmark);
      if (category !== '其他') preview.classified++;
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
    const categoryFolders = {};

    // 只有当存在未分类书签时才创建"其他"文件夹
    const otherCount = preview.categories['其他']?.count || 0;
    let otherFolder = null;
    if (otherCount > 0) {
      otherFolder = await findOrCreateFolder('其他');
      categoryFolders['其他'] = otherFolder;
    }

    for (const [category, data] of Object.entries(preview.categories)) {
      if (category === '其他') continue;
      if (!data || data.count === 0) continue;
      const folder = await findOrCreateFolder(category);
      categoryFolders[category] = folder;
    }

  // 移动书签到对应文件夹
  let moved = 0;
  const oldParentCandidates = new Set();
  for (const { bookmark, category } of preview.details) {
    const targetFolder = categoryFolders[category];
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
        .filter(({ category }) => Boolean(categoryFolders[category]))
        .map(({ bookmark }) => bookmark.id);

      const categoriesArr = Object.entries(categoryFolders).map(([name, folder]) => {
        const bookmarkIds = preview.details
          .filter(d => d.category === name)
          .map(d => d.bookmark.id);
        return {
          id: folder.id,
          name,
          bookmarkIds,
          keywords: [],
          createdAt: new Date().toISOString()
        };
      });

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

// 查找或创建文件夹
async function findOrCreateFolder(name) {
  try {
    // 搜索现有文件夹
    const results = await chrome.bookmarks.search(name);
    // 仅匹配标题为该名称的文件夹
    const folder = results.find(item => !item.url && item.title === name);
    
    if (folder) {
      return folder;
    }

    // 创建新文件夹
    const newFolder = await chrome.bookmarks.create({
      title: name,
      parentId: '1' // 书签栏
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
    const { aiProvider, aiApiKey, aiApiUrl } = await chrome.storage.sync.get(['aiProvider', 'aiApiKey', 'aiApiUrl']);
    
    if (!aiApiKey) {
      throw new Error('AI API Key 未配置');
    }

    // 这里应该实现实际的AI API调用
    // 由于这是示例代码，我们返回模拟结果
    const mockResults = bookmarks.map(bookmark => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      suggestedCategory: classifyBookmark(bookmark, getDefaultClassificationRules()),
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
  candidate = candidate.replace(/^```[a-zA-Z]*\s*/,'').replace(/```$/,'').trim();

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
  const settings = await chrome.storage.sync.get(['enableAI','aiProvider','aiApiKey','aiApiUrl','aiModel','maxTokens','classificationLanguage','maxCategories','aiBatchSize','aiConcurrency']);
  if (!settings.enableAI) {
    return preview;
  }
  if (!settings.aiApiKey) {
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
    const prompt = buildOptimizationPrompt({ language, categories, items: chunk });
    const aiResult = await requestAIWithRetry({
      provider: settings.aiProvider || 'openai',
      apiUrl: settings.aiApiUrl || '',
      apiKey: settings.aiApiKey,
      model: settings.aiModel || 'gpt-3.5-turbo',
      maxTokens: settings.maxTokens || 8192,
      prompt
    }, { retries: 2, baseDelayMs: 1200, label: `batch-${idx+1}/${chunks.length}` });
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
  newPreview.classified = Object.keys(newPreview.categories).reduce((sum, k) => sum + (k !== '其他' ? newPreview.categories[k].count : 0), 0);
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
      console.warn(`[AI] 请求失败${label ? ' ['+label+']' : ''}，${isRateLimit ? '速率限制' : '错误'}，${delay}ms 后重试 (第 ${attempt+1}/${retries} 次)`);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}

// 构建AI提示词（隐藏在代码中）
function buildOptimizationPrompt({ language, categories, items }) {
  const cats = Array.isArray(categories) ? categories : [];
  const its = Array.isArray(items) ? items : [];
  const categoriesJson = JSON.stringify(cats, null, 2);
  const itemsJson = JSON.stringify(its, null, 2);
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

// 调用AI服务
async function requestAI({ provider, apiUrl, apiKey, model, maxTokens, prompt }) {
  // 屏蔽不兼容的「reasoner」思考型模型（返回格式不符合本扩展期望）
  try {
    const m = String(model || '').toLowerCase();
    if (m.includes('reasoner')) {
      throw new Error('当前选择的模型暂不支持该扩展的返回格式，请切换到标准对话模型（如 deepseek-chat、gpt-3.5-turbo、gpt-4 等）。');
    }
  } catch (_) {}
  // 目前支持 OpenAI 兼容接口；如提供了自定义 apiUrl 则使用之
  const url = apiUrl && apiUrl.trim().length > 0 ? apiUrl : 'https://api.openai.com/v1/chat/completions';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
  const body = {
    model,
    max_tokens: maxTokens || 8192,
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'You are a rigorous assistant that only returns strict JSON.' },
      { role: 'user', content: prompt }
    ]
  };

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI请求失败: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  // 提取content作为字符串JSON
  try {
    const content = data.choices?.[0]?.message?.content;
    return content || '';
  } catch (e) {
    throw new Error('AI响应解析失败');
  }
}

// 根据AI预览计划执行移动
async function organizeByPlan(plan) {
  // 计划格式直接复用预览结构：{ total, classified, categories: { name: {count, bookmarks[]} }, details }
  // 创建需要的文件夹
  const categoryFolders = {};
  const otherCount = plan.categories['其他']?.count || 0;
  let otherFolder = null;
  if (otherCount > 0) {
    otherFolder = await findOrCreateFolder('其他');
    categoryFolders['其他'] = otherFolder;
  }
  for (const [category, data] of Object.entries(plan.categories)) {
    if (category === '其他') continue;
    if (!data || data.count === 0) continue;
    const folder = await findOrCreateFolder(category);
    categoryFolders[category] = folder;
  }

  // 执行移动
  let moved = 0;
  const oldParentCandidates = new Set();
  for (const { bookmark, category } of plan.details) {
    const targetFolder = categoryFolders[category];
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
    const organizedBookmarkIds = plan.details
      .filter(({ category }) => Boolean(categoryFolders[category]))
      .map(({ bookmark }) => bookmark.id);

    const categoriesArr = Object.entries(categoryFolders).map(([name, folder]) => {
      const bookmarkIds = plan.details
        .filter(d => d.category === name)
        .map(d => d.bookmark.id);
      return {
        id: folder.id,
        name,
        bookmarkIds,
        keywords: [],
        createdAt: new Date().toISOString()
      };
    });

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

console.log('TidyMark 后台脚本已加载');