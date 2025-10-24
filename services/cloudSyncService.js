/**
 * 通用云同步服务
 * 支持多种云存储提供商：GitHub、WebDAV、Google Drive
 */

class CloudSyncService {
  constructor() {
    this.providers = {
      github: new GitHubSyncProvider(),
      webdav: new WebDAVSyncProvider(),
      googledrive: new GoogleDriveSyncProvider()
    };
  }

  /**
   * 同步备份到指定的云提供商
   * @param {string} provider - 提供商类型 (github/webdav/googledrive)
   * @param {Object} config - 提供商配置
   * @param {Object} data - 要同步的数据
   * @returns {Promise<Object>} 同步结果
   */
  async syncBackup(provider, config, data) {
    const syncProvider = this.providers[provider];
    if (!syncProvider) {
      throw new Error(`不支持的云提供商: ${provider}`);
    }

    try {
      // 验证配置
      await syncProvider.validateConfig(config);
      
      // 执行同步
      const result = await syncProvider.uploadBackup(config, data);
      
      return {
        success: true,
        provider,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        provider,
        error: error.message
      };
    }
  }

  /**
   * 测试连接
   * @param {string} provider - 提供商类型
   * @param {Object} config - 提供商配置
   * @returns {Promise<Object>} 测试结果
   */
  async testConnection(provider, config) {
    const syncProvider = this.providers[provider];
    if (!syncProvider) {
      throw new Error(`不支持的云提供商: ${provider}`);
    }

    try {
      await syncProvider.testConnection(config);
      return { success: true, message: '连接测试成功' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取支持的提供商列表
   * @returns {Array<string>} 提供商列表
   */
  getSupportedProviders() {
    return Object.keys(this.providers);
  }
}

/**
 * 云同步提供商基类
 */
class BaseSyncProvider {
  /**
   * 验证配置
   * @param {Object} config - 配置对象
   * @throws {Error} 配置无效时抛出错误
   */
  async validateConfig(config) {
    throw new Error('子类必须实现 validateConfig 方法');
  }

  /**
   * 测试连接
   * @param {Object} config - 配置对象
   * @throws {Error} 连接失败时抛出错误
   */
  async testConnection(config) {
    throw new Error('子类必须实现 testConnection 方法');
  }

  /**
   * 上传备份
   * @param {Object} config - 配置对象
   * @param {Object} data - 备份数据
   * @returns {Promise<Object>} 上传结果
   */
  async uploadBackup(config, data) {
    throw new Error('子类必须实现 uploadBackup 方法');
  }

  /**
   * Base64 编码工具（兼容中文）
   * @param {string} str - 要编码的字符串
   * @returns {string} Base64 编码结果
   */
  toBase64(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (_) {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      return btoa(binary);
    }
  }

  /**
   * 生成 Chrome 兼容的书签 HTML
   * @param {Array} bookmarkTree - 书签树
   * @returns {string} HTML 字符串
   */
  generateBookmarkHTML(bookmarkTree) {
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
  }
}

/**
 * GitHub 同步提供商
 */
class GitHubSyncProvider extends BaseSyncProvider {
  async validateConfig(config) {
    const { token, owner, repo } = config;
    if (!token || !owner || !repo) {
      throw new Error('GitHub 配置不完整：需要 token、owner 和 repo');
    }
  }

  async testConnection(config) {
    const { token, owner, repo } = config;
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub 连接失败 (${response.status}): ${errorText}`);
    }
  }

  async uploadBackup(config, data) {
    const { token, owner, repo, format = 'json', dualUpload = false } = config;
    
    // 获取仓库默认分支
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
      console.warn('获取仓库默认分支失败，使用 main 作为默认', e);
    }

    const path = 'tidymark/backups/tidymark-backup.json';
    const pathHtml = 'tidymark/backups/tidymark-bookmarks.html';

    const uploadOne = async (filePath, contentStr) => {
      const segs = String(filePath).split('/').map(s => encodeURIComponent(s)).join('/');
      const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${segs}`;
      const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      // 获取现有文件的 SHA
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

      const body = {
        message: `TidyMark backup: ${new Date().toISOString()}`,
        content: this.toBase64(contentStr),
        branch
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(baseUrl, { 
        method: 'PUT', 
        headers, 
        body: JSON.stringify(body) 
      });

      if (putRes.status === 201 || putRes.status === 200) {
        const data = await putRes.json();
        return { success: true, data };
      }

      const errText = await putRes.text();
      throw new Error(`GitHub 上传失败 (${putRes.status}): ${errText}`);
    };

    const results = [];
    if (dualUpload || format === 'json') {
      results.push(await uploadOne(path, JSON.stringify(data, null, 2)));
    }
    if (dualUpload || format === 'html') {
      const htmlStr = this.generateBookmarkHTML(data.bookmarks || []);
      results.push(await uploadOne(pathHtml, htmlStr));
    }

    const last = results[results.length - 1];
    return {
      contentPath: dualUpload ? `${path} & ${pathHtml}` : (format === 'json' ? path : pathHtml),
      htmlUrl: (last && last.data && last.data.content && last.data.content.html_url) || 
               (last && last.data && last.data.commit && last.data.commit.html_url) || null
    };
  }
}

/**
 * WebDAV 同步提供商
 */
class WebDAVSyncProvider extends BaseSyncProvider {
  async validateConfig(config) {
    const { baseUrl, username, password, targetPath } = config;
    if (!baseUrl || !username || !password) {
      throw new Error('WebDAV 配置不完整：需要基地址、用户名和密码');
    }
  }

  async testConnection(config) {
    const { baseUrl, username, password } = config;
    const testUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    
    const response = await fetch(testUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Depth': '0',
        'Content-Type': 'application/xml'
      },
      body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><resourcetype/></prop></propfind>'
    });

    if (!response.ok) {
      throw new Error(`WebDAV 连接失败 (${response.status}): ${response.statusText}`);
    }
  }

  async uploadBackup(config, data) {
    const { baseUrl, username, password, targetPath = 'tidymark', format = 'json', dualUpload = false } = config;
    const auth = `Basic ${this.toBase64(`${username}:${password}`)}`;
    
    // 确保目标路径存在（规范化去掉开头结尾斜杠）
    const normalizedPath = String(targetPath || 'tidymark').replace(/^\/+/, '').replace(/\/+$/, '');
    await this.ensureDirectory(baseUrl, normalizedPath, auth);

    const uploadOne = async (fileName, content, contentType = 'application/json') => {
      const fileUrl = `${baseUrl.replace(/\/$/, '')}/${normalizedPath}/${fileName}`;
      
      const response = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          'Authorization': auth,
          'Content-Type': contentType
        },
        body: content
      });

