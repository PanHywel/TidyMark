// bookmarkService.js - 书签管理服务

class BookmarkService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
  }

  // 获取所有书签
  async getAllBookmarks() {
    const cacheKey = 'all_bookmarks';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const bookmarks = await chrome.bookmarks.getTree();
      this.cache.set(cacheKey, {
        data: bookmarks,
        timestamp: Date.now()
      });
      return bookmarks;
    } catch (error) {
      console.error('获取书签失败:', error);
      throw new Error('无法获取书签数据');
    }
  }

  // 扁平化书签树
  flattenBookmarks(bookmarkTree) {
    const result = [];
    
    function traverse(nodes, parentPath = '') {
      for (const node of nodes) {
        if (node.url) {
          // 这是一个书签
          result.push({
            ...node,
            parentPath: parentPath,
            type: 'bookmark'
          });
        } else if (node.children) {
          // 这是一个文件夹
          const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
          result.push({
            ...node,
            parentPath: parentPath,
            type: 'folder',
            path: currentPath
          });
          traverse(node.children, currentPath);
        }
      }
    }
    
    traverse(bookmarkTree);
    return result;
  }

  // 获取扁平化的书签列表
  async getFlatBookmarks() {
    const bookmarks = await this.getAllBookmarks();
    return this.flattenBookmarks(bookmarks);
  }

  // 按分类获取书签
  async getBookmarksByCategory() {
    const flatBookmarks = await this.getFlatBookmarks();
    const categories = {};
    
    for (const bookmark of flatBookmarks) {
      if (bookmark.type === 'bookmark') {
        const category = bookmark.parentPath || '未分类';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(bookmark);
      }
    }
    
    return categories;
  }

  // 搜索书签
  async searchBookmarks(query, options = {}) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const results = await chrome.bookmarks.search(query);
      let bookmarks = results.filter(item => item.url); // 只返回书签，不包括文件夹

      // 应用过滤选项
      if (options.category) {
        const flatBookmarks = await this.getFlatBookmarks();
        const categoryBookmarks = flatBookmarks.filter(b => 
          b.type === 'bookmark' && b.parentPath === options.category
        );
        const categoryIds = new Set(categoryBookmarks.map(b => b.id));
        bookmarks = bookmarks.filter(b => categoryIds.has(b.id));
      }

      // 按相关性排序
      bookmarks.sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, query);
        const bScore = this.calculateRelevanceScore(b, query);
        return bScore - aScore;
      });

      return bookmarks.slice(0, options.limit || 50);
    } catch (error) {
      console.error('搜索书签失败:', error);
      throw new Error('搜索失败');
    }
  }

  // 计算相关性分数
  calculateRelevanceScore(bookmark, query) {
    const queryLower = query.toLowerCase();
    const title = bookmark.title.toLowerCase();
    const url = bookmark.url.toLowerCase();
    
    let score = 0;
    
    // 标题完全匹配
    if (title === queryLower) score += 100;
    // 标题开头匹配
    else if (title.startsWith(queryLower)) score += 50;
    // 标题包含
    else if (title.includes(queryLower)) score += 25;
    
    // URL匹配
    if (url.includes(queryLower)) score += 10;
    
    return score;
  }

  // 创建书签
  async createBookmark(bookmark) {
    try {
      const newBookmark = await chrome.bookmarks.create({
        title: bookmark.title,
        url: bookmark.url,
        parentId: bookmark.parentId || '1' // 默认添加到书签栏
      });
      
      this.clearCache();
      return newBookmark;
    } catch (error) {
      console.error('创建书签失败:', error);
      throw new Error('无法创建书签');
    }
  }

  // 更新书签
  async updateBookmark(id, updates) {
    try {
      const updatedBookmark = await chrome.bookmarks.update(id, updates);
      this.clearCache();
      return updatedBookmark;
    } catch (error) {
      console.error('更新书签失败:', error);
      throw new Error('无法更新书签');
    }
  }

  // 删除书签
  async deleteBookmark(id) {
    try {
      await chrome.bookmarks.remove(id);
      this.clearCache();
      return true;
    } catch (error) {
      console.error('删除书签失败:', error);
      throw new Error('无法删除书签');
    }
  }

  // 移动书签
  async moveBookmark(id, destination) {
    try {
      const movedBookmark = await chrome.bookmarks.move(id, destination);
      this.clearCache();
      return movedBookmark;
    } catch (error) {
      console.error('移动书签失败:', error);
      throw new Error('无法移动书签');
    }
  }

  // 批量移动书签
  async moveBookmarks(bookmarkIds, parentId) {
    try {
      const results = [];
      for (const id of bookmarkIds) {
        const result = await chrome.bookmarks.move(id, { parentId });
        results.push(result);
      }
      this.clearCache();
      return results;
    } catch (error) {
      console.error('批量移动书签失败:', error);
      throw new Error('无法批量移动书签');
    }
  }

  // 创建文件夹
  async createFolder(title, parentId = '1') {
    try {
      const folder = await chrome.bookmarks.create({
        title: title,
        parentId: parentId
      });
      this.clearCache();
      return folder;
    } catch (error) {
      console.error('创建文件夹失败:', error);
      throw new Error('无法创建文件夹');
    }
  }

  // 查找文件夹
  async findFolder(title) {
    try {
      const results = await chrome.bookmarks.search({ title });
      return results.find(item => !item.url); // 文件夹没有URL
    } catch (error) {
      console.error('查找文件夹失败:', error);
      return null;
    }
  }

  // 查找或创建文件夹
  async findOrCreateFolder(title, parentId = '1') {
    let folder = await this.findFolder(title);
    if (!folder) {
      folder = await this.createFolder(title, parentId);
    }
    return folder;
  }

  // 获取书签统计信息
  async getBookmarkStats() {
    try {
      const flatBookmarks = await this.getFlatBookmarks();
      const bookmarks = flatBookmarks.filter(item => item.type === 'bookmark');
      const folders = flatBookmarks.filter(item => item.type === 'folder');
      
      // 按文件夹统计书签数量
      const folderStats = {};
      for (const bookmark of bookmarks) {
        const category = bookmark.parentPath || '未分类';
        folderStats[category] = (folderStats[category] || 0) + 1;
      }

      // 最近添加的书签（如果有dateAdded字段）
      const recentBookmarks = bookmarks
        .filter(b => b.dateAdded)
        .sort((a, b) => b.dateAdded - a.dateAdded)
        .slice(0, 10);

      return {
        totalBookmarks: bookmarks.length,
        totalFolders: folders.length,
        folderStats: folderStats,
        recentBookmarks: recentBookmarks,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw new Error('无法获取统计信息');
    }
  }

  // 导出书签
  async exportBookmarks(format = 'json') {
    try {
      const bookmarks = await this.getAllBookmarks();
      const stats = await this.getBookmarkStats();
      
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        bookmarks: bookmarks,
        stats: stats,
        metadata: {
          exportFormat: format,
          extensionVersion: chrome.runtime.getManifest().version
        }
      };

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else if (format === 'html') {
        return this.convertToHtml(bookmarks);
      }
      
      return exportData;
    } catch (error) {
      console.error('导出书签失败:', error);
      throw new Error('无法导出书签');
    }
  }

  // 转换为HTML格式
  convertToHtml(bookmarks) {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

    function traverse(nodes, level = 0) {
      for (const node of nodes) {
        if (node.url) {
          html += `${'  '.repeat(level)}<DT><A HREF="${node.url}">${node.title}</A>\n`;
        } else if (node.children) {
          html += `${'  '.repeat(level)}<DT><H3>${node.title}</H3>\n`;
          html += `${'  '.repeat(level)}<DL><p>\n`;
          traverse(node.children, level + 1);
          html += `${'  '.repeat(level)}</DL><p>\n`;
        }
      }
    }

    traverse(bookmarks);
    html += '</DL><p>';
    return html;
  }

  // 清除缓存
  clearCache() {
    this.cache.clear();
  }

  // 验证书签URL
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // 获取网站图标
  getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}`;
    } catch {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>';
    }
  }

  // 分析书签URL模式
  analyzeUrlPatterns() {
    return this.getFlatBookmarks().then(bookmarks => {
      const domains = {};
      const protocols = {};
      
      bookmarks
        .filter(b => b.type === 'bookmark' && b.url)
        .forEach(bookmark => {
          try {
            const url = new URL(bookmark.url);
            
            // 统计域名
            domains[url.hostname] = (domains[url.hostname] || 0) + 1;
            
            // 统计协议
            protocols[url.protocol] = (protocols[url.protocol] || 0) + 1;
          } catch (error) {
            // 忽略无效URL
          }
        });

      return {
        domains: Object.entries(domains)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20), // 前20个域名
        protocols: protocols
      };
    });
  }
}

// 导出单例实例
const bookmarkService = new BookmarkService();
export default bookmarkService;