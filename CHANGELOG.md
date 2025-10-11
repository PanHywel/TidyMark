# Changelog

## v1.2.0 — 2025-10-11

- New Tab: apply wallpaper to `body` for true fullscreen coverage with `background-size: cover`, center positioning, and mobile fallback (`background-attachment: scroll`) to avoid jitter.
- Settings: add `wallpaperEnabled` switch in Options (default OFF), stored in `chrome.storage.sync`, consistent with Weather settings.
- New Tab: remove the top-bar wallpaper toggle; the setting is now controlled exclusively via Options.
- Readability: add subtle text shadows to time, subtitle, weather, and hint text; removed global overlay per feedback to keep page bright.
- Perf: wallpaper cached for 6 hours; uses 60s Bing API.

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