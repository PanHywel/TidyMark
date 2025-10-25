# Changelog

## v1.4.21 — 2025-10-21

- Organize-only: localized short description across EN/zh-CN/zh-TW/ru to focus on bookmark organizing; removed any mention of New Tab.
- Manifest (organize-only): `description` and `action.default_title` now use i18n messages (`__MSG_appDesc__`, `__MSG_actionTitle__`) with `default_locale=en`.
- Docs: clarified variant descriptions earlier; no functional changes in features.

## v1.4.19 — 2025-10-17

- i18n: remove unused `search.engine*` messages; keep concise default-search note key.
- Options: add inline note clarifying default search uses `chrome.search.query` (no engine switching).
- Manifest: trim `host_permissions` by removing `https://www.google.com/*` to reduce review risk.
- Locales: short description aligned to “Minimal new tab: bookmarks, smart categorization, wallpaper & weather, default search”.

## v1.4.18 — 2025-10-17

- New Tab: block default form submission on the search form (`action="#"` + `onsubmit="return false"`), preventing accidental empty query and trailing `?` in URL.
- No behavior change for actual search flow; form submission remains handled by JS (bookmarks, URL jump, or `chrome.search.query`).

## v1.4.17 — 2025-10-17

- Compliance: New Tab search now uses `chrome.search.query` and strictly follows the browser's default search provider.
- UI: remove search engine selector and related preferences from New Tab.
- Background: remove default `searchEngine` initialization; no engine override or storage.
- Manifest: add `search` permission to enable the Search API; no `search_provider` override.
- Docs: update store review notes and permission justifications accordingly.

## v1.4.16 — 2025-10-16

- New Tab: set 60s primary instance to `https://60api.09cdn.xyz`; fallback order unchanged.
- No breaking changes; functionality remains the same.

## v1.4.15 — 2025-10-15

- Permissions: refine default `host_permissions` to a precise whitelist (Bing, Google favicons, Open-Meteo, 60s instances, GitHub API and raw).
- Optional host permissions: declare `<all_urls>`, `http://localhost:*/*`, `api.openai.com`, `api.deepseek.com` as optional; requested only when features are used.
- Dead-link scan: add runtime permission request before scanning to ensure cross-origin checks run only with explicit user consent.
- No breaking changes; existing settings remain intact; store review friendliness improved.

## v1.4.14 — 2025-10-15

- i18n: localize manifest fields (`name`, `short_name`, `description`, `action.default_title`) using `__MSG_*__` and set `default_locale=en`.
- Locales: add `_locales/en`, `_locales/zh_CN`, `_locales/zh_TW`, `_locales/ru` with `messages.json`.
- CI: release packaging now includes `_locales/` so stores detect supported languages.
- New Tab: prefer Bing official UHD “desktop wallpaper” source by default, fallback to 60s multi-instances; keep daily cache update-on-success behavior.
- No breaking changes; existing settings migrate automatically.

## v1.4.10 — 2025-10-14

- Options: replace header language select with icon button; set icon color to white and size to 16px; slightly increase button padding for better click comfort.
- Options: switch menu show/hide to class-based `.open`; close on outside click and Esc; keep menu hidden by default via CSS; set `aria-expanded` on toggle.
- No breaking changes; documentation unchanged.

## v1.4.9 — 2025-10-14

- New Tab: autofocus search input and add JS fallback focus to ensure input is focused on open across browsers.
- No breaking changes; documentation unchanged.

## v1.4.7 — 2025-10-14

- Docs: split README into bilingual files; English default (`README.md`) with top language switch; add Chinese file (`README.zh-CN.md`).
- Options: fix footer version text to use i18n (`footer.app`) and append version; ensure language change triggers a delayed refresh for non-reactive texts.
- i18n: add missing `about.*` keys across locales for Options page content.
- No breaking changes.

## v1.4.6 — 2025-10-14

- Options: add clearer prompt textareas with monospace styling and better readability.
- Options: show placeholder hints under each prompt, including `{{language}}`, `{{itemsJson}}`, and `{{categoriesJson}}` where applicable.
- Options: add right-aligned action buttons — Copy and Reset to Default — for both prompts.
- Options: wire copy to clipboard with fallback, and reset to default templates with immediate persistence.
- Background: continues to respect user templates from `chrome.storage.sync`, falling back when empty.
- No breaking changes; existing settings migrate automatically.

## v1.4.4 — 2025-10-13

- New Tab: header glass overlay now follows content width with 8px side padding for better aesthetics and readability on wallpapers.
- No functional changes; README unchanged.

## v1.4.3 — 2025-10-13

