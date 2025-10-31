# TidyMark Browser Extension · Privacy Policy

Effective date: 2025-10-31

This privacy policy explains how the TidyMark browser extension (“TidyMark”, “we”) handles data. TidyMark is a client-side extension; we do not operate any backend server to collect or store your personal data.

## What We Process
- Bookmarks management: Reads and updates your browser bookmarks to organize them. Data is stored locally in your browser storage; nothing is sent to us.
- Configuration and rules: Your sorting rules, tags, and preferences are stored locally. Optional cloud sync can back up these to your own accounts (WebDAV, GitHub, Google Drive) if you enable it.
- New Tab modules (optional):
  - Bing daily wallpaper: Fetches image metadata and resources from `https://www.bing.com`. No identifiers are added by us.
  - 60s summaries: Fetches daily summaries from community instances you choose. No identifiers are added by us.
  - Weather: Calls Open‑Meteo APIs to get weather based on a city name or similar query you provide. We do not request browser geolocation permission.
- Dead-link scan (optional): Performs network requests to bookmarked URLs to check status codes. We do not collect page contents; only status results are kept locally.
- DNS over HTTPS (optional): Sends DNS queries to providers you select (e.g., Google/Cloudflare/AliDNS) for resolution. These providers receive your queried domain names.
- AI integrations (optional): If you configure an AI provider (local at `http://localhost` or online like OpenAI/DeepSeek), prompts may include bookmark titles/metadata you choose to process. Keys are stored locally and sent only to the configured provider.

## What We Do Not Do
- No analytics or telemetry by default.
- No selling or sharing of your data with third parties.
- No reading of browsing history beyond your bookmarks unless you enable dead‑link scanning.

## Storage and Security
- Local storage: All configuration, cache, and tokens are stored in your browser storage. We do not transmit them to any server we control.
- Cloud sync (optional): When enabled, data is written to your own WebDAV server, GitHub repository, or Google Drive. Your credentials/tokens remain on your device.
- Encryption: We rely on the security of the platforms/APIs you choose; we do not run our own servers. Please protect your device and accounts.

## Third-Party Services (Optional)
- Bing (`https://www.bing.com`): Wallpapers and metadata.
- Open‑Meteo (`https://api.open-meteo.com`, `https://geocoding-api.open-meteo.com`): Weather and geocoding.
- 60s community instances: Daily summaries from instances you select.
- DNS over HTTPS providers (`dns.google`, `cloudflare-dns.com`, `dns.alidns.com`): DNS resolution.
- GitHub (`https://api.github.com`, `https://raw.githubusercontent.com`): Config sync via your repository.
- Google Drive (`https://www.googleapis.com`): Config backup/sync using your account.
- AI providers (as configured): Local `http://localhost` or online endpoints you add. Provider terms apply.

## Your Controls
- Feature opt‑in/out: All online modules (weather, wallpapers, AI, DNS, cloud sync) are optional and can be disabled.
- Reset & deletion: Use “Reset” or “Options” pages to remove local data/configs. For cloud sync, remove files/tokens in your own accounts.
- Keys & endpoints: You fully control AI provider endpoints/models and can clear tokens at any time.

## Children’s Privacy
TidyMark is not directed to children under 13. We do not knowingly collect personal information from children.

## Changes to This Policy
We may update this policy to reflect product changes. We will revise the “Effective date” above accordingly.

## Contact
For privacy questions or requests, please open an issue at: https://github.com/PanHywel/TidyMark/issues

---

# TidyMark 浏览器扩展 · 隐私政策（简体中文）

生效日期：2025-10-31

本隐私政策说明 TidyMark 浏览器扩展（以下简称 “TidyMark”、“我们”）如何处理数据。TidyMark 是纯客户端扩展，我们不运营任何收集或存储您个人数据的后台服务器。

## 我们处理的数据
- 书签管理：读取并更新浏览器书签以进行整理。数据存储在本地浏览器中；不会发送给我们。
- 配置与规则：您的排序规则、标签与偏好保存在本地。若您开启云备份/同步（WebDAV、GitHub、Google Drive），相应数据将同步到您自己的账户。
- 新标签页模块（可选）：
  - 必应每日壁纸：从 `https://www.bing.com` 获取图片元数据与资源。我们不会添加任何标识符。
  - 60s 摘要：从您选择的社区实例拉取每日摘要。我们不会添加任何标识符。
  - 天气：调用 Open‑Meteo 接口根据您输入的城市名称等获取天气。我们不请求浏览器地理位置权限。
