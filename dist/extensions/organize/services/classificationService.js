// classificationService.js - 书签分类服务

class ClassificationService {
  constructor() {
    this.defaultRules = this.getDefaultRules();
  }

  // 获取默认分类规则
  getDefaultRules() {
    const tCat = (key, fallback) => {
      try {
        return (window.I18n && window.I18n.translateCategory) ? window.I18n.translateCategory(key) : fallback;
      } catch {
        return fallback;
      }
    };
    return [
      {
        id: 'dev-tools',
        category: tCat('dev-tools', '开发工具'),
        keywords: ['github', 'gitlab', 'stackoverflow', 'docs', 'documentation', 'api', 'dev', 'developer', 'code', 'programming'],
        urlPatterns: ['github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org'],
        priority: 10
      },
      {
        id: 'news',
        category: tCat('news', '新闻资讯'),
        keywords: ['news', '新闻', 'blog', '博客', 'medium', 'zhihu', '知乎', 'article', '文章'],
        urlPatterns: ['news.', 'blog.', 'medium.com', 'zhihu.com'],
        priority: 8
      },
      {
        id: 'education',
        category: tCat('education', '学习教育'),
        keywords: ['course', '课程', 'tutorial', '教程', 'learn', '学习', 'education', '教育', 'university', '大学'],
        urlPatterns: ['edu', 'coursera.com', 'udemy.com', 'khan'],
        priority: 9
      },
      {
        id: 'tools',
        category: tCat('tools', '工具软件'),
        keywords: ['tool', '工具', 'software', '软件', 'app', '应用', 'utility', 'converter', '转换'],
        urlPatterns: ['tool', 'app.', 'software'],
        priority: 7
      },
      {
        id: 'entertainment',
        category: tCat('entertainment', '娱乐休闲'),
        keywords: ['video', '视频', 'music', '音乐', 'game', '游戏', 'entertainment', '娱乐', 'movie', '电影'],
        urlPatterns: ['youtube.com', 'bilibili.com', 'netflix.com', 'spotify.com'],
        priority: 6
      },
      {
        id: 'shopping',
        category: '购物',
        keywords: ['shop', '购物', 'buy', '购买', 'store', '商店', 'mall', '商城', 'taobao', 'amazon', 'price', '价格'],
        urlPatterns: ['shop', 'store', 'mall', 'taobao.com', 'amazon.com', 'jd.com'],
        priority: 5
      },
      {
        id: 'social',
        category: '社交媒体',
        keywords: ['social', '社交', 'chat', '聊天', 'forum', '论坛', 'community', '社区', 'wechat', 'weibo'],
        urlPatterns: ['twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'weibo.com', 'weixin.qq.com'],
        priority: 4
      },
      {
        id: 'finance',
        category: '金融理财',
        keywords: ['bank', '银行', 'finance', '金融', 'investment', '投资', 'stock', '股票', 'crypto', '加密货币'],
        urlPatterns: ['bank', 'finance', 'trading', 'investment', 'binance.com', 'coinbase.com'],
        priority: 6
      }
      ,
      // 摄影与相近场景
      {
        id: 'ai-ml',
        category: 'AI与机器学习',
        keywords: ['ai', 'ml', 'deep learning', 'transformer', 'llm', 'openai', 'huggingface', 'stable diffusion', 'midjourney', 'dalle', 'runway', 'colab'],
        urlPatterns: ['openai.com', 'huggingface.co', 'midjourney.com', 'runwayml.com', 'colab.research.google.com'],
        priority: 9
      },
      {
        id: 'cloud-devops',
        category: tCat('cloud-devops', '云服务与DevOps'),
        keywords: ['cloud', 'devops', 'docker', 'k8s', 'kubernetes', 'ci', 'cd', 'cloudflare', 'vercel', 'netlify'],
        urlPatterns: ['cloudflare.com', 'vercel.com', 'netlify.com'],
        priority: 8
      },
      {
        id: 'notes-knowledge',
        category: tCat('notes-knowledge', '笔记与知识库'),
        keywords: ['obsidian', 'evernote', 'note', 'wiki', '知识库'],
        urlPatterns: ['obsidian.md', 'evernote.com', 'notion.so'],
        priority: 7
      },
      {
        id: 'project-task',
        category: tCat('project-task', '项目与任务管理'),
        keywords: ['asana', 'trello', 'todoist', 'clickup', 'kanban', '项目管理', '任务'],
        urlPatterns: ['asana.com', 'trello.com', 'todoist.com', 'clickup.com'],
        priority: 7
      },
      {
        id: 'maps-navigation',
        category: tCat('maps-navigation', '地图与导航'),
        keywords: ['google maps', 'maps', 'gaode', '高德', 'baidu map', '百度地图', 'openstreetmap', 'osm', '导航'],
        urlPatterns: ['maps.google.com', 'amap.com', 'map.baidu.com', 'openstreetmap.org'],
        priority: 6
      },
      {
        id: 'cms-blog',
        category: tCat('cms-blog', '博客平台与CMS'),
        keywords: ['wordpress', 'ghost', 'blogger', 'cms', '内容管理'],
        urlPatterns: ['wordpress.org', 'ghost.org', 'blogger.com'],
        priority: 6
      },
      {
        id: 'data-science',
        category: tCat('data-science', '数据科学与分析'),
        keywords: ['kaggle', 'jupyter', 'databricks', 'data science', '数据科学'],
        urlPatterns: ['kaggle.com', 'databricks.com', 'colab.research.google.com', 'jupyter.org'],
        priority: 8
      },
      {
        id: 'api-testing',
        category: 'API测试与开发',
        keywords: ['postman', 'insomnia', 'swagger', 'openapi', 'api 测试'],
        urlPatterns: ['postman.com', 'insomnia.rest', 'swagger.io'],
        priority: 8
      },
      {
        id: 'photo-general',
        category: '摄影与照片',
        keywords: ['photography', 'photo', '照片', '摄影', 'camera', '拍照', '拍摄'],
        urlPatterns: ['500px.com', 'flickr.com'],
        priority: 8
      },
      {
        id: 'photo-editing',
        category: '图片处理与修图',
        keywords: ['lightroom', 'photoshop', 'capture one', '修图', '编辑', 'raw', '后期', '色彩'],
        urlPatterns: ['adobe.com', 'lightroom', 'photoshop', 'captureone'],
        priority: 8
      },
      {
        id: 'gear-review',
        category: '器材评测与资讯',
        keywords: ['dpreview', 'petapixel', 'fstoppers', '评测', '测评', '评估'],
        urlPatterns: ['dpreview.com', 'petapixel.com', 'fstoppers.com'],
        priority: 8
      },
      {
        id: 'image-hosting',
        category: '图片托管与分享',
        keywords: ['flickr', '500px', 'unsplash', 'pixabay', 'pexels', '图库', 'portfolio', '作品集', '图床'],
        urlPatterns: ['unsplash.com', 'pixabay.com', 'pexels.com', 'flickr.com', '500px.com'],
        priority: 7
      },
      {
        id: 'stock-images',
        category: '版权素材与购买',
        keywords: ['getty', 'gettyimages', 'shutterstock', 'adobe stock', 'istock', 'pond5', '版权', '素材购买'],
        urlPatterns: ['gettyimages.com', 'shutterstock.com', 'stock.adobe.com', 'istockphoto.com', 'pond5.com'],
        priority: 6
      }
    ];
  }

  // 分类单个书签
  classifyBookmark(bookmark, customRules = []) {
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    
    // 合并自定义规则和默认规则
    const allRules = [...customRules, ...this.defaultRules];
    
    // 按优先级排序
    allRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    for (const rule of allRules) {
      const score = this.calculateMatchScore(bookmark, rule);
      if (score > 0) {
        return {
          category: rule.category,
          rule: rule,
          score: score,
          confidence: this.calculateConfidence(score)
        };
      }
    }
    
    return {
      category: '其他',
      rule: null,
      score: 0,
      confidence: 0
    };
  }

  // 计算匹配分数
  calculateMatchScore(bookmark, rule) {
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    let score = 0;

    // 检查关键词匹配
    for (const keyword of rule.keywords || []) {
      const keywordLower = keyword.toLowerCase();
      
      // 标题匹配
      if (title.includes(keywordLower)) {
        score += title === keywordLower ? 20 : 10; // 完全匹配得分更高
      }
      
      // URL匹配
      if (url.includes(keywordLower)) {
        score += 5;
      }
    }

    // 检查URL模式匹配
    for (const pattern of rule.urlPatterns || []) {
      if (url.includes(pattern.toLowerCase())) {
        score += 15;
      }
    }

    return score;
  }

  // 计算置信度
  calculateConfidence(score) {
    if (score >= 20) return 0.9;
    if (score >= 15) return 0.8;
    if (score >= 10) return 0.7;
    if (score >= 5) return 0.6;
    return 0.5;
  }

  // 批量分类书签
  async classifyBookmarks(bookmarks, customRules = []) {
    const results = {
      total: bookmarks.length,
      classified: 0,
      categories: {},
      details: []
    };

    for (const bookmark of bookmarks) {
      if (!bookmark.url) continue; // 跳过文件夹

      const classification = this.classifyBookmark(bookmark, customRules);
      
      results.details.push({
        bookmark: bookmark,
        classification: classification
      });

      if (classification.category !== '其他') {
        results.classified++;
      }

      // 统计分类
      const category = classification.category;
      if (!results.categories[category]) {
        results.categories[category] = {
          count: 0,
          bookmarks: []
        };
      }
      results.categories[category].count++;
      results.categories[category].bookmarks.push(bookmark);
    }

    return results;
  }

  // 自动整理书签到文件夹
  async autoOrganizeBookmarks(bookmarks, customRules = [], options = {}) {
    try {
      const {
        createBackup = true,
        dryRun = false,
        targetParentId = '1' // 书签栏
      } = options;

      // 创建备份
      if (createBackup && !dryRun) {
        await this.createBackupBeforeOrganize();
      }

      // 分类书签
      const classificationResult = await this.classifyBookmarks(bookmarks, customRules);
      
      const organizationResult = {
        ...classificationResult,
        moved: 0,
        created: 0,
        folders: {},
        errors: []
      };

      if (dryRun) {
        return organizationResult;
      }

      // 为每个非空分类创建文件夹（跳过空分类）
      for (const [category, data] of Object.entries(classificationResult.categories)) {
        if (!data || data.count === 0) continue;
        try {
          const folder = await this.findOrCreateFolder(category, targetParentId);
          organizationResult.folders[category] = folder;
          organizationResult.created++;
        } catch (error) {
          organizationResult.errors.push({
            type: 'folder_creation',
            category: category,
            error: error.message
          });
        }
      }

      // 移动书签到对应文件夹
      for (const detail of classificationResult.details) {
        const { bookmark, classification } = detail;
        const targetFolder = organizationResult.folders[classification.category];
        
        if (targetFolder && bookmark.parentId !== targetFolder.id) {
          try {
            await chrome.bookmarks.move(bookmark.id, { parentId: targetFolder.id });
            organizationResult.moved++;
          } catch (error) {
            organizationResult.errors.push({
              type: 'bookmark_move',
              bookmark: bookmark,
              error: error.message
            });
          }
        }
      }

      return organizationResult;
    } catch (error) {
      console.error('自动整理书签失败:', error);
      throw new Error('自动整理失败: ' + error.message);
    }
  }

  // 查找或创建文件夹
  async findOrCreateFolder(name, parentId = '1') {
    try {
      // 搜索现有文件夹
      const results = await chrome.bookmarks.search({ title: name });
      const existingFolder = results.find(item => !item.url && item.parentId === parentId);
      
      if (existingFolder) {
        return existingFolder;
      }

      // 创建新文件夹
      const newFolder = await chrome.bookmarks.create({
        title: name,
        parentId: parentId
      });
      
      return newFolder;
    } catch (error) {
      console.error(`创建文件夹 "${name}" 失败:`, error);
      throw error;
    }
  }

  // 创建整理前的备份
  async createBackupBeforeOrganize() {
    try {
      const bookmarks = await chrome.bookmarks.getTree();
      const backupData = {
        timestamp: Date.now(),
        bookmarks: bookmarks,
        type: 'pre_organize'
      };

      await chrome.storage.local.set({
        [`backup_${Date.now()}`]: backupData
      });

      console.log('整理前备份已创建');
    } catch (error) {
      console.error('创建备份失败:', error);
      throw error;
    }
  }

  // 分析书签分布
  async analyzeBookmarkDistribution(bookmarks, customRules = []) {
    const classificationResult = await this.classifyBookmarks(bookmarks, customRules);
    
    const analysis = {
      totalBookmarks: bookmarks.length,
      categorized: classificationResult.classified,
      uncategorized: bookmarks.length - classificationResult.classified,
      categories: {},
      topDomains: {},
      recommendations: []
    };

    // 分析分类分布
    for (const [category, data] of Object.entries(classificationResult.categories)) {
      analysis.categories[category] = {
        count: data.count,
        percentage: (data.count / bookmarks.length * 100).toFixed(1)
      };
    }

    // 分析域名分布
    const domainCounts = {};
    bookmarks.forEach(bookmark => {
      if (bookmark.url) {
        try {
          const domain = new URL(bookmark.url).hostname;
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        } catch (error) {
          // 忽略无效URL
        }
      }
    });

    analysis.topDomains = Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [domain, count]) => {
        obj[domain] = count;
        return obj;
      }, {});

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  // 生成整理建议
  generateRecommendations(analysis) {
    const recommendations = [];

    // 如果未分类书签太多
    if (analysis.uncategorized > analysis.totalBookmarks * 0.3) {
      recommendations.push({
        type: 'high_uncategorized',
        message: '有超过30%的书签未被分类，建议添加更多自定义分类规则',
        priority: 'high'
      });
    }

    // 如果某个域名的书签很多
    for (const [domain, count] of Object.entries(analysis.topDomains)) {
      if (count > 10) {
        recommendations.push({
          type: 'domain_specific',
          message: `${domain} 有 ${count} 个书签，建议为此网站创建专门的分类`,
          priority: 'medium',
          data: { domain, count }
        });
      }
    }

    // 如果某个分类书签太多
    for (const [category, data] of Object.entries(analysis.categories)) {
      if (data.count > 50) {
        recommendations.push({
          type: 'large_category',
          message: `"${category}" 分类有 ${data.count} 个书签，建议进一步细分`,
          priority: 'medium',
          data: { category, count: data.count }
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // 验证分类规则
  validateRule(rule) {
    const errors = [];

    if (!rule.category || rule.category.trim().length === 0) {
      errors.push('分类名称不能为空');
    }

    if (!rule.keywords || !Array.isArray(rule.keywords) || rule.keywords.length === 0) {
      errors.push('至少需要一个关键词');
    }

    if (rule.keywords && rule.keywords.some(keyword => !keyword || keyword.trim().length === 0)) {
      errors.push('关键词不能为空');
    }

    if (rule.priority && (typeof rule.priority !== 'number' || rule.priority < 0 || rule.priority > 10)) {
      errors.push('优先级必须是0-10之间的数字');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // 测试分类规则
  async testRule(rule, sampleBookmarks) {
    const validation = this.validateRule(rule);
    if (!validation.valid) {
      return {
        valid: false,
        errors: validation.errors
      };
    }

    const testResults = {
      valid: true,
      matches: [],
      coverage: 0,
      averageScore: 0
    };

    let totalScore = 0;
    for (const bookmark of sampleBookmarks) {
      const score = this.calculateMatchScore(bookmark, rule);
      if (score > 0) {
        testResults.matches.push({
          bookmark: bookmark,
          score: score,
          confidence: this.calculateConfidence(score)
        });
        totalScore += score;
      }
    }

    testResults.coverage = (testResults.matches.length / sampleBookmarks.length * 100).toFixed(1);
    testResults.averageScore = testResults.matches.length > 0 ? 
      (totalScore / testResults.matches.length).toFixed(1) : 0;

    return testResults;
  }

  // 导出分类规则
  exportRules(rules) {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      rules: rules,
      metadata: {
        totalRules: rules.length,
        exportedBy: 'TidyMark'
      }
    };
  }

  // 导入分类规则
  importRules(data) {
    if (!data.rules || !Array.isArray(data.rules)) {
      throw new Error('无效的规则数据格式');
    }

    const validRules = [];
    const errors = [];

    for (const rule of data.rules) {
      const validation = this.validateRule(rule);
      if (validation.valid) {
        validRules.push({
          ...rule,
          id: rule.id || this.generateRuleId(),
          imported: true,
          importedAt: Date.now()
        });
      } else {
        errors.push({
          rule: rule,
          errors: validation.errors
        });
      }
    }

    return {
      imported: validRules,
      errors: errors,
      total: data.rules.length
    };
  }

  // 生成规则ID
  generateRuleId() {
    return 'rule_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// 导出单例实例
const classificationService = new ClassificationService();
export default classificationService;