- Options: restore AI connectivity “测试链接” button and inline result.
- Options: change “🤖 AI 全量归类” to accent primary style for parity with “⚡ 自动整理”.
- Background: wire classification language (zh/en/auto) into default rules, auto classify, context menu quick classify, and AI mock suggestions; fallback folder name supports “其他/Others”.
- UX: organize preview respects bilingual “其他/Others” when moving uncategorized items.
- CI: release workflow triggers on `v*.*.*` tag; packaged zip includes `manifest.json`, `icons`, `src`, `services`, `README.md`, `LICENSE`.

## v1.3.2 — 2025-10-11

- New Tab: change default search engine to Bing.
- Install: set `searchEngine='bing'` in local storage on first install when unset.
- Docs: README notes Bing as the default search engine (bilingual).

---

## v1.3.1 — 2025-10-11

- New Tab: enable Bing wallpaper by default; honors stored preference if present.
- Resilience: add multiple fallback instances for 60s digest and Bing wallpaper API.
- Fallback: wallpaper uses Bing official `HPImageArchive` when all 60s instances fail.
- Options: default `wallpaperEnabled=true` so checkbox is checked on fresh installs.
- Install: background initializes `wallpaperEnabled=true` only when unset.
- Docs: README updated to reflect wallpaper default enabled and configurable items.

---

## v1.2.0 — 2025-10-11

- New Tab: apply wallpaper to `body` for true fullscreen coverage with `background-size: cover`, center positioning, and mobile fallback (`background-attachment: scroll`) to avoid jitter.
- Settings: add `wallpaperEnabled` switch in Options (default OFF), stored in `chrome.storage.sync`, consistent with Weather settings.
- New Tab: remove the top-bar wallpaper toggle; the setting is now controlled exclusively via Options.
- Readability: add subtle text shadows to time, subtitle, weather, and hint text; removed global overlay per feedback to keep page bright.
- Perf: wallpaper cached for 6 hours; uses 60s Bing API.
- Docs: add Weather feature description to README (Options toggle and inline summary).

---

## v1.1.0 — 2025-10-11

- Popup: add concise top hint “点击书签切换分类” for manual adjustments.
- Picker: unify category picker to a mini modal (`picker-dialog`) and style select (`picker-select`).
- UX: set bookmark items to pointer cursor in preview for better discoverability.
- i18n: add preview picker-related keys and shorten `preview.clickHint`.
- Docs: update README with manual switching instructions.

---

## v1.0.6 — 2025-10-10

- CI: fix release packaging to include `src/`, `services/`, `icons/`, and `manifest.json`.
- Result: generated ZIP contains all runtime files and runs correctly.
- No functional changes.

---
## v1.0.5 — 2025-10-10

- README: point screenshot links to project root (`./home.png`, `./setting.png`, `./nav.png`).
- Assets: move screenshots back to repository root for simpler local preview.
- Docs: add `docs/index.html` for local screenshot preview (non-functional).
- No functional changes.

---

## v1.0.4 — 2025-10-10

- README: switch screenshot links to Raw GitHub URLs for reliable preview in any environment.
- Pages: normalize header icon paths to root-absolute `/icons/...` for consistent loading.
- No functional changes.

---

## v1.0.3 — 2025-10-10

- Move `preview.html` to `src/pages/preview/index.html` and fix resource paths.
- Create `assets/screenshots/` and relocate `home.png`, `setting.png`, `nav.png`.
- Update README: add navigation screenshot, AI optimization notes (wait 2–3 min, keep UI open), and new project structure.
- Options page: implement dynamic version reading from `manifest.json` (fallback in preview).
- Bump extension version to `1.0.3` in `manifest.json`.

---

## v1.0.2 — 2025-10-10

- Implement navigation across extension pages (Popup/Options/Preview).
- Add top navigation bar and page links for easier access.
- Improve UX with active-state highlighting and consistent routes.

---

## v0.1.0 — 2025-10-09

- Initial public release of TidyMark (Chrome/Edge Manifest V3).
- Bookmark backup/restore to JSON with one-click recovery.
- Auto categorize based on keywords; manage “Other” for uncategorized items.
- Category management UI for add/delete/edit.
- Internationalization: English and Simplified Chinese.
- Options page: AI provider/model configuration; blocks non-standard “reasoner” models.
- Post-organize cleanup: automatically remove now-empty source folders.
- Bilingual README and MIT License added.

---

## v0.1.0 — 2025-10-09（中文）

- TidyMark 首次公开发行（Chrome/Edge Manifest V3）。
- 支持书签 JSON 备份与一键恢复。
- 基于关键词自动分类；“其他”目录批量管理未分类书签。
- 分类管理界面：增/删/改。
- 国际化：英文与简体中文。
- 选项页：AI 服务商/模型配置；屏蔽非标准 “reasoner/思考型” 模型。
- 整理后清理：自动删除已变为空的源目录。
- 新增双语 README 与 MIT 许可证。

---