- 失效链接扫描（可选）：对书签链接发起网络请求检查状态码。我们不采集页面内容；本地仅保存状态结果。
- DoH 域名解析（可选）：向您选择的 DoH 提供方发送域名查询。提供方会收到您查询的域名。
- AI 集成（可选）：若您配置 AI 提供方（本地 `http://localhost` 或在线如 OpenAI/DeepSeek），提示词可能包含您选择处理的书签标题/元数据。密钥仅存储于本地并仅发送到您配置的提供方。

## 我们不做的事
- 默认不启用任何分析或遥测。
- 不出售或共享您的数据给第三方。
- 除非您启用失效链接扫描，否则我们不会读取书签以外的浏览记录。

## 存储与安全
- 本地存储：所有配置、缓存与令牌保存在浏览器本地。我们不会将其传输到任何由我们控制的服务器。
- 云同步（可选）：启用后，数据将写入您自己的 WebDAV 服务器、GitHub 仓库或 Google Drive。您的凭据/令牌仅保留在您的设备上。
- 加密：我们依赖您所选择的平台/API 的安全性；我们不运行自有服务器。请妥善保护您的设备与账户。

## 第三方服务（可选）
- 必应（`https://www.bing.com`）：壁纸与元数据。
- Open‑Meteo（`https://api.open-meteo.com`、`https://geocoding-api.open-meteo.com`）：天气与地理编码。
- 60s 社区实例：来自您选择实例的每日摘要。
- DoH 提供方（`dns.google`、`cloudflare-dns.com`、`dns.alidns.com`）：域名解析。
- GitHub（`https://api.github.com`、`https://raw.githubusercontent.com`）：通过您的仓库进行配置同步。
- Google Drive（`https://www.googleapis.com`）：通过您的账户进行配置备份/同步。
- AI 提供方（按您配置）：本地 `http://localhost` 或在线端点。各提供方条款适用。

## 您的控制
- 功能开关：所有在线模块（天气、壁纸、AI、DoH、云同步）均为可选且可关闭。
- 重置与删除：通过“重置”或“选项”页面清除本地数据/配置。云同步数据请在您的账户中删除文件/令牌。
- 密钥与端点：您完全控制 AI 端点与模型，并可随时清除令牌。

## 儿童隐私
TidyMark 不面向 13 岁以下儿童。我们不会明知收集儿童个人信息。

## 政策更新
我们可能根据产品变更更新本政策，并相应调整上述“生效日期”。

## 联系方式
隐私相关问题或请求，请在此提交 Issue：https://github.com/PanHywel/TidyMark/issues

---

# TidyMark 瀏覽器擴充 · 隱私權政策（繁體中文）

生效日期：2025-10-31

本隱私權政策說明 TidyMark 瀏覽器擴充（以下稱「TidyMark」、「我們」）如何處理資料。TidyMark 為純用戶端擴充，我們不營運任何蒐集或儲存您個人資料的後端伺服器。

## 我們處理的資料
- 書籤管理：讀取並更新瀏覽器書籤以進行整理。資料儲存於本地瀏覽器；不會傳送給我們。
- 設定與規則：您的排序規則、標籤與偏好保存在本地。若您啟用雲端備份/同步（WebDAV、GitHub、Google Drive），相應資料將同步至您自己的帳戶。
- 新分頁模組（可選）：
  - 必應每日桌布：自 `https://www.bing.com` 取得圖片中繼資料與資源。我們不添加任何識別碼。
  - 60s 摘要：自您選擇的社群實例抓取每日摘要。我們不添加任何識別碼。
  - 天氣：呼叫 Open‑Meteo 介面依您輸入的城市名稱等取得天氣。我們不請求瀏覽器地理位置權限。
- 連結失效掃描（可選）：對書籤連結發出網路請求檢查狀態碼。我們不蒐集頁面內容；僅在本地保存狀態結果。
- DoH 網域解析（可選）：向您選擇的 DoH 提供者送出網域查詢。提供者會收到您查詢的網域。
- AI 整合（可選）：若您設定 AI 提供者（本地 `http://localhost` 或線上如 OpenAI/DeepSeek），提示詞可能包含您選擇處理的書籤標題/中繼資料。金鑰僅儲存於本地並僅傳送至您設定的提供者。

## 我們不做的事
- 預設不啟用任何分析或遙測。
- 不出售或共享您的資料給第三方。
- 除非您啟用連結失效掃描，否則我們不讀取書籤以外的瀏覽記錄。

## 儲存與安全
- 本地儲存：所有設定、快取與金鑰儲存在瀏覽器本地。我們不傳送至任何由我們控制的伺服器。
- 雲端同步（可選）：啟用後，資料將寫入您自己的 WebDAV 伺服器、GitHub 儲存庫或 Google Drive。您的憑證/金鑰僅保留在您的裝置上。
- 加密：我們依賴您所選平台/API 的安全性；我們不運行自有伺服器。請妥善保護您的裝置與帳戶。