      if (!response.ok) {
        throw new Error(`WebDAV 上传失败 (${response.status}): ${response.statusText}`);
      }

      return { success: true, url: fileUrl };
    };

    const results = [];
    if (dualUpload || format === 'json') {
      results.push(await uploadOne('tidymark-backup.json', JSON.stringify(data, null, 2)));
    }
    if (dualUpload || format === 'html') {
      const htmlStr = this.generateBookmarkHTML(data.bookmarks || []);
      results.push(await uploadOne('tidymark-bookmarks.html', htmlStr, 'text/html'));
    }

    return {
      contentPath: dualUpload ? 'tidymark-backup.json & tidymark-bookmarks.html' : 
                   (format === 'json' ? 'tidymark-backup.json' : 'tidymark-bookmarks.html'),
      uploadedFiles: results.map(r => r.url)
    };
  }

  async ensureDirectory(baseUrl, path, auth) {
    const dirUrl = `${baseUrl.replace(/\/$/, '')}/${path}/`;
    
    try {
      // 检查目录是否存在
      const checkResponse = await fetch(dirUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': auth,
          'Depth': '0',
          'Content-Type': 'application/xml'
        },
        body: '<?xml version="1.0" encoding="utf-8"?><propfind xmlns="DAV:"><prop><resourcetype/></prop></propfind>'
      });

      if (checkResponse.status === 404) {
        // 目录不存在，创建它
        const createResponse = await fetch(dirUrl, {
          method: 'MKCOL',
          headers: {
            'Authorization': auth
          }
        });

        if (!createResponse.ok && createResponse.status !== 405) { // 405 表示目录已存在
          throw new Error(`创建目录失败 (${createResponse.status}): ${createResponse.statusText}`);
        }
      }
    } catch (error) {
      console.warn('检查/创建目录时出错:', error);
    }
  }
}

/**
 * Google Drive 同步提供商
 */
class GoogleDriveSyncProvider extends BaseSyncProvider {
  async validateConfig(config) {
    const { accessToken } = config;
    if (!accessToken) {
      throw new Error('Google Drive 配置不完整：需要访问令牌');
    }
  }

  async testConnection(config) {
    const { accessToken } = config;
    
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive 连接失败 (${response.status}): ${errorText}`);
    }
  }

  async uploadBackup(config, data) {
    const { accessToken, folderId, format = 'json', dualUpload = false } = config;
    
    const uploadOne = async (fileName, content, mimeType = 'application/json') => {
      // 检查文件是否已存在
      let fileId = null;
      const searchQuery = folderId ? 
        `name='${fileName}' and '${folderId}' in parents and trashed=false` :
        `name='${fileName}' and trashed=false`;
      
      const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.files && searchResult.files.length > 0) {
          fileId = searchResult.files[0].id;
        }
      }

      const metadata = {
        name: fileName,
        ...(folderId && !fileId && { parents: [folderId] })
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('media', new Blob([content], { type: mimeType }));

      const url = fileId ? 
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart` :
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const response = await fetch(url, {
        method: fileId ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Drive 上传失败 (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      return { success: true, fileId: result.id, webViewLink: result.webViewLink };
    };

    const results = [];
    if (dualUpload || format === 'json') {
      results.push(await uploadOne('tidymark-backup.json', JSON.stringify(data, null, 2)));
    }
    if (dualUpload || format === 'html') {
      const htmlStr = this.generateBookmarkHTML(data.bookmarks || []);
      results.push(await uploadOne('tidymark-bookmarks.html', htmlStr, 'text/html'));
    }

    return {
      contentPath: dualUpload ? 'tidymark-backup.json & tidymark-bookmarks.html' : 
                   (format === 'json' ? 'tidymark-backup.json' : 'tidymark-bookmarks.html'),
      uploadedFiles: results.map(r => ({ fileId: r.fileId, webViewLink: r.webViewLink }))
    };
  }
}

// 导出服务实例
const cloudSyncService = new CloudSyncService();

// 将服务挂载到全局作用域（适配 background/service worker 环境）
if (typeof globalThis !== 'undefined') {
  globalThis.CloudSyncService = cloudSyncService;
}

// 兼容浏览器环境
if (typeof window !== 'undefined') {
  window.CloudSyncService = cloudSyncService;
}

// 兼容 Node.js 环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CloudSyncService, cloudSyncService };
}