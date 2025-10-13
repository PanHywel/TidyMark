# TidyMark — 智能书签整理扩展

一个轻量的 Chrome/Edge 扩展，支持自动分类、AI 辅助整理、失效书签检测，以及新标签页导航。基于 Manifest V3 原生实现。

## 新增功能（v1.4.0）

- 书签云同步 / 导出：支持每日自动进行 GitHub 书签备份（可在设置页配置），也可手动创建本地备份导出。
- 自动归档旧书签：按“最近访问时间”判断，将不常访问的书签移入“归档”文件夹（可设置阈值，默认 180 天；无访问记录时回退按添加时间）。
- 访问频率统计 / 使用热度分析：记录新标签页的书签访问次数与最近访问时间，支持热门栏目展示与基础使用分析。
- 右键菜单集成：在网页右键菜单中一键“添加到 TidyMark 并分类”，自动创建并移动到匹配分类文件夹。

## 功能简介

- 自动分类：按规则一键整理书签到对应类别。
- AI 辅助：支持 OpenAI/DeepSeek（兼容接口），提升分类效果。
- 失效书签：扫描不可访问链接，支持批量删除或移动。
- 新标签页导航：在新标签页展示分类导航与常用信息。

## 安装方法

- 下载 GitHub Releases 的压缩包（ZIP）。
- 打开 `chrome://extensions/` 或 `edge://extensions/`。
- 开启“开发者模式”，点击“加载已解压的扩展程序”，选择解压后的文件夹。

## 界面截图

<a href="./assets/screenshots/nav.png"><img src="./assets/screenshots/nav.png" alt="导航页" width="700"></a>
<a href="./assets/screenshots/home.png"><img src="./assets/screenshots/home.png" alt="主页" width="400"></a>
<a href="./assets/screenshots/setting.png"><img src="./assets/screenshots/setting.png" alt="设置" width="400"></a>

— 仅保留核心信息，更多细节请参考源码与注释。

# TidyMark — Smart Bookmark Organizer

A lightweight Chrome/Edge extension for auto categorization, AI-assisted organizing, dead link checking, and a New Tab navigation. Built with Manifest V3.

## Features

- Auto categorize: organize bookmarks by rules with one click.
- AI assist: OpenAI/DeepSeek compatible to improve results.
- Dead links: scan unreachable bookmarks; bulk delete or move.
- New Tab navigation: categorized bookmarks and useful info on New Tab.

## Installation

- Download the ZIP from GitHub Releases.
- Open `chrome://extensions/` (or `edge://extensions/`).
- Enable Developer mode → Load unpacked → select the folder.

## Screenshots

<a href="./assets/screenshots/nav.png"><img src="./assets/screenshots/nav.png" alt="Navigation" width="700"></a>
<a href="./assets/screenshots/home.png"><img src="./assets/screenshots/home.png" alt="Home" width="400"></a>
<a href="./assets/screenshots/setting.png"><img src="./assets/screenshots/setting.png" alt="Settings" width="400"></a>

— Minimal info only. See source/comments for details.

Major feature: besides automatic bookmark organization, the New Tab navigation is a primary capability of this project.

## Configuration

- AI provider: `OpenAI` and `DeepSeek` (OpenAI-compatible endpoints supported)
- Supported models: OpenAI family and DeepSeek `deepseek-chat`

### Configurable Features (Options / New Tab)

- Search engine: choose `Google/Bing/DuckDuckGo/Baidu` in the search form (default Bing)
- Theme mode: switch `system/light/dark` via the top-right theme button
- Wallpaper: enable Bing daily wallpaper background in Options (off by default)
- Weather summary: enable in Options and set city; clickable subtitle area to change city; cached for 15 minutes
- 60s Digest: enable “60s read the world” in Options; supports non-hover opacity
- Opacity (non-focused/non-hover states):
  - Search box `searchUnfocusedOpacity` (0.60–1.00, default 0.86)
  - Bookmarks `bookmarksUnfocusedOpacity` (0.60–1.00, default 0.86)
  - 60s section `sixtyUnfocusedOpacity` (0.60–1.00, default 0.86)
- Bookmarks visibility: toggle “Show bookmarks list” in Options (hidden by default; shows categorized bookmarks when enabled)

### Auto Categorization (Rules & AI)

- Rule management: add/edit/delete rules; reset to defaults; matches by bookmark title/URL keywords
- AI assistant: enable AI suggestions; configure provider (OpenAI/DeepSeek), API key/endpoint, model, `maxTokens`, classification language (Chinese/English/auto)

### Default Categories (excerpt)

```json
[
  { "category": "Dev Tools", "keywords": ["github", "gitlab", "api", "docs"] },
  { "category": "News", "keywords": ["news", "blog", "medium", "zhihu"] },
  { "category": "Education", "keywords": ["course", "tutorial", "learn", "university"] },
  { "category": "Tools", "keywords": ["tool", "software", "app", "utility"] },
  { "category": "Entertainment", "keywords": ["video", "music", "game", "movie"] },
  { "category": "Shopping", "keywords": ["shop", "store", "amazon", "taobao"] },
  { "category": "Social Media", "keywords": ["twitter", "facebook", "instagram", "linkedin"] },
  { "category": "Finance", "keywords": ["bank", "finance", "investment", "crypto"] },
  { "category": "AI & ML", "keywords": ["ai", "ml", "huggingface", "openai"] },
  { "category": "Cloud & DevOps", "keywords": ["docker", "k8s", "cloudflare", "vercel"] },
  { "category": "Notes & Knowledge", "keywords": ["obsidian", "evernote", "wiki", "notion"] },
  { "category": "Project & Tasks", "keywords": ["asana", "trello", "todoist", "clickup"] },
  { "category": "Maps & Navigation", "keywords": ["google maps", "osm", "gaode", "baidu map"] },
  { "category": "Blogging & CMS", "keywords": ["wordpress", "ghost", "blogger", "cms"] }
]
```

Full rule set lives in `services/classificationService.js` and `services/defaultRules.js`.

## Tech Stack

- Manifest V3, native HTML/CSS/JavaScript
- Chrome Extensions API for bookmarks, storage, downloads

## Project Structure

```
TidyMark/
├── manifest.json
├── src/
│   ├── background/
│   │   └── index.js
│   └── pages/
│       ├── popup/
│       │   ├── index.html
│       │   ├── index.css
│       │   └── index.js
│       ├── options/
│       │   ├── index.html
│       │   ├── index.css
│       │   └── index.js
│       ├── newtab/
│       │   ├── index.html
│       │   ├── index.css
│       │   └── index.js
│       └── reset/
│           └── index.html
├── services/
│   ├── bookmarkService.js
│   ├── storageService.js
│   ├── classificationService.js
│   └── i18n.js
├── icons/
└── assets/
    └── screenshots/
        ├── home.png
        ├── setting.png
        └── nav.png
```

## Permissions

- `bookmarks`, `storage`, `downloads`, `activeTab`, `alarms`, `contextMenus`, `notifications`

## Contributing

- Issues and PRs are welcome! Please keep changes minimal, focused, and consistent with the existing style.
- Internationalization: English and Simplified Chinese are supported. Contributions to more locales are appreciated.

## 许可证 / License

MIT License — 详见/see `LICENSE`。