## 第三方服務（可選）
- 必應（`https://www.bing.com`）：桌布與中繼資料。
- Open‑Meteo（`https://api.open-meteo.com`、`https://geocoding-api.open-meteo.com`）：天氣與地理編碼。
- 60s 社群實例：來自您選擇實例的每日摘要。
- DoH 提供者（`dns.google`、`cloudflare-dns.com`、`dns.alidns.com`）：網域解析。
- GitHub（`https://api.github.com`、`https://raw.githubusercontent.com`）：透過您的儲存庫進行設定同步。
- Google Drive（`https://www.googleapis.com`）：透過您的帳戶進行設定備份/同步。
- AI 提供者（依您設定）：本地 `http://localhost` 或線上端點。各提供者條款適用。

## 您的控制
- 功能開關：所有線上模組（天氣、桌布、AI、DoH、雲端同步）皆為可選且可關閉。
- 重設與刪除：透過「重設」或「選項」頁面清除本地資料/設定。雲端同步資料請於您的帳戶中刪除檔案/金鑰。
- 金鑰與端點：您完全控制 AI 端點與模型，並可隨時清除金鑰。

## 兒童隱私
TidyMark 不面向 13 歲以下兒童。我們不會明知蒐集兒童個人資訊。

## 政策更新
我們可能依產品變更更新本政策，並相應調整上述「生效日期」。

## 聯絡方式
隱私相關問題或請求，請於此提交 Issue：https://github.com/PanHywel/TidyMark/issues

---

# TidyMark · Политика конфиденциальности (Русский)

Дата вступления в силу: 2025-10-31

Эта политика объясняет, как расширение TidyMark обрабатывает данные. TidyMark — клиентское расширение; мы не управляем сервером, который собирает или хранит ваши персональные данные.

## Что мы обрабатываем
- Управление закладками: чтение и обновление закладок для их организации. Данные хранятся локально в браузере и не отправляются нам.
- Настройки и правила: ваши правила сортировки, теги и предпочтения хранятся локально. При включении облачной синхронизации (WebDAV, GitHub, Google Drive) данные отправляются в ваши аккаунты.
- Модули новой вкладки (по желанию):
  - Ежедневные обои Bing: запросы к `https://www.bing.com` без добавления идентификаторов.
  - Ежедневные 60s‑сводки: запросы к выбранным вами инстансам сообщества.
  - Погода: обращения к Open‑Meteo на основе введённого вами города. Мы не запрашиваем разрешение геолокации браузера.
- Проверка «битых» ссылок (по желанию): сетевые запросы к URL закладок для проверки статуса. Контент страниц не собирается; сохраняются только локальные результаты.
- DNS по HTTPS (по желанию): запросы к выбранным вами провайдерам DoH. Им передаются имена запрашиваемых доменов.
- Интеграции ИИ (по желанию): если настроен провайдер ИИ (локальный `http://localhost` или онлайн, например OpenAI/DeepSeek), в промпты могут попадать названия/метаданные закладок по вашему выбору. Ключи хранятся локально и отправляются только настроенному провайдеру.

## Чего мы не делаем
- Нет аналитики и телеметрии по умолчанию.
- Нет продажи или передачи ваших данных третьим лицам.
- Без чтения истории браузера за пределами закладок, если вы не включили проверку «битых» ссылок.

## Хранение и безопасность
- Локальное хранение: настройки, кеш и токены хранятся в локальном хранилище браузера. Мы не передаём их на наши серверы.
- Облачная синхронизация (по желанию): данные пишутся на ваш сервер WebDAV, репозиторий GitHub или Google Drive. Учётные данные/токены остаются на вашем устройстве.
- Шифрование: мы полагаемся на безопасность выбранных вами платформ/API; собственных серверов мы не запускаем. Защитите ваше устройство и аккаунты.

## Сторонние сервисы (по желанию)
- Bing (`https://www.bing.com`), Open‑Meteo (`https://api.open-meteo.com`, `https://geocoding-api.open-meteo.com`), DNS‑провайдеры (`dns.google`, `cloudflare-dns.com`, `dns.alidns.com`), GitHub, Google Drive, ИИ‑провайдеры по вашей настройке.

## Ваши возможности
- Включение/отключение модулей и функций; очистка данных через страницы “Сброс/Опции”; управление токенами и эндпоинтами.

## Дети
Расширение не предназначено для детей младше 13 лет и не собирает их персональные данные.

## Изменения
Мы можем обновлять эту политику; дата вступления в силу будет пересмотрена.

## Контакты
Вопросы по конфиденциальности: открывайте issue здесь — https://github.com/PanHywel/TidyMark/issues