## v1.0.4 — 2025-10-10（中文）

- README 截图链接改为 Raw GitHub 地址，确保各环境可预览。
- 页面头部图标路径统一为根绝对路径 `/icons/...`，提升加载一致性。
- 无功能改动。

---

## v1.0.5 — 2025-10-10（中文）

- README：将截图链接改为根目录相对路径（`./home.png`、`./setting.png`、`./nav.png`）。
- 资源：将截图文件移回仓库根目录，便于本地预览。
- 文档：新增 `docs/index.html` 用于本地截图预览（非功能改动）。
- 无功能改动。

---

## v1.0.6 — 2025-10-10（中文）

- CI：修复 Release 打包清单，包含 `src/`、`services/`、`icons/` 与 `manifest.json`。
- 结果：生成的 ZIP 包含完整运行文件，安装后可正常运行。
- 无功能改动。

---

## v1.0.3 — 2025-10-10（中文）

- 迁移预览页到 `src/pages/preview/index.html` 并修正资源引用路径。
- 新建 `assets/screenshots/` 并归档 `home.png`、`setting.png`、`nav.png`。
- 更新 README：新增导航截图与 AI 优化注意事项（等待 2–3 分钟且界面保持开启），同步项目结构。
- 选项页增加动态版本号读取（扩展环境读取 `manifest.json`，预览环境回退）。
- 将扩展版本更新为 `1.0.3`。

---

## v1.0.2 — 2025-10-10（中文）

- 实现扩展内导航（弹窗/选项/预览页）。
- 增加顶部导航栏与页面链接，提升访问便捷性。
- 优化交互：当前页面高亮与一致的路由跳转。

---

## v1.1.0 — 2025-10-11（中文）

- 弹窗：在预览弹窗顶部加入简短提示“点击书签切换分类”。
- 选择器：统一为小型模态框（`picker-dialog`），并美化选择控件（`picker-select`）。
- 交互：预览列表中的书签项鼠标样式改为指针，提升可发现性。
- 国际化：补充预览选择相关键值，精简 `preview.clickHint` 文案。
- 文档：更新 README，新增手动切换分类的说明。
---

## v1.2.0 — 2025-10-11（中文）

- 新标签页：将壁纸应用到 `body` 实现真正的全屏铺满，采用 `background-size: cover` 与居中显示；在小屏/移动端禁用 `background-attachment: fixed`，避免滚动抖动。
- 设置页：新增 `wallpaperEnabled` 开关（默认关闭），使用 `chrome.storage.sync` 持久化，与天气设置保持一致。
- 新标签页：移除顶部壁纸切换按钮，统一由设置页控制。
- 可读性：为时间、副标题、天气与提示文字增加轻微 `text-shadow`；根据反馈移除了全局暗层，保持页面更明亮。
- 性能：壁纸缓存 6 小时，来源为 60s Bing API。
- 文档：补充 README 的天气功能说明（选项页开关与导航页摘要）。

---

## v1.2.1 — 2025-10-11

- New Tab: fix `showBookmarks` preference parsing and consistency across environments (Chrome storage vs local preview).
- Visibility: add global `[hidden] { display: none !important; }` to ensure hidden elements are truly hidden.
- UX: add a centered one-line placeholder text when bookmarks are hidden.
- Footer: remove bottom TidyMark brand block from the New Tab page.
- Sync: listen to storage changes to reflect bookmark visibility toggles in real time.

---

## v1.2.1 — 2025-10-11（中文）

- 新标签页：修复 `showBookmarks` 偏好解析不一致问题，统一跨环境（扩展/本地预览）。
- 显示控制：新增全局 `[hidden] { display: none !important; }`，确保隐藏元素真正不可见。
- 体验：在隐藏书签时显示居中的单行占位提示文案。
- 页脚：移除新标签页底部的 TidyMark 品牌区块。
- 同步：监听存储变更，书签显示开关可实时生效。
## [1.3.0] - 2025-10-11

### Added
- 60s 读懂世界：整块区域作为单一链接，点击或键盘（Enter/Space）打开原文。
- 60s 读懂世界：新增独立非聚焦透明度配置，可在设置页调节。
- 书签搜索结果：展示顺序调整为优先显示在 60s 栏目之上。

### Changed
- 搜索按钮样式统一为描边圆角胶囊，与整体 UI 保持一致。

### Fixed
- 优化副标题与天气栏的并排显示与换行行为。
## v1.4.5

- Drag UX improvements on newtab:
  - Clearer drop indicators with explicit top/bottom insertion bars.
  - More reliable placement using a 33% threshold (20–60px guard).
  - Enabled dragging for “60s 读懂世界” and “热门书签 Top N” modules within the main area.
  - Prevented cross-container drops into the bookmarks list to avoid misplacement.
- No functional changes to data or features; README unchanged.