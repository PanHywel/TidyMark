// Simple i18n service
(function() {
  const supported = ['zh-CN', 'zh-TW', 'en', 'ru'];
  const categoryMap = {
    'dev-tools': {
      'zh-CN': '开发工具', 'zh-TW': '開發工具', 'en': 'Developer Tools', 'ru': 'Инструменты разработчика'
    },
    // Open Source & Code Hosting
    'open-source-hosting': {
      'zh-CN': '开源与代码托管', 'zh-TW': '開源與程式碼託管', 'en': 'Open Source & Code Hosting', 'ru': 'Открытый исходный код и хостинг'
    },
    // Developer Docs & API
    'dev-docs-api': {
      'zh-CN': '开发文档与API', 'zh-TW': '開發文件與 API', 'en': 'Developer Docs & API', 'ru': 'Документация и API'
    },
    // Frontend & Backend frameworks
    'frontend-frameworks': {
      'zh-CN': '前端框架', 'zh-TW': '前端框架', 'en': 'Frontend Frameworks', 'ru': 'Фронтенд-фреймворки'
    },
    'backend-frameworks': {
      'zh-CN': '后端框架', 'zh-TW': '後端框架', 'en': 'Backend Frameworks', 'ru': 'Бэкенд-фреймворки'
    },
    // Cloud Services & DevOps (alias to match default rule wording)
    'cloud-services-devops': {
      'zh-CN': '云服务与DevOps', 'zh-TW': '雲服務與 DevOps', 'en': 'Cloud Services & DevOps', 'ru': 'Облачные сервисы и DevOps'
    },
    // Databases & Data
    'databases-data': {
      'zh-CN': '数据库与数据', 'zh-TW': '資料庫與資料', 'en': 'Databases & Data', 'ru': 'Базы данных и данные'
    },
    // Data Science & Analytics (alias wording)
    'data-science-analytics': {
      'zh-CN': '数据科学与分析', 'zh-TW': '資料科學與分析', 'en': 'Data Science & Analytics', 'ru': 'Наука о данных и аналитика'
    },
    // API Testing & Development
    'api-dev-testing': {
      'zh-CN': 'API测试与开发', 'zh-TW': 'API 測試與開發', 'en': 'API Testing & Development', 'ru': 'Тестирование и разработка API'
    },
    // Email & Communication
    'email-communication': {
      'zh-CN': '邮件与通讯', 'zh-TW': '郵件與通訊', 'en': 'Email & Communication', 'ru': 'Почта и связь'
    },
    // Jobs & Recruitment
    'jobs-recruitment': {
      'zh-CN': '求职与招聘', 'zh-TW': '求職與招聘', 'en': 'Jobs & Recruitment', 'ru': 'Работа и подбор персонала'
    },
    // Finance
    'finance': {
      'zh-CN': '金融与理财', 'zh-TW': '金融與理財', 'en': 'Finance', 'ru': 'Финансы'
    },
    // Life Services
    'life-services': {
      'zh-CN': '生活服务', 'zh-TW': '生活服務', 'en': 'Life Services', 'ru': 'Бытовые услуги'
    },
    // Reading & eBooks
    'reading-ebooks': {
      'zh-CN': '阅读与电子书', 'zh-TW': '閱讀與電子書', 'en': 'Reading & eBooks', 'ru': 'Чтение и электронные книги'
    },
    'news': {
      'zh-CN': '新闻资讯', 'zh-TW': '新聞資訊', 'en': 'News', 'ru': 'Новости'
    },
    'education': {
      'zh-CN': '学习教育', 'zh-TW': '學習教育', 'en': 'Education', 'ru': 'Образование'
    },
    'tools': {
      'zh-CN': '工具软件', 'zh-TW': '工具軟體', 'en': 'Tools', 'ru': 'Инструменты'
    },
    'entertainment': {
      'zh-CN': '娱乐休闲', 'zh-TW': '娛樂休閒', 'en': 'Entertainment', 'ru': 'Развлечения'
    },
    'cloud-devops': {
      'zh-CN': '云与运维', 'zh-TW': '雲與運維', 'en': 'Cloud & DevOps', 'ru': 'Облако и DevOps'
    },
    'notes-knowledge': {
      'zh-CN': '笔记与知识库', 'zh-TW': '筆記與知識庫', 'en': 'Notes & Knowledge', 'ru': 'Заметки и база знаний'
    },
    'project-task': {
      'zh-CN': '项目与任务管理', 'zh-TW': '專案與任務管理', 'en': 'Project & Task', 'ru': 'Проекты и задачи'
    },
    'maps-navigation': {
      'zh-CN': '地图与导航', 'zh-TW': '地圖與導航', 'en': 'Maps & Navigation', 'ru': 'Карты и навигация'
    },
    'cms-blog': {
      'zh-CN': '博客平台与CMS', 'zh-TW': '部落格與CMS', 'en': 'Blogs & CMS', 'ru': 'Блоги и CMS'
    },
    'data-science': {
      'zh-CN': '数据科学与分析', 'zh-TW': '資料科學與分析', 'en': 'Data Science & Analytics', 'ru': 'Дата-сайенс и аналитика'
    }
  };

  const translations = {
    'tabs.general': { 'zh-CN': '关于', 'zh-TW': '關於', 'en': 'About', 'ru': 'О продукте' },
    'tabs.categories': { 'zh-CN': '分类规则', 'zh-TW': '分類規則', 'en': 'Category Rules', 'ru': 'Правила категорий' },
    'tabs.ai': { 'zh-CN': 'AI 配置', 'zh-TW': 'AI 設定', 'en': 'AI Settings', 'ru': 'Настройки AI' },
    'tabs.help': { 'zh-CN': '帮助', 'zh-TW': '說明', 'en': 'Help', 'ru': 'Помощь' },

    'actions.backup': { 'zh-CN': '备份书签', 'zh-TW': '備份書籤', 'en': 'Backup Bookmarks', 'ru': 'Резервное копирование' },
    'actions.organize': { 'zh-CN': '自动整理', 'zh-TW': '自動整理', 'en': 'Auto Organize', 'ru': 'Автосортировка' },
    'actions.settings': { 'zh-CN': '设置', 'zh-TW': '設定', 'en': 'Settings', 'ru': 'Настройки' },

    'stats.totalBookmarks': { 'zh-CN': '总书签', 'zh-TW': '總書籤', 'en': 'Bookmarks', 'ru': 'Закладки' },
    'stats.totalCategories': { 'zh-CN': '分类', 'zh-TW': '分類', 'en': 'Categories', 'ru': 'Категории' },

    'search.placeholder': { 'zh-CN': '搜索书签...', 'zh-TW': '搜尋書籤...', 'en': 'Search bookmarks...', 'ru': 'Поиск закладок...' },

    'categories.header': { 'zh-CN': '分类管理', 'zh-TW': '分類管理', 'en': 'Category Management', 'ru': 'Управление категориями' },
    'categories.empty.title': { 'zh-CN': '还没有创建分类', 'zh-TW': '尚未建立分類', 'en': 'No categories yet', 'ru': 'Категории отсутствуют' },
    'categories.empty.tip': { 'zh-CN': '点击 + 添加分类，或使用“自动整理”', 'zh-TW': '點擊 + 新增分類，或使用「自動整理」', 'en': 'Click + to add, or use Auto Organize', 'ru': 'Нажмите + или используйте автосортировку' },

    'help.header': { 'zh-CN': '帮助与提示', 'zh-TW': '說明與提示', 'en': 'Help & Tips', 'ru': 'Помощь и советы' },
    'help.desc': { 'zh-CN': '查看使用说明与备份提示，包括导入、备份和重置', 'zh-TW': '查看使用說明與備份提示，包含匯入、備份與重置', 'en': 'Usage notes and backup tips: import, backup, reset', 'ru': 'Справка и советы: импорт, резервное копирование, сброс' }
  };

  // Extended UI translations
  const translationsExt = {
    // About
    'about.intro': { 'zh-CN': 'TidyMark 是一个智能书签管理扩展，帮助您自动整理和分类书签。', 'zh-TW': 'TidyMark 是一個智慧書籤管理擴充，協助您自動整理與分類書籤。', 'en': 'TidyMark is a smart bookmark manager that auto-organizes your bookmarks.', 'ru': 'TidyMark — умный менеджер закладок, автоматически упорядочивающий их.' },
    'about.features.smart': { 'zh-CN': '🔄 智能整理', 'zh-TW': '🔄 智慧整理', 'en': '🔄 Smart Organizing', 'ru': '🔄 Умная сортировка' },
    'about.features.smart.desc': { 'zh-CN': '基于网站内容和用户习惯自动分类书签', 'zh-TW': '根據網站內容與使用習慣自動分類書籤', 'en': 'Automatically categorizes based on site content and habits', 'ru': 'Автокатегоризация по содержимому и привычкам' },
    'about.features.backup': { 'zh-CN': '💾 安全备份', 'zh-TW': '💾 安全備份', 'en': '💾 Safe Backup', 'ru': '💾 Безопасное резервирование' },
    'about.features.backup.desc': { 'zh-CN': '支持一键备份，保护您的书签数据', 'zh-TW': '支援一鍵備份，保護您的書籤資料', 'en': 'One-click backup keeps your bookmarks safe', 'ru': 'Резервирование в один клик' },
    'about.features.rules': { 'zh-CN': '🎯 自定义规则', 'zh-TW': '🎯 自訂規則', 'en': '🎯 Custom Rules', 'ru': '🎯 Пользовательские правила' },
    'about.features.rules.desc': { 'zh-CN': '创建个性化分类规则，满足不同需求', 'zh-TW': '建立個人化分類規則，滿足不同需求', 'en': 'Create personalized rules for every need', 'ru': 'Создавайте персональные правила под любые задачи' },

    // Rules
    'rules.header': { 'zh-CN': '分类规则管理', 'zh-TW': '分類規則管理', 'en': 'Manage Category Rules', 'ru': 'Управление правилами' },
    'rules.add': { 'zh-CN': '添加规则', 'zh-TW': '新增規則', 'en': 'Add Rule', 'ru': 'Добавить правило' },
    'rules.reset': { 'zh-CN': '重置为默认', 'zh-TW': '重設為預設', 'en': 'Reset to Default', 'ru': 'Сбросить к стандартным' },
    'rules.desc': { 'zh-CN': '配置书签的自动分类规则。系统会根据书签的标题和URL中的关键词自动归类到相应的文件夹。', 'zh-TW': '設定書籤的自動分類規則。系統會根據標題與 URL 關鍵字自動歸類。', 'en': 'Configure auto-categorization rules. The system uses title and URL keywords to classify.', 'ru': 'Настройте авто-категоризацию: классификация по ключам в заголовках и URL.' },
    'rules.empty.text': { 'zh-CN': '还没有配置任何分类规则', 'zh-TW': '尚未設定任何分類規則', 'en': 'No rules configured yet', 'ru': 'Правила пока не настроены' },
    'rules.empty.btn': { 'zh-CN': '添加第一个规则', 'zh-TW': '新增第一個規則', 'en': 'Add the first rule', 'ru': 'Добавить первое правило' },

    // AI settings
    'ai.header': { 'zh-CN': '🤖 AI 分类助手', 'zh-TW': '🤖 AI 分類助理', 'en': '🤖 AI Classification Assistant', 'ru': '🤖 Помощник классификации AI' },
    'ai.desc': { 'zh-CN': '使用人工智能为您的书签提供智能分类建议，让书签管理更加高效', 'zh-TW': '使用人工智慧為書籤提供分類建議，讓管理更高效', 'en': 'Use AI to suggest categories and manage bookmarks efficiently', 'ru': 'AI предлагает категории и ускоряет управление закладками' },
    'ai.enable': { 'zh-CN': '启用 AI 分类建议', 'zh-TW': '啟用 AI 分類建議', 'en': 'Enable AI category suggestions', 'ru': 'Включить рекомендации AI' },
    'ai.enable.desc': { 'zh-CN': '开启后，系统将使用 AI 为未分类的书签提供智能分类建议', 'zh-TW': '開啟後，系統會為未分類書籤提供 AI 建議', 'en': 'AI suggests categories for uncategorized bookmarks', 'ru': 'AI предлагает категории для неклассифицированных закладок' },
    'ai.service.header': { 'zh-CN': '⚙️ 服务配置', 'zh-TW': '⚙️ 服務設定', 'en': '⚙️ Service Configuration', 'ru': '⚙️ Настройка сервиса' },
    'ai.provider.label': { 'zh-CN': 'AI 服务商', 'zh-TW': 'AI 服務商', 'en': 'AI Provider', 'ru': 'Провайдер AI' },
    'ai.provider.desc': { 'zh-CN': '选择您偏好的 AI 服务提供商', 'zh-TW': '選擇偏好的 AI 服務提供商', 'en': 'Choose your preferred AI provider', 'ru': 'Выберите провайдера AI' },
    'ai.model.label': { 'zh-CN': '模型选择', 'zh-TW': '模型選擇', 'en': 'Model', 'ru': 'Модель' },
    'ai.model.desc': { 'zh-CN': '不同模型的准确性和成本不同', 'zh-TW': '不同模型的準確性與成本不同', 'en': 'Models vary in accuracy and cost', 'ru': 'Точность и стоимость зависят от модели' },
    'ai.apiKey.label': { 'zh-CN': 'API Key', 'zh-TW': 'API Key', 'en': 'API Key', 'ru': 'API ключ' },
    'ai.apiKey.placeholder': { 'zh-CN': '请输入您的 API Key', 'zh-TW': '請輸入您的 API Key', 'en': 'Enter your API Key', 'ru': 'Введите API ключ' },
    'ai.apiKey.desc': { 'zh-CN': '🔒 您的 API Key 将安全存储在本地，不会上传到任何服务器', 'zh-TW': '🔒 您的 API Key 會安全儲存在本機，不會上傳', 'en': '🔒 Your API Key is stored locally and never uploaded', 'ru': '🔒 Ключ хранится локально и не отправляется' },
    'ai.apiEndpoint.label': { 'zh-CN': 'API 端点 (可选)', 'zh-TW': 'API 端點（可選）', 'en': 'API Endpoint (optional)', 'ru': 'API-адрес (опционально)' },
    'ai.apiEndpoint.placeholder': { 'zh-CN': '自定义 API 端点，如代理地址', 'zh-TW': '自訂 API 端點，如代理地址', 'en': 'Custom API endpoint, e.g. proxy URL', 'ru': 'Пользовательский API-адрес, например прокси' },
    'ai.apiEndpoint.desc': { 'zh-CN': '留空使用默认端点，或填入自定义代理地址', 'zh-TW': '留空使用預設端點，或填入自訂代理地址', 'en': 'Leave empty for default or use custom proxy', 'ru': 'Оставьте пустым или укажите прокси' },
    'ai.maxTokens.label': { 'zh-CN': '最大 Token 数', 'zh-TW': '最大 Token 數', 'en': 'Max Tokens', 'ru': 'Макс. токены' },
    'ai.maxTokens.desc': { 'zh-CN': '控制 AI 响应长度，数值越大成本越高', 'zh-TW': '控制 AI 回應長度，數值越大成本越高', 'en': 'Controls response length; higher values cost more', 'ru': 'Длина ответа; выше — дороже' },
    'ai.batchSize.label': { 'zh-CN': '分批大小', 'zh-TW': '分批大小', 'en': 'Batch Size', 'ru': 'Размер пакета' },
    'ai.batchSize.desc': { 'zh-CN': '每次发送给 AI 的条目数量，适当增大可减少请求次数', 'zh-TW': '每次送給 AI 的項目數量，適度增大可減少請求次數', 'en': 'Number of items per AI request; increasing reduces request count', 'ru': 'Количество элементов в запросе; увеличение снижает число запросов' },
    'ai.concurrency.label': { 'zh-CN': '并发请求数', 'zh-TW': '並發請求數', 'en': 'Concurrency', 'ru': 'Параллелизм' },
    'ai.concurrency.desc': { 'zh-CN': '同时进行的 AI 请求数，受服务速率限制影响（建议 ≤ 5）', 'zh-TW': '同時進行的 AI 請求數，受服務速率限制影響（建議 ≤ 5）', 'en': 'Concurrent AI requests; limited by provider rate (recommend ≤ 5)', 'ru': 'Число параллельных запросов; ограничено скоростью провайдера (рекомендуется ≤ 5)' },
    'ai.test.btn': { 'zh-CN': '🔗 测试连接', 'zh-TW': '🔗 測試連線', 'en': '🔗 Test Connection', 'ru': '🔗 Проверить соединение' },
    'ai.organize.btn': { 'zh-CN': '⚡ 自动整理', 'zh-TW': '⚡ 自動整理', 'en': '⚡ Auto Organize', 'ru': '⚡ Автосортировка' },
    'ai.organize.desc': { 'zh-CN': '基于当前配置直接执行自动整理（如启用 AI 将进行优化）', 'zh-TW': '基於目前設定直接執行自動整理（如啟用 AI 將進行優化）', 'en': 'Run auto organization with current settings (uses AI if enabled)', 'ru': 'Запустить автосортировку с текущими настройками (если включено, используется AI)' },

    // Preferences
    'pref.header': { 'zh-CN': '🎯 分类偏好', 'zh-TW': '🎯 分類偏好', 'en': '🎯 Category Preferences', 'ru': '🎯 Настройки категорий' },
    'pref.language.label': { 'zh-CN': '分类语言', 'zh-TW': '分類語言', 'en': 'Category Language', 'ru': 'Язык категорий' },
    'pref.language.auto': { 'zh-CN': '自动检测', 'zh-TW': '自動偵測', 'en': 'Auto detect', 'ru': 'Авто' },
    'pref.language.desc': { 'zh-CN': 'AI 生成分类名称的语言', 'zh-TW': 'AI 產生分類名稱的語言', 'en': 'Language for AI-generated category names', 'ru': 'Язык названий категорий от AI' },
    'pref.max.label': { 'zh-CN': '最大分类数', 'zh-TW': '最大分類數', 'en': 'Max Categories', 'ru': 'Макс. категорий' },
    'pref.max.desc': { 'zh-CN': 'AI 建议的最大分类数量', 'zh-TW': 'AI 建議的最大分類數量', 'en': 'Max number of suggested categories', 'ru': 'Макс. число рекомендуемых категорий' },

    // Help content
    'help.import.header': { 'zh-CN': '📥 导入书签', 'zh-TW': '📥 匯入書籤', 'en': '📥 Import Bookmarks', 'ru': '📥 Импорт закладок' },
    'help.import.desc': { 'zh-CN': '如需恢复或导入书签，请使用浏览器自带的导入功能：', 'zh-TW': '如需恢復或匯入，請使用瀏覽器內建匯入功能：', 'en': 'To restore or import, use the browser’s import feature:', 'ru': 'Для восстановления или импорта используйте функцию браузера:' },
    'help.import.step1': { 'zh-CN': '打开 Chrome 设置 → 书签 → 导入书签和设置', 'zh-TW': '打開 Chrome 設定 → 書籤 → 匯入書籤與設定', 'en': 'Open Chrome Settings → Bookmarks → Import bookmarks and settings', 'ru': 'Откройте Настройки Chrome → Закладки → Импорт закладок и настроек' },
    'help.import.step2': { 'zh-CN': '选择要导入的书签文件', 'zh-TW': '選擇要匯入的書籤檔案', 'en': 'Select the bookmark file to import', 'ru': 'Выберите файл закладок для импорта' },
    'help.import.step3': { 'zh-CN': '确认导入后，重新运行 TidyMark 整理功能', 'zh-TW': '確認匯入後，重新執行 TidyMark 整理功能', 'en': 'After import, run TidyMark organizing again', 'ru': 'После импорта снова запустите упорядочивание TidyMark' },

    'help.backup.header': { 'zh-CN': '💾 备份建议', 'zh-TW': '💾 備份建議', 'en': '💾 Backup Tips', 'ru': '💾 Советы по резервированию' },
    'help.backup.desc': { 'zh-CN': '为了保护您的书签数据，建议：', 'zh-TW': '為了保護您的書籤資料，建議：', 'en': 'To protect your data, we suggest:', 'ru': 'Чтобы защитить данные, рекомендуем:' },
    'help.backup.rec1': { 'zh-CN': '定期使用浏览器的导出功能备份书签', 'zh-TW': '定期使用瀏覽器導出功能備份書籤', 'en': 'Regularly export bookmarks using the browser', 'ru': 'Регулярно экспортируйте закладки средствами браузера' },
    'help.backup.rec2': { 'zh-CN': '开启 Chrome 同步功能', 'zh-TW': '開啟 Chrome 同步功能', 'en': 'Enable Chrome Sync', 'ru': 'Включите синхронизацию Chrome' },
    'help.backup.rec3': { 'zh-CN': '在整理前先导出当前书签', 'zh-TW': '在整理前先導出目前書籤', 'en': 'Export current bookmarks before organizing', 'ru': 'Экспортируйте текущие закладки перед упорядочиванием' },

    'help.reset.header': { 'zh-CN': '🔄 重置数据', 'zh-TW': '🔄 重置資料', 'en': '🔄 Reset Data', 'ru': '🔄 Сброс данных' },
    'help.reset.desc': { 'zh-CN': '如需清除 TidyMark 的分类数据：', 'zh-TW': '如需清除 TidyMark 的分類資料：', 'en': 'To clear TidyMark’s classification data:', 'ru': 'Чтобы очистить данные класcификации TidyMark:' },
    'help.reset.btn': { 'zh-CN': '清除分类数据', 'zh-TW': '清除分類資料', 'en': 'Clear classification data', 'ru': 'Очистить данные классификации' },
    'help.reset.warn': { 'zh-CN': '⚠️ 这将清除所有自定义分类规则，但不会影响浏览器书签', 'zh-TW': '⚠️ 這將清除所有自訂分類規則，但不影響瀏覽器書籤', 'en': '⚠️ This clears custom rules but not browser bookmarks', 'ru': '⚠️ Удаляет правила, но не затрагивает закладки браузера' },

    // Footer
    'footer.app': { 'zh-CN': 'TidyMark - 智能书签管理扩展 v1.0.0', 'zh-TW': 'TidyMark - 智慧書籤管理擴充 v1.0.0', 'en': 'TidyMark - Smart Bookmark Manager v1.0.0', 'ru': 'TidyMark — менеджер закладок v1.0.0' },
    'footer.autosave': { 'zh-CN': '设置会自动保存，无需手动操作', 'zh-TW': '設定會自動儲存，無需手動操作', 'en': 'Settings auto-save, no manual action needed', 'ru': 'Настройки сохраняются автоматически' },

    // Rule modal
    'modal.rule.title': { 'zh-CN': '添加分类规则', 'zh-TW': '新增分類規則', 'en': 'Add Category Rule', 'ru': 'Добавить правило категории' },
    'modal.rule.category.label': { 'zh-CN': '分类名称', 'zh-TW': '分類名稱', 'en': 'Category Name', 'ru': 'Название категории' },
    'modal.rule.category.placeholder': { 'zh-CN': '请输入分类名称，如：技术文档、新闻资讯等', 'zh-TW': '請輸入分類名稱，如：技術文件、新聞資訊等', 'en': 'Enter a category name, e.g. Docs, News', 'ru': 'Введите название, например Документы, Новости' },
    'modal.rule.category.hint': { 'zh-CN': '分类名称将用于创建书签文件夹', 'zh-TW': '分類名稱將用於建立書籤資料夾', 'en': 'Used as the bookmark folder name', 'ru': 'Используется как имя папки закладок' },
    'modal.rule.keywords.label': { 'zh-CN': '关键词', 'zh-TW': '關鍵字', 'en': 'Keywords', 'ru': 'Ключевые слова' },
    'modal.rule.keywords.placeholder': { 'zh-CN': '请输入关键词，用逗号分隔，如：javascript, react, 前端', 'zh-TW': '請輸入關鍵字，使用逗號分隔，如：javascript, react, 前端', 'en': 'Enter keywords, comma-separated: javascript, react, frontend', 'ru': 'Введите ключи через запятую: javascript, react, frontend' },
    'modal.rule.keywords.hint': { 'zh-CN': '系统将根据这些关键词自动匹配网站内容进行分类', 'zh-TW': '系統將依這些關鍵字自動比對網站內容進行分類', 'en': 'System matches site content using these keywords', 'ru': 'Система классифицирует по совпадению с ключами' },
    'modal.rule.preview.label': { 'zh-CN': '关键词预览：', 'zh-TW': '關鍵字預覽：', 'en': 'Keywords preview:', 'ru': 'Предпросмотр ключей:' },
    'modal.cancel': { 'zh-CN': '取消', 'zh-TW': '取消', 'en': 'Cancel', 'ru': 'Отмена' },
    'modal.confirm': { 'zh-CN': '确定', 'zh-TW': '確定', 'en': 'Confirm', 'ru': 'Подтвердить' },

    // Popup loading/error/help warning
    'loading.text': { 'zh-CN': '加载中...', 'zh-TW': '載入中...', 'en': 'Loading...', 'ru': 'Загрузка...' },
    'error.retry': { 'zh-CN': '重试', 'zh-TW': '重試', 'en': 'Retry', 'ru': 'Повторить' },
    'backup.warning': { 'zh-CN': '使用插件前请先手动导出备份', 'zh-TW': '使用擴充前請先手動匯出備份', 'en': 'Please export bookmarks before using the extension', 'ru': 'Сделайте резервную копию перед использованием' },

    // Feature tips (first-time guidance)
    'tips.main': { 'zh-CN': '主要功能', 'zh-TW': '主要功能', 'en': 'Main Features', 'ru': 'Основные функции' },
    'tips.main.desc': { 'zh-CN': 'TidyMark 可以根据网站内容和 URL 自动为您的书签分类，让书签管理变得简单高效。', 'zh-TW': 'TidyMark 可以根據網站內容與 URL 自動為您的書籤分類，讓管理更簡單高效。', 'en': 'TidyMark auto-classifies bookmarks by site content and URL for simpler, efficient management.', 'ru': 'TidyMark автоматически классифицирует закладки по содержимому сайта и URL, упрощая и ускоряя управление.' },
    'tips.quickstart': { 'zh-CN': '快速开始', 'zh-TW': '快速開始', 'en': 'Quick Start', 'ru': 'Быстрый старт' },
    'tips.quickstart.desc': { 'zh-CN': '系统已内置常用的分类规则，包括开发、社交、购物等分类，让您的书签井然有序。', 'zh-TW': '系統已內建常用分類規則，包括開發、社群、購物等，讓書籤井然有序。', 'en': 'Built-in rules for common categories (dev, social, shopping) keep bookmarks organized.', 'ru': 'Встроенные правила для популярных категорий (разработка, соцсети, покупки) упорядочивают закладки.' },
    'tips.customize': { 'zh-CN': '个性化配置', 'zh-TW': '個性化設定', 'en': 'Customize', 'ru': 'Настройка' },
    'tips.customize.desc': { 'zh-CN': '在设置中您可以自定义分类规则，调整分类逻辑，让整理更符合您的使用习惯。', 'zh-TW': '在設定中可自訂分類規則、調整邏輯，讓整理更符合使用習慣。', 'en': 'In Settings, customize rules and tuning to fit your workflow.', 'ru': 'В настройках можно создать свои правила и скорректировать логику под ваши привычки.' },

    // Preview modal/page
    'preview.title': { 'zh-CN': '整理预览与确认', 'zh-TW': '整理預覽與確認', 'en': 'Organize Preview & Confirm', 'ru': 'Предпросмотр и подтверждение' },
    'preview.summary': { 'zh-CN': '共 {total} 个书签，拟分类 {classified} 个，其余将归入“其他”（如存在）。', 'zh-TW': '共 {total} 個書籤，擬分類 {classified} 個，其餘將歸入「其他」（如存在）。', 'en': '{total} bookmarks total; {classified} categorized; others go to “Misc” if any.', 'ru': 'Всего {total} закладок; {classified} категоризировано; остальные — в «Прочее», если есть.' },
    'preview.expand': { 'zh-CN': '展开全部', 'zh-TW': '展開全部', 'en': 'Expand all', 'ru': 'Развернуть все' },
    'preview.collapse': { 'zh-CN': '收起', 'zh-TW': '收起', 'en': 'Collapse', 'ru': 'Свернуть' },
    'preview.info': { 'zh-CN': '手动调整即将支持：您将可以在此界面移动、排除或合并分类。', 'zh-TW': '手動調整即將支援：您將能在此移動、排除或合併分類。', 'en': 'Manual adjustments coming soon: move, exclude, and merge categories here.', 'ru': 'Скоро: ручные правки — перенос, исключение и объединение категорий.' },
    'preview.infoManual': { 'zh-CN': '现在支持手动调整：可为每条书签选择或新增分类。', 'zh-TW': '現在支援手動調整：可為每條書籤選擇或新增分類。', 'en': 'Manual adjustments supported: choose or add categories per bookmark.', 'ru': 'Поддерживаются ручные правки: выбор или добавление категории для закладки.' },
    'preview.clickHint': { 'zh-CN': '点击书签切换分类', 'zh-TW': '點擊書籤切換分類', 'en': 'Click bookmark to switch category', 'ru': 'Нажмите на закладку, чтобы сменить категорию' },
    'preview.cancel': { 'zh-CN': '取消', 'zh-TW': '取消', 'en': 'Cancel', 'ru': 'Отмена' },
    'preview.confirm': { 'zh-CN': '确认整理', 'zh-TW': '確認整理', 'en': 'Confirm Organize', 'ru': 'Подтвердить сортировку' },

    // Picker modal
    'preview.pickCategory': { 'zh-CN': '选择分类', 'zh-TW': '選擇分類', 'en': 'Pick Category', 'ru': 'Выберите категорию' },
    'preview.addCategory': { 'zh-CN': '新增分类…', 'zh-TW': '新增分類…', 'en': 'Add category…', 'ru': 'Добавить категорию…' },
    'preview.inputNewCategory': { 'zh-CN': '请输入新分类名', 'zh-TW': '請輸入新分類名稱', 'en': 'Enter a new category name', 'ru': 'Введите название новой категории' },
    'preview.apply': { 'zh-CN': '应用', 'zh-TW': '套用', 'en': 'Apply', 'ru': 'Применить' },

    // Common
    'common.viewMore': { 'zh-CN': '查看更多', 'zh-TW': '檢視更多', 'en': 'View more', 'ru': 'Показать ещё' },
    'common.noTitle': { 'zh-CN': '(无标题)', 'zh-TW': '(無標題)', 'en': '(Untitled)', 'ru': '(Без названия)' },
    'common.collapse': { 'zh-CN': '收起', 'zh-TW': '收起', 'en': 'Collapse', 'ru': 'Свернуть' }
  };
  Object.assign(translations, translationsExt);
  // Extend with Dead Links (invalid bookmarks) page keys
  const translationsDead = {
    'tabs.dead': { 'zh-CN': '失效书签', 'zh-TW': '失效書籤', 'en': 'Dead Links', 'ru': 'Недействительные ссылки' },
    'dead.header': { 'zh-CN': '🔎 失效书签检测', 'zh-TW': '🔎 失效書籤檢測', 'en': '🔎 Dead Link Checker', 'ru': '🔎 Проверка недействительных ссылок' },
    'dead.desc': { 'zh-CN': '检测不可访问的书签，点击项目可打开页面确认，支持批量删除', 'zh-TW': '檢測不可訪問的書籤，點擊項目可打開頁面確認，支援批次刪除', 'en': 'Detect unreachable bookmarks; click to open for verification; supports bulk delete', 'ru': 'Определяет недоступные закладки; клик — открыть для проверки; поддерживается массовое удаление' },
    'dead.scan.start': { 'zh-CN': '开始检测', 'zh-TW': '開始檢測', 'en': 'Start Scan', 'ru': 'Начать проверку' },
    'dead.scan.running': { 'zh-CN': '正在检测...', 'zh-TW': '正在檢測...', 'en': 'Scanning...', 'ru': 'Проверка...' },
    'dead.scan.fail': { 'zh-CN': '扫描失败，请稍后再试', 'zh-TW': '掃描失敗，請稍後再試', 'en': 'Scan failed, please try again later', 'ru': 'Сбой проверки, попробуйте позже' },
    'dead.selectAll': { 'zh-CN': '全选', 'zh-TW': '全選', 'en': 'Select All', 'ru': 'Выбрать все' },
    'dead.deleteSelected': { 'zh-CN': '删除选中', 'zh-TW': '刪除選中', 'en': 'Delete Selected', 'ru': 'Удалить выбранные' },
    'dead.delete.noSelection': { 'zh-CN': '请选择需要删除的书签', 'zh-TW': '請選擇需要刪除的書籤', 'en': 'Please select bookmarks to delete', 'ru': 'Выберите закладки для удаления' },
    'dead.delete.processing': { 'zh-CN': '删除中...', 'zh-TW': '刪除中...', 'en': 'Deleting...', 'ru': 'Удаление...' },
    'dead.delete.success': { 'zh-CN': '已删除 {count} 条失效书签', 'zh-TW': '已刪除 {count} 條失效書籤', 'en': 'Deleted {count} dead bookmarks', 'ru': 'Удалено недействительных закладок: {count}' },
    'dead.delete.fail': { 'zh-CN': '删除失败，请稍后再试', 'zh-TW': '刪除失敗，請稍後再試', 'en': 'Delete failed, please try again later', 'ru': 'Не удалось удалить, попробуйте позже' },
    'dead.moveSelected': { 'zh-CN': '挪到“失效”文件夹', 'zh-TW': '移到「失效」資料夾', 'en': 'Move to “Dead” folder', 'ru': 'Переместить в папку «Недействительные»' },
    'dead.move.processing': { 'zh-CN': '移动中...', 'zh-TW': '移動中...', 'en': 'Moving...', 'ru': 'Перемещение...' },
    'dead.move.success': { 'zh-CN': '已移动 {count} 条到“{folder}”', 'zh-TW': '已移動 {count} 條到「{folder}」', 'en': 'Moved {count} to “{folder}”', 'ru': 'Перемещено: {count} в «{folder}»' },
    'dead.move.fail': { 'zh-CN': '移动失败，请稍后再试', 'zh-TW': '移動失敗，請稍後再試', 'en': 'Move failed, please try again later', 'ru': 'Не удалось переместить, попробуйте позже' },
    'dead.folder': { 'zh-CN': '失效书签', 'zh-TW': '失效書籤', 'en': 'Dead Links', 'ru': 'Недействительные ссылки' },
    'dead.strict.label': { 'zh-CN': '严格检测模式', 'zh-TW': '嚴格檢測模式', 'en': 'Strict Mode', 'ru': 'Строгий режим' },
    'dead.strict.desc': { 'zh-CN': '更严格：需多重验证均失败才判定失效，误报更少', 'zh-TW': '更嚴格：需多重驗證皆失敗才判定失效，誤判更少', 'en': 'Stricter: mark dead only if multiple checks fail; fewer false positives', 'ru': 'Строже: недействительно только при нескольких неудачных проверках; меньше ложных срабатываний' },
    'dead.none': { 'zh-CN': '没有发现失效书签', 'zh-TW': '沒有發現失效書籤', 'en': 'No dead bookmarks found', 'ru': 'Недействительных закладок не обнаружено' },
    'dead.checkbox': { 'zh-CN': '选择', 'zh-TW': '選擇', 'en': 'Select', 'ru': 'Выбрать' },
    'dead.status.unreachable': { 'zh-CN': '不可访问', 'zh-TW': '不可訪問', 'en': 'Unreachable', 'ru': 'Недоступно' }
  };
  Object.assign(translations, translationsDead);

  function normalize(lang) {
    if (!lang) return 'en';
    lang = lang.toLowerCase();
    if (lang.startsWith('zh')) {
      return lang.includes('tw') || lang.includes('hk') ? 'zh-TW' : 'zh-CN';
    }
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('ru')) return 'ru';
    return 'en';
  }

  async function getStoredLanguage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['language']);
        return result.language;
      }
    } catch {}
    try {
      return localStorage.getItem('tidymark_language');
    } catch {}
    return null;
  }

  async function setStoredLanguage(lang) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ language: lang });
        return;
      }
    } catch {}
    try {
      localStorage.setItem('tidymark_language', lang);
    } catch {}
  }

  function getLanguageSync() {
    return window.__tidymark_lang || 'en';
  }

  async function init() {
    const stored = await getStoredLanguage();
    const autoLang = normalize(navigator.language || navigator.userLanguage);
    const lang = normalize(stored || autoLang);
    window.__tidymark_lang = supported.includes(lang) ? lang : 'en';
    applyTranslations();
  }

  function t(key) {
    const lang = getLanguageSync();
    const rec = translations[key];
    if (!rec) return key;
    return rec[lang] || rec['en'] || key;
  }

  // Translation with interpolation
  function tf(key, params = {}) {
    let str = t(key);
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
    return str;
  }

  function translateCategory(key) {
    const lang = getLanguageSync();
    const rec = categoryMap[key];
    if (!rec) return key;
    return rec[lang] || rec['en'] || key;
  }

  // Reverse lookup for category names
  let categoryReverse = null;
  function buildCategoryReverse() {
    categoryReverse = {};
    Object.entries(categoryMap).forEach(([key, langs]) => {
      Object.values(langs).forEach(name => {
        if (!name) return;
        const normalized = String(name).toLowerCase();
        categoryReverse[normalized] = key;
      });
    });
  }

  function resolveCategoryKeyByName(name) {
    if (!name) return null;
    if (!categoryReverse) buildCategoryReverse();
    const normalized = String(name).toLowerCase();
    return categoryReverse[normalized] || null;
  }

  function translateCategoryByName(name) {
    const key = resolveCategoryKeyByName(name);
    return key ? translateCategory(key) : name;
  }

  function applyTranslations(root = document) {
    if (!root) return;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });
  }

  async function setLanguage(lang) {
    const normalized = normalize(lang);
    window.__tidymark_lang = normalized;
    await setStoredLanguage(normalized);
    applyTranslations();
  }

  window.I18n = { init, t, tf, setLanguage, applyTranslations, translateCategory, translateCategoryByName, resolveCategoryKeyByName, getLanguageSync };
})();