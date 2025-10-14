// Simple i18n service
(function() {
  // Make it work in window, worker (service worker), or node-like env
  const env = (typeof window !== 'undefined')
    ? window
    : (typeof self !== 'undefined')
      ? self
      : globalThis;
  const supported = ['zh-CN', 'zh-TW', 'en', 'ru'];
  // Fallback mapping for category names used by background rules
  // Ensures translateCategoryByName can normalize display even if categoryMap lacks an entry
  const ADDITIONAL_CATEGORY_PAIRS = {
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
  const ADDITIONAL_CATEGORY_PAIRS_REVERSE = Object.fromEntries(Object.entries(ADDITIONAL_CATEGORY_PAIRS).map(([zh,en]) => [String(en), String(zh)]));
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
    'tabs.organize': { 'zh-CN': '整理', 'zh-TW': '整理', 'en': 'Organize', 'ru': 'Упорядочить' },
    'tabs.ai': { 'zh-CN': 'AI 配置', 'zh-TW': 'AI 設定', 'en': 'AI Settings', 'ru': 'Настройки AI' },
    'tabs.help': { 'zh-CN': '帮助', 'zh-TW': '說明', 'en': 'Help', 'ru': 'Помощь' },
  'tabs.sync': { 'zh-CN': '同步导出', 'zh-TW': '同步導出', 'en': 'Sync & Export', 'ru': 'Синхронизация и экспорт' },

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
    'help.desc': { 'zh-CN': '查看使用说明与备份提示，包括导入、备份和重置', 'zh-TW': '查看使用說明與備份提示，包含匯入、備份與重置', 'en': 'Usage notes and backup tips: import, backup, reset', 'ru': 'Справка и советы: импорт, резервное копирование, сброс' },
    // About section
    'about.header': { 'zh-CN': '关于 TidyMark', 'zh-TW': '關於 TidyMark', 'en': 'About TidyMark', 'ru': 'О TidyMark' }
  };

  // Extended UI translations
  const translationsExt = {
    // Sync & Export
    'sync.header': { 'zh-CN': '🔁 同步与导出', 'zh-TW': '🔁 同步與匯出', 'en': '🔁 Sync & Export', 'ru': '🔁 Синхронизация и экспорт' },
    'sync.desc': { 'zh-CN': '在此导出/导入备份，并配置同步到 GitHub', 'zh-TW': '在此匯出/匯入備份，並設定同步到 GitHub', 'en': 'Export/import backups and configure GitHub sync', 'ru': 'Экспорт/импорт резервных копий и настройка синхронизации с GitHub' },
    'sync.export.header': { 'zh-CN': '💾 本地备份', 'zh-TW': '💾 本地備份', 'en': '💾 Local Backup', 'ru': '💾 Локальная копия' },
    'sync.export.btn': { 'zh-CN': '导出备份（JSON）', 'zh-TW': '匯出備份（JSON）', 'en': 'Export Backup (JSON)', 'ru': 'Экспорт резервной копии (JSON)' },
    'sync.import.btn': { 'zh-CN': '导入备份（JSON）', 'zh-TW': '匯入備份（JSON）', 'en': 'Import Backup (JSON)', 'ru': 'Импорт резервной копии (JSON)' },
    'sync.export.tip': { 'zh-CN': '建议在整理前导出备份；导入将覆盖当前数据。', 'zh-TW': '建議在整理前匯出備份；匯入將覆蓋目前資料。', 'en': 'Export before organizing; import will overwrite current data.', 'ru': 'Экспортируйте перед упорядочиванием; импорт перезапишет текущие данные.' },
    'sync.github.header': { 'zh-CN': '☁️ GitHub 云同步', 'zh-TW': '☁️ GitHub 雲端同步', 'en': '☁️ GitHub Cloud Sync', 'ru': '☁️ Синхронизация с GitHub' },
    'sync.github.desc': { 'zh-CN': '配置个人访问令牌与仓库信息，将备份文件同步到指定路径', 'zh-TW': '設定個人存取權杖與倉庫資訊，將備份檔同步到指定路徑', 'en': 'Set up PAT and repo info to sync backup to a path', 'ru': 'Настройте PAT и репозиторий для синхронизации резервной копии по пути' },
    'sync.github.token.label': { 'zh-CN': 'GitHub Token', 'zh-TW': 'GitHub Token', 'en': 'GitHub Token', 'ru': 'Токен GitHub' },
    'sync.github.token.ph': { 'zh-CN': '请输入个人访问令牌（PAT）', 'zh-TW': '請輸入個人存取權杖（PAT）', 'en': 'Enter Personal Access Token (PAT)', 'ru': 'Введите персональный токен доступа (PAT)' },
    'sync.github.owner.label': { 'zh-CN': '仓库所有者', 'zh-TW': '倉庫擁有者', 'en': 'Repository Owner', 'ru': 'Владелец репозитория' },
    'sync.github.owner.ph': { 'zh-CN': '如：your-github-username', 'zh-TW': '如：your-github-username', 'en': 'e.g., your-github-username', 'ru': 'например, your-github-username' },
    'sync.github.repo.label': { 'zh-CN': '仓库名', 'zh-TW': '倉庫名稱', 'en': 'Repository', 'ru': 'Репозиторий' },
    'sync.github.repo.ph': { 'zh-CN': '如：your-repo', 'zh-TW': '如：your-repo', 'en': 'e.g., your-repo', 'ru': 'например, your-repo' },
    'sync.github.branch.label': { 'zh-CN': '分支', 'zh-TW': '分支', 'en': 'Branch', 'ru': 'Ветка' },
    'sync.github.branch.ph': { 'zh-CN': '如：main', 'zh-TW': '如：main', 'en': 'e.g., main', 'ru': 'например, main' },
    'sync.github.path.label': { 'zh-CN': '文件路径', 'zh-TW': '檔案路徑', 'en': 'File Path', 'ru': 'Путь к файлу' },
    'sync.github.path.ph': { 'zh-CN': '如：tidymark/backups/tidymark-backup.json', 'zh-TW': '如：tidymark/backups/tidymark-backup.json', 'en': 'e.g., tidymark/backups/tidymark-backup.json', 'ru': 'например, tidymark/backups/tidymark-backup.json' },
    'sync.github.run': { 'zh-CN': '一键同步到 GitHub', 'zh-TW': '一鍵同步到 GitHub', 'en': 'Sync to GitHub', 'ru': 'Синхронизировать с GitHub' },
    'sync.github.status.idle': { 'zh-CN': '尚未同步', 'zh-TW': '尚未同步', 'en': 'Not synced yet', 'ru': 'Ещё не синхронизировано' },
    'sync.github.status.syncing': { 'zh-CN': '正在同步到 GitHub…', 'zh-TW': '正在同步到 GitHub…', 'en': 'Syncing to GitHub…', 'ru': 'Синхронизация с GitHub…' },
    'sync.github.status.success': { 'zh-CN': '同步成功', 'zh-TW': '同步成功', 'en': 'Sync successful', 'ru': 'Синхронизация завершена' },
    'sync.github.status.fail': { 'zh-CN': '同步失败：{error}', 'zh-TW': '同步失敗：{error}', 'en': 'Sync failed: {error}', 'ru': 'Сбой синхронизации: {error}' },
    // Config sync (new)
    'sync.github.config.upload': { 'zh-CN': '备份配置到 GitHub', 'zh-TW': '備份設定到 GitHub', 'en': 'Backup config to GitHub', 'ru': 'Резервная конфигурация в GitHub' },
    'sync.github.config.import': { 'zh-CN': '从 GitHub 同步配置', 'zh-TW': '從 GitHub 同步設定', 'en': 'Import config from GitHub', 'ru': 'Импорт конфигурации из GitHub' },
    'sync.github.config.status.idle': { 'zh-CN': '尚未进行配置同步', 'zh-TW': '尚未進行設定同步', 'en': 'No config sync yet', 'ru': 'Синхр. конфигурации не выполнялась' },
    'sync.github.config.status.success': { 'zh-CN': '配置同步成功', 'zh-TW': '設定同步成功', 'en': 'Config sync successful', 'ru': 'Синхронизация конфигурации прошла успешно' },
    'sync.github.config.uploading': { 'zh-CN': '正在备份配置到 GitHub…', 'zh-TW': '正在備份設定到 GitHub…', 'en': 'Backing up config to GitHub…', 'ru': 'Резервирование конфигурации в GitHub…' },
    'sync.github.config.importing': { 'zh-CN': '正在从 GitHub 同步配置…', 'zh-TW': '正在從 GitHub 同步設定…', 'en': 'Importing config from GitHub…', 'ru': 'Импорт конфигурации из GitHub…' },
    'sync.github.config.incomplete': { 'zh-CN': '请填写完整的 GitHub 配置', 'zh-TW': '請填寫完整的 GitHub 設定', 'en': 'Please fill in complete GitHub config', 'ru': 'Заполните полную конфигурацию GitHub' },
    'sync.github.config.success': { 'zh-CN': '配置同步成功', 'zh-TW': '設定同步成功', 'en': 'Config sync successful', 'ru': 'Синхронизация конфигурации прошла успешно' },
    'sync.github.config.fail': { 'zh-CN': '配置同步失败：{error}', 'zh-TW': '設定同步失敗：{error}', 'en': 'Config sync failed: {error}', 'ru': 'Сбой синхронизации конфигурации: {error}' },
    'sync.github.config.unsupported': { 'zh-CN': '当前版本或环境不支持配置同步功能，请更新或在扩展环境中重试。', 'zh-TW': '目前版本或環境不支援設定同步功能，請更新或在擴充環境中重試。', 'en': 'Config sync is not supported in this version or environment. Please update or try in extension context.', 'ru': 'Синхронизация конфигурации не поддерживается в этой версии или окружении. Обновите или попробуйте в контексте расширения.' },
    'sync.github.env.notAvailable': { 'zh-CN': '当前为预览页面，无法调用扩展后台。请在浏览器扩展环境中操作。', 'zh-TW': '目前為預覽頁面，無法呼叫擴充背景。請在瀏覽器擴充環境中操作。', 'en': 'This is a preview page; cannot call extension background. Please use within the browser extension.', 'ru': 'Это страница предварительного просмотра; невозможно вызвать фон расширения. Используйте в окружении расширения.' },
    // About
    'about.intro': { 'zh-CN': 'TidyMark 是一个智能书签管理扩展，帮助您自动整理和分类书签。', 'zh-TW': 'TidyMark 是一個智慧書籤管理擴充，協助您自動整理與分類書籤。', 'en': 'TidyMark is a smart bookmark manager that auto-organizes your bookmarks.', 'ru': 'TidyMark — умный менеджер закладок, автоматически упорядочивающий их.' },
    // About (keys used by options/index.html)
    'about.desc': { 'zh-CN': 'TidyMark 是一个智能书签管理扩展，帮助您自动整理和分类书签。', 'zh-TW': 'TidyMark 是一個智慧書籤管理擴充，協助您自動整理與分類書籤。', 'en': 'TidyMark is a smart bookmark manager that auto-organizes your bookmarks.', 'ru': 'TidyMark — умный менеджер закладок, автоматически упорядочивающий их.' },
    'about.features.smart': { 'zh-CN': '🔄 智能整理', 'zh-TW': '🔄 智慧整理', 'en': '🔄 Smart Organizing', 'ru': '🔄 Умная сортировка' },
    'about.features.smart.desc': { 'zh-CN': '基于网站内容和用户习惯自动分类书签', 'zh-TW': '根據網站內容與使用習慣自動分類書籤', 'en': 'Automatically categorizes based on site content and habits', 'ru': 'Автокатегоризация по содержимому и привычкам' },
    'about.smart.header': { 'zh-CN': '🔄 智能整理', 'zh-TW': '🔄 智慧整理', 'en': '🔄 Smart Organizing', 'ru': '🔄 Умная сортировка' },
    'about.smart.desc': { 'zh-CN': '基于网站内容和用户习惯自动分类书签', 'zh-TW': '根據網站內容與使用習慣自動分類書籤', 'en': 'Automatically categorizes based on site content and habits', 'ru': 'Автокатегоризация по содержимому и привычкам' },
    'about.features.backup': { 'zh-CN': '💾 安全备份', 'zh-TW': '💾 安全備份', 'en': '💾 Safe Backup', 'ru': '💾 Безопасное резервирование' },
    'about.features.backup.desc': { 'zh-CN': '支持一键备份，保护您的书签数据', 'zh-TW': '支援一鍵備份，保護您的書籤資料', 'en': 'One-click backup keeps your bookmarks safe', 'ru': 'Резервирование в один клик' },
    'about.backup.header': { 'zh-CN': '💾 安全备份', 'zh-TW': '💾 安全備份', 'en': '💾 Safe Backup', 'ru': '💾 Безопасное резервирование' },
    'about.backup.desc': { 'zh-CN': '支持一键备份，保护您的书签数据', 'zh-TW': '支援一鍵備份，保護您的書籤資料', 'en': 'One-click backup keeps your bookmarks safe', 'ru': 'Резервирование в один клик' },
    'about.features.rules': { 'zh-CN': '🎯 自定义规则', 'zh-TW': '🎯 自訂規則', 'en': '🎯 Custom Rules', 'ru': '🎯 Пользовательские правила' },
    'about.features.rules.desc': { 'zh-CN': '创建个性化分类规则，满足不同需求', 'zh-TW': '建立個人化分類規則，滿足不同需求', 'en': 'Create personalized rules for every need', 'ru': 'Создавайте персональные правила под любые задачи' },
    'about.rules.header': { 'zh-CN': '🎯 自定义规则', 'zh-TW': '🎯 自訂規則', 'en': '🎯 Custom Rules', 'ru': '🎯 Пользовательские правила' },
    'about.rules.desc': { 'zh-CN': '创建个性化分类规则，满足不同需求', 'zh-TW': '建立個人化分類規則，滿足不同需求', 'en': 'Create personalized rules for every need', 'ru': 'Создавайте персональные правила под любые задачи' },

    // Rules
    'rules.header': { 'zh-CN': '分类规则管理', 'zh-TW': '分類規則管理', 'en': 'Manage Category Rules', 'ru': 'Управление правилами' },
    'rules.add': { 'zh-CN': '添加规则', 'zh-TW': '新增規則', 'en': 'Add Rule', 'ru': 'Добавить правило' },
    'rules.edit': { 'zh-CN': '编辑规则', 'zh-TW': '編輯規則', 'en': 'Edit Rule', 'ru': 'Редактировать правило' },
    'rules.delete': { 'zh-CN': '删除规则', 'zh-TW': '刪除規則', 'en': 'Delete Rule', 'ru': 'Удалить правило' },
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
    'ai.infer.btn': { 'zh-CN': '🤖 AI 全量归类', 'zh-TW': '🤖 AI 全量歸類', 'en': '🤖 AI Full Categorize', 'ru': '🤖 Полная категоризация AI' },
    'ai.organize.desc': { 'zh-CN': '基于当前配置直接执行自动整理（如启用 AI 将进行优化）', 'zh-TW': '基於目前設定直接執行自動整理（如啟用 AI 將進行優化）', 'en': 'Run auto organization with current settings (uses AI if enabled)', 'ru': 'Запустить автосортировку с текущими настройками (если включено, используется AI)' },
    // Organize page quick actions & AI infer card
    'organize.quickBackup.btn': { 'zh-CN': '💾 备份书签', 'zh-TW': '💾 備份書籤', 'en': '💾 Backup Bookmarks', 'ru': '💾 Резервное копирование закладок' },
    'organize.quickGithubSync.btn': { 'zh-CN': '☁️ 同步到 GitHub', 'zh-TW': '☁️ 同步到 GitHub', 'en': '☁️ Sync to GitHub', 'ru': '☁️ Синхронизация с GitHub' },
    'ai.infer.header': { 'zh-CN': '🤖 AI 全量归类', 'zh-TW': '🤖 AI 全量歸類', 'en': '🤖 AI Full Categorize', 'ru': '🤖 Полная категоризация AI' },
    'ai.infer.desc': { 'zh-CN': '对全部书签做 AI 推理给出建议，需先配置模型，更智能但可能耗时。', 'zh-TW': '對全部書籤做 AI 推理給出建議，需先設定模型，更智慧但可能耗時。', 'en': 'Run AI inference over all bookmarks for suggestions; configure model first. Smarter but may take time.', 'ru': 'Запустить AI-инференс по всем закладкам; сначала настройте модель. Умнее, но может занять время.' },

    // AI Prompt Templates
    'ai.prompt.organize.label': { 'zh-CN': '自动整理 AI 提示词', 'zh-TW': '自動整理 AI 提示詞', 'en': 'AI Prompt for Auto Organize', 'ru': 'AI подсказка для автосортировки' },
    'ai.prompt.infer.label': { 'zh-CN': 'AI 全量归类提示词', 'zh-TW': 'AI 全量歸類提示詞', 'en': 'AI Prompt for Full Categorization', 'ru': 'AI подсказка для полной категоризации' },
    'ai.prompt.warn.format': { 'zh-CN': '请确保提示词输出严格为 JSON；如格式不正确，功能可能无法正常使用。', 'zh-TW': '請確保提示詞輸出嚴格為 JSON；若格式不正確，功能可能無法正常使用。', 'en': 'Ensure output is strict JSON; incorrect format may break functionality.', 'ru': 'Убедитесь, что вывод — строгий JSON; неверный формат может нарушить работу.' },
    // AI prompt helpers and placeholders
    'ai.prompt.support.title': { 'zh-CN': '支持占位符：', 'zh-TW': '支援占位符：', 'en': 'Supports placeholders:', 'ru': 'Поддерживает плейсхолдеры:' },
    'ai.prompt.outputFields.tip': { 'zh-CN': '输出字段名不可更改，请保持与示例一致。', 'zh-TW': '輸出欄位名稱不可更改，請保持與示例一致。', 'en': 'Output field names must stay unchanged; follow the example.', 'ru': 'Имена выходных полей нельзя менять; следуйте примеру.' },
    'ai.prompt.organize.placeholder': { 'zh-CN': '支持占位符：{{language}}、{{categoriesJson}}、{{itemsJson}}', 'zh-TW': '支援占位符：{{language}}、{{categoriesJson}}、{{itemsJson}}', 'en': 'Placeholders supported: {{language}}, {{categoriesJson}}, {{itemsJson}}', 'ru': 'Поддерживаемые плейсхолдеры: {{language}}, {{categoriesJson}}, {{itemsJson}}' },
    'ai.prompt.infer.placeholder': { 'zh-CN': '支持占位符：{{language}}、{{itemsJson}}', 'zh-TW': '支援占位符：{{language}}、{{itemsJson}}', 'en': 'Placeholders supported: {{language}}, {{itemsJson}}', 'ru': 'Поддерживаемые плейсхолдеры: {{language}}, {{itemsJson}}' },

    // Preferences
    'pref.header': { 'zh-CN': '🎯 分类偏好', 'zh-TW': '🎯 分類偏好', 'en': '🎯 Category Preferences', 'ru': '🎯 Настройки категорий' },
    'pref.language.label': { 'zh-CN': '分类语言', 'zh-TW': '分類語言', 'en': 'Category Language', 'ru': 'Язык категорий' },
    'pref.language.auto': { 'zh-CN': '自动检测', 'zh-TW': '自動偵測', 'en': 'Auto detect', 'ru': 'Авто' },
    'pref.language.desc': { 'zh-CN': 'AI 生成分类名称的语言', 'zh-TW': 'AI 產生分類名稱的語言', 'en': 'Language for AI-generated category names', 'ru': 'Язык названий категорий от AI' },
    'pref.max.label': { 'zh-CN': '最大分类数', 'zh-TW': '最大分類數', 'en': 'Max Categories', 'ru': 'Макс. категорий' },
    'pref.max.desc': { 'zh-CN': 'AI 建议的最大分类数量', 'zh-TW': 'AI 建議的最大分類數量', 'en': 'Max number of suggested categories', 'ru': 'Макс. число рекомендуемых категорий' },

    // Help content
    'organize.header': { 'zh-CN': '🔧 整理操作', 'zh-TW': '🔧 整理操作', 'en': '🔧 Organize Actions', 'ru': '🔧 Действия упорядочивания' },
    'organize.desc': { 'zh-CN': '在此执行书签整理操作：生成预览、AI 优化与确认移动。', 'zh-TW': '在此執行書籤整理：生成預覽、AI 優化與確認移動。', 'en': 'Run bookmark organizing: preview, AI optimization, and confirm moves.', 'ru': 'Организация закладок: предпросмотр, оптимизация AI и подтверждение.' },
    'organize.auto.hint': { 'zh-CN': '依「分类规则」生成预览并移动；如启用 AI，将进行二次优化。', 'zh-TW': '依「分類規則」生成預覽並移動；如啟用 AI，將進行二次優化。', 'en': 'Uses category rules to preview and move; if AI is enabled, it performs a secondary optimization.', 'ru': 'По правилам категорий создаёт предпросмотр и выполняет перемещение; при включённом AI выполняет вторичную оптимизацию.' },
    'help.organize.header': { 'zh-CN': '🔧 使用整理功能', 'zh-TW': '🔧 使用整理功能', 'en': '🔧 Using Organize', 'ru': '🔧 Использование упорядочивания' },
    'help.organize.desc': { 'zh-CN': '通过“整理”标签执行自动整理或 AI 全量归类，支持预览与确认。', 'zh-TW': '透過「整理」標籤執行自動整理或 AI 全量歸類，支援預覽與確認。', 'en': 'Use the Organize tab to run Auto Organize or AI Full Categorization with preview and confirmation.', 'ru': 'Во вкладке «Упорядочить» запускайте автосортировку или полную категоризацию AI с предпросмотром и подтверждением.' },
    'help.organize.step1': { 'zh-CN': '点击“⚡ 自动整理”生成预览；如启用 AI，将进行二次优化。', 'zh-TW': '點擊「⚡ 自動整理」生成預覽；如啟用 AI，將進行二次優化。', 'en': 'Click “⚡ Auto Organize” to generate a preview; if AI is enabled, it refines results.', 'ru': 'Нажмите «⚡ Автосортировка» для предпросмотра; при включенном AI произойдет доработка.' },
    'help.organize.step2': { 'zh-CN': '点击“🤖 AI 全量归类”推理新分类并预览，确认后执行移动。', 'zh-TW': '點擊「🤖 AI 全量歸類」推理新分類並預覽，確認後執行移動。', 'en': 'Click “🤖 AI Full Categorize” to infer categories and preview; confirm to move.', 'ru': 'Нажмите «🤖 Полная категоризация AI» для вывода категорий и предпросмотра; подтвердите перемещения.' },
    'help.organize.step3': { 'zh-CN': '在确认弹窗中查看摘要与分类列表，确认后开始整理。', 'zh-TW': '在確認彈窗中查看摘要與分類列表，確認後開始整理。', 'en': 'Review summary and category list in the confirmation dialog, then proceed.', 'ru': 'Просмотрите сводку и список категорий в диалоге подтверждения, затем продолжите.' },
    // AI Full Categorization global tips
    'help.aiFull.header': { 'zh-CN': '🤖 AI 全量归类提示', 'zh-TW': '🤖 AI 全量歸類提示', 'en': '🤖 AI Full Categorization Tips', 'ru': '🤖 Подсказки полной категоризации AI' },
    'help.aiFull.desc': { 'zh-CN': 'AI 全量归类会基于书签内容推理分类并生成预览，您可在预览中调整分类后确认执行移动。请先在「AI 分类助手」中配置服务与模型。', 'zh-TW': 'AI 全量歸類會依書籤內容推理分類並生成預覽，您可在預覽中調整分類後確認移動。請先於「AI 分類助理」設定服務與模型。', 'en': 'AI Full Categorization infers categories from bookmark content and generates a preview. Adjust categories in the preview, then confirm to move. Configure service and model under “AI Assistant”.', 'ru': 'Полная категоризация AI выводит категории по содержимому закладок и создаёт предпросмотр. Отредактируйте категории в нём, затем подтвердите перемещения. Настройте сервис и модель в «AI помощнике».' },
    'help.aiFull.warn': { 'zh-CN': '建议在执行前先备份书签；该过程可能耗时，取决于书签数量与网络情况。', 'zh-TW': '建議在執行前先備份書籤；此過程可能耗時，取決於書籤數量與網路狀況。', 'en': 'Back up bookmarks before running. This may take time depending on bookmark count and network conditions.', 'ru': 'Рекомендуется сделать резервную копию перед запуском. Процесс может занять время, в зависимости от числа закладок и сети.' },
    'help.aiFull.globalTip': { 'zh-CN': 'AI 归类预览已生成，请在下方调整后点击确认执行', 'zh-TW': 'AI 歸類預覽已生成，請於下方調整後點擊確認執行', 'en': 'AI preview generated. Adjust below and click Confirm to execute.', 'ru': 'Предпросмотр AI создан. Отредактируйте ниже и нажмите «Подтвердить» для выполнения.' },
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
    'footer.app': { 'zh-CN': 'TidyMark - 智能书签管理扩展', 'zh-TW': 'TidyMark - 智慧書籤管理擴充', 'en': 'TidyMark - Smart Bookmark Manager', 'ru': 'TidyMark — менеджер закладок' },
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

    // Organize backup confirm
    'organize.backup.title': { 'zh-CN': '开始整理前', 'zh-TW': '開始整理前', 'en': 'Before organizing', 'ru': 'Перед упорядочиванием' },
    'organize.backup.message': { 'zh-CN': '建议在整理前先备份书签，以防数据丢失。是否要先备份书签？', 'zh-TW': '建議在整理前先備份書籤，以防資料遺失。是否要先備份書籤？', 'en': 'We recommend backing up bookmarks before organizing to prevent data loss. Backup now?', 'ru': 'Рекомендуем сделать резервную копию закладок перед упорядочиванием, чтобы избежать потери данных. Сделать резервную копию сейчас?' },
    'organize.backup.messageHtml': { 'zh-CN': '建议在整理前先备份书签，以防数据丢失。<br>是否要先备份书签？', 'zh-TW': '建議在整理前先備份書籤，以防資料遺失。<br>是否要先備份書籤？', 'en': 'We recommend backing up bookmarks before organizing to prevent data loss.<br>Backup now?', 'ru': 'Рекомендуем сделать резервную копию закладок перед упорядочиванием, чтобы избежать потери данных.<br>Сделать резервную копию сейчас?' },
    'organize.backup.ok': { 'zh-CN': '先备份', 'zh-TW': '先備份', 'en': 'Backup first', 'ru': 'Сначала резервная копия' },
    'organize.backup.skip': { 'zh-CN': '跳过备份', 'zh-TW': '跳過備份', 'en': 'Skip backup', 'ru': 'Пропустить резервирование' },

    // Picker modal
    'preview.pickCategory': { 'zh-CN': '选择分类', 'zh-TW': '選擇分類', 'en': 'Pick Category', 'ru': 'Выберите категорию' },
    'preview.addCategory': { 'zh-CN': '新增分类…', 'zh-TW': '新增分類…', 'en': 'Add category…', 'ru': 'Добавить категорию…' },
    'preview.inputNewCategory': { 'zh-CN': '请输入新分类名', 'zh-TW': '請輸入新分類名稱', 'en': 'Enter a new category name', 'ru': 'Введите название новой категории' },
    'preview.apply': { 'zh-CN': '应用', 'zh-TW': '套用', 'en': 'Apply', 'ru': 'Применить' },

    // Common
    'common.viewMore': { 'zh-CN': '查看更多', 'zh-TW': '檢視更多', 'en': 'View more', 'ru': 'Показать ещё' },
    'common.noTitle': { 'zh-CN': '(无标题)', 'zh-TW': '(無標題)', 'en': '(Untitled)', 'ru': '(Без названия)' },
    'common.collapse': { 'zh-CN': '收起', 'zh-TW': '收起', 'en': 'Collapse', 'ru': 'Свернуть' },
    'common.copy': { 'zh-CN': '复制', 'zh-TW': '複製', 'en': 'Copy', 'ru': 'Копировать' },
    'common.edit': { 'zh-CN': '编辑', 'zh-TW': '編輯', 'en': 'Edit', 'ru': 'Редактировать' },
    'common.delete': { 'zh-CN': '删除', 'zh-TW': '刪除', 'en': 'Delete', 'ru': 'Удалить' },
    'common.resetDefault': { 'zh-CN': '重置为默认', 'zh-TW': '重置為預設', 'en': 'Reset to default', 'ru': 'Сбросить к умолчанию' },
    // GitHub sync extended options and guide
    'sync.github.path.hint': { 'zh-CN': '将在目标仓库创建备份文件；路径示例：tidymark/backups/tidymark-backup.json 或 tidymark/backups/tidymark-bookmarks.html。', 'zh-TW': '將在目標倉庫建立備份檔；路徑示例：tidymark/backups/tidymark-backup.json 或 tidymark/backups/tidymark-bookmarks.html。', 'en': 'Creates backup files in the target repo; e.g., tidymark/backups/tidymark-backup.json or tidymark/backups/tidymark-bookmarks.html.', 'ru': 'Создаёт файлы резервных копий в целевом репозитории; например, tidymark/backups/tidymark-backup.json или tidymark/backups/tidymark-bookmarks.html.' },
    'sync.github.format.label': { 'zh-CN': '备份格式', 'zh-TW': '備份格式', 'en': 'Backup format', 'ru': 'Формат резервной копии' },
    'sync.github.format.json': { 'zh-CN': 'JSON（插件备份）', 'zh-TW': 'JSON（外掛備份）', 'en': 'JSON (extension backup)', 'ru': 'JSON (резервная копия расширения)' },
    'sync.github.format.html': { 'zh-CN': 'HTML（Chrome 书签）', 'zh-TW': 'HTML（Chrome 書籤）', 'en': 'HTML (Chrome bookmarks)', 'ru': 'HTML (закладки Chrome)' },
    'sync.github.dualFormat': { 'zh-CN': '同时上传两种格式', 'zh-TW': '同時上傳兩種格式', 'en': 'Upload both formats', 'ru': 'Загружать оба формата' },
    'sync.github.autoDaily': { 'zh-CN': '自动同步到 GitHub（每日一次）', 'zh-TW': '自動同步到 GitHub（每日一次）', 'en': 'Auto sync to GitHub (daily)', 'ru': 'Автосинхронизация с GitHub (ежедневно)' },
    'sync.github.note': { 'zh-CN': '说明：同步为单向备份，仅将本地书签备份到仓库；不会从仓库还原到浏览器。', 'zh-TW': '說明：同步為單向備份，僅將本地書籤備份到倉庫；不會從倉庫還原到瀏覽器。', 'en': 'Note: Sync is one-way; backs up local bookmarks to the repo and does not restore from repo to browser.', 'ru': 'Примечание: синхронизация — в одну сторону; резервирует локальные закладки в репозитории и не восстанавливает их обратно.' },
    'sync.github.guide.header': { 'zh-CN': 'GitHub 操作指南', 'zh-TW': 'GitHub 操作指南', 'en': 'GitHub Guide', 'ru': 'Руководство по GitHub' },
    'sync.github.guide.security': { 'zh-CN': '安全提示：建议创建私人仓库，配置可能包含密钥等敏感信息，避免公开泄露。', 'zh-TW': '安全提示：建議建立私人倉庫，設定可能包含密鑰等敏感資訊，避免公開外洩。', 'en': 'Security tip: use a private repository; config may contain tokens/keys and sensitive data.', 'ru': 'Совет по безопасности: используйте закрытый репозиторий; конфиг может содержать токены/ключи и конфиденциальные данные.' },
    'sync.github.guide.step1': { 'zh-CN': '创建或准备仓库：可在 GitHub 主页右上角 + → New repository 新建仓库，默认分支通常为 main。', 'zh-TW': '建立或準備倉庫：可在 GitHub 首頁右上角 + → New repository 建立倉庫，預設分支通常為 main。', 'en': 'Create or prepare a repo: GitHub → + → New repository; default branch is usually main.', 'ru': 'Создайте или подготовьте репозиторий: GitHub → + → New repository; ветка по умолчанию обычно main.' },
    'sync.github.guide.step2': { 'zh-CN': '生成个人访问令牌（PAT）：進入個人設定 → Developer settings → Personal access tokens，建立令牌並至少勾選 repo 權限；複製令牌保存到 GitHub Token 欄位。', 'zh-TW': '生成個人存取權杖（PAT）：進入個人設定 → Developer settings → Personal access tokens，建立權杖並至少勾選 repo 權限；複製權杖保存到 GitHub Token 欄位。', 'en': 'Generate a Personal Access Token (PAT): Settings → Developer settings → Personal access tokens; create a token with repo permission and paste it into GitHub Token field.', 'ru': 'Создайте персональный токен доступа (PAT): Settings → Developer settings → Personal access tokens; укажите права repo и вставьте в поле GitHub Token.' },
    'sync.github.guide.step3': { 'zh-CN': '填写同步配置：Owner（用户名或组织名）、Repo（仓库名）、备份格式（JSON/HTML）。可启用“同时上传两种格式”以在仓库生成两份文件。', 'zh-TW': '填寫同步設定：Owner（使用者或組織名稱）、Repo（倉庫名稱）、備份格式（JSON/HTML）。可啟用「同時上傳兩種格式」以在倉庫生成兩份檔案。', 'en': 'Fill in sync config: Owner, Repo, backup format (JSON/HTML). Enable “upload both formats” to generate two files.', 'ru': 'Заполните конфигурацию синхронизации: Owner, Repo, формат (JSON/HTML). Включите «загружать оба формата» для двух файлов.' },
    'sync.github.guide.step4': { 'zh-CN': '验证与导入：点击“一键同步到 GitHub”后，到仓库查看文件是否更新。若启用 HTML，同步的文件可在 Chrome 书签管理器导入。', 'zh-TW': '驗證與匯入：點擊「一鍵同步到 GitHub」後，到倉庫查看檔案是否更新。若啟用 HTML，可在 Chrome 書籤管理器匯入。', 'en': 'Verify and import: after “Sync to GitHub”, check repo for updates. If HTML is enabled, import via Chrome Bookmark Manager.', 'ru': 'Проверка и импорт: после «Синхронизировать с GitHub» проверьте репозиторий. Если включен HTML, импортируйте через менеджер закладок Chrome.' },
    // AI small additions
    'ai.model.placeholder': { 'zh-CN': '请选择模型', 'zh-TW': '請選擇模型', 'en': 'Select a model', 'ru': 'Выберите модель' },
    'ai.connection.test': { 'zh-CN': '测试链接', 'zh-TW': '測試連線', 'en': 'Test Connection', 'ru': 'Проверить подключение' }
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
    ,
    // Inline controls and tips
    'dead.timeout.label': { 'zh-CN': '超时', 'zh-TW': '逾時', 'en': 'Timeout', 'ru': 'Тайм-аут' },
    'dead.folder.label': { 'zh-CN': '限定文件夹', 'zh-TW': '限定資料夾', 'en': 'Folder scope', 'ru': 'Область папки' },
    'dead.folder.option.all': { 'zh-CN': '全部书签', 'zh-TW': '全部書籤', 'en': 'All bookmarks', 'ru': 'Все закладки' },
    'dead.ignorePrivate.label': { 'zh-CN': '忽略内网/本地地址', 'zh-TW': '忽略內網/本地位址', 'en': 'Ignore private/local addresses', 'ru': 'Игнорировать локальные/частные адреса' },
    'dead.scanDuplicates.label': { 'zh-CN': '扫描重复书签', 'zh-TW': '掃描重複書籤', 'en': 'Scan duplicate bookmarks', 'ru': 'Сканировать дубликаты закладок' },
    'dead.timeout.tip': { 'zh-CN': '请求最大等待时间，范围 1–60 秒', 'zh-TW': '請求最大等待時間，範圍 1–60 秒', 'en': 'Maximum request wait time, range 1–60 seconds', 'ru': 'Максимальное время ожидания запроса: 1–60 сек.' },
    'dead.ignorePrivate.tip': { 'zh-CN': '跳过如 127.0.0.1、localhost、10.x、192.168.x、172.16–31.x', 'zh-TW': '跳過如 127.0.0.1、localhost、10.x、192.168.x、172.16–31.x', 'en': 'Skip addresses like 127.0.0.1, localhost, 10.x, 192.168.x, 172.16–31.x', 'ru': 'Пропускать адреса: 127.0.0.1, localhost, 10.x, 192.168.x, 172.16–31.x' },
    'dead.scanDuplicates.tip': { 'zh-CN': '按 URL 分组标记重复，仅展示一条代表项，可勾选后统一删除或挪走', 'zh-TW': '按 URL 分組標記重複，僅展示一條代表項，可勾選後統一刪除或移走', 'en': 'Group by URL to mark duplicates; show one representative; allow bulk delete or move', 'ru': 'Группировать по URL для пометки дубликатов; показывать один представитель; массовое удаление/перемещение' }
  };
  Object.assign(translations, translationsDead);
  
  // Additional keys for New Tab, Options messages, and Background UI
  const translationsAdd = {
    // New Tab page
    'newtab.title': { 'zh-CN': 'TidyMark 导航', 'zh-TW': 'TidyMark 導覽', 'en': 'TidyMark Navigation', 'ru': 'Навигация TidyMark' },
    'newtab.subtitle': { 'zh-CN': '愿你高效、专注地浏览每一天', 'zh-TW': '願你高效、專注地瀏覽每一天', 'en': 'Browse each day efficiently and focused', 'ru': 'Пусть каждый день вы просматриваете эффективно и сосредоточенно' },
    'newtab.theme': { 'zh-CN': '主题', 'zh-TW': '主題', 'en': 'Theme', 'ru': 'Тема' },
    'newtab.theme.system': { 'zh-CN': '系统', 'zh-TW': '系統', 'en': 'System', 'ru': 'Системная' },
    'newtab.theme.light': { 'zh-CN': '明亮', 'zh-TW': '明亮', 'en': 'Light', 'ru': 'Светлая' },
    'newtab.theme.dark': { 'zh-CN': '暗色', 'zh-TW': '暗色', 'en': 'Dark', 'ru': 'Тёмная' },
    'newtab.search.title': { 'zh-CN': '搜索', 'zh-TW': '搜尋', 'en': 'Search', 'ru': 'Поиск' },
    'newtab.search.placeholder': { 'zh-CN': '搜索或输入网址（“#”开头进行书签搜索）', 'zh-TW': '搜尋或輸入網址（「#」開頭進行書籤搜尋）', 'en': 'Search or enter URL (“#” for bookmark search)', 'ru': 'Искать или ввести URL («#» — поиск закладок)' },
    'newtab.readworld.title': { 'zh-CN': '60s 读懂世界', 'zh-TW': '60s 讀懂世界', 'en': '60s Read the World', 'ru': '60 секунд — новости мира' },
    'newtab.bookmarks.hidden.tip': { 'zh-CN': '书签列表已隐藏。可在“设置 → 导航页”中打开显示。', 'zh-TW': '書籤列表已隱藏。可在「設定 → 導覽頁」中開啟顯示。', 'en': 'Bookmarks list hidden. Enable it in Settings → New Tab.', 'ru': 'Список закладок скрыт. Включите в Настройках → Новая вкладка.' },
    'newtab.wallpaper.on': { 'zh-CN': '壁纸：已开启', 'zh-TW': '壁紙：已開啟', 'en': 'Wallpaper: On', 'ru': 'Обои: Вкл.' },
    'newtab.wallpaper.off': { 'zh-CN': '壁纸：已关闭', 'zh-TW': '壁紙：已關閉', 'en': 'Wallpaper: Off', 'ru': 'Обои: Выкл.' },
    'newtab.wallpaper.loadFail': { 'zh-CN': '加载壁纸失败', 'zh-TW': '載入壁紙失敗', 'en': 'Failed to load wallpaper', 'ru': 'Не удалось загрузить обои' },
    'newtab.wallpaper.serviceStatus': { 'zh-CN': '壁纸服务返回状态 {status}', 'zh-TW': '壁紙服務返回狀態 {status}', 'en': 'Wallpaper service returned status {status}', 'ru': 'Сервис обоев вернул статус {status}' },
    'newtab.wallpaper.notJson': { 'zh-CN': '壁纸响应非JSON', 'zh-TW': '壁紙響應非 JSON', 'en': 'Wallpaper response is not JSON', 'ru': 'Ответ сервиса обоев не JSON' },
    'newtab.wallpaper.errorCode': { 'zh-CN': '壁纸服务错误码 {code}', 'zh-TW': '壁紙服務錯誤碼 {code}', 'en': 'Wallpaper service error code {code}', 'ru': 'Код ошибки сервиса обоев {code}' },
    'newtab.wallpaper.noUrl': { 'zh-CN': '未提供壁纸链接', 'zh-TW': '未提供壁紙連結', 'en': 'No wallpaper URL provided', 'ru': 'URL обоев не предоставлен' },
    'newtab.bing.status': { 'zh-CN': 'Bing 接口返回状态 {status}', 'zh-TW': 'Bing 介面返回狀態 {status}', 'en': 'Bing API returned status {status}', 'ru': 'API Bing вернул статус {status}' },
    'newtab.bing.noUrl': { 'zh-CN': 'Bing 接口未提供图片URL', 'zh-TW': 'Bing 介面未提供圖片 URL', 'en': 'Bing API did not provide image URL', 'ru': 'API Bing не предоставил URL изображения' },
    // New Tab: Weather & Top Visited
    'newtab.weather.refresh': { 'zh-CN': '刷新', 'zh-TW': '重新整理', 'en': 'Refresh', 'ru': 'Обновить' },
    'newtab.weather.prompt': { 'zh-CN': '请输入城市名称（如：北京、Shanghai、New York）', 'zh-TW': '請輸入城市名稱（如：北京、Shanghai、New York）', 'en': 'Enter city name (e.g., Beijing, Shanghai, New York)', 'ru': 'Введите название города (например, Beijing, Shanghai, New York)' },
    'newtab.topVisited.title': { 'zh-CN': '热门书签 Top {n}', 'zh-TW': '熱門書籤 Top {n}', 'en': 'Top Visited — Top {n}', 'ru': 'Популярные — Топ {n}' },
    'newtab.topVisited.count': { 'zh-CN': '{count} 书签参与统计', 'zh-TW': '{count} 書籤參與統計', 'en': '{count} bookmarks participated', 'ru': '{count} закладок участвуют в статистике' },
    'newtab.topVisited.empty': { 'zh-CN': '暂无访问记录，点击书签后将统计', 'zh-TW': '暫無造訪記錄，點擊書籤後將統計', 'en': 'No visits yet; visiting bookmarks starts tracking', 'ru': 'Пока нет посещений; переходы по закладкам начнут статистику' },
    'search.engine.google': { 'zh-CN': 'Google', 'zh-TW': 'Google', 'en': 'Google', 'ru': 'Google' },
    'search.engine.bing': { 'zh-CN': 'Bing', 'zh-TW': 'Bing', 'en': 'Bing', 'ru': 'Bing' },
    'search.engine.duck': { 'zh-CN': 'DuckDuckGo', 'zh-TW': 'DuckDuckGo', 'en': 'DuckDuckGo', 'ru': 'DuckDuckGo' },
    'search.engine.baidu': { 'zh-CN': '百度', 'zh-TW': '百度', 'en': 'Baidu', 'ru': 'Baidu' },
    'search.engine.label': { 'zh-CN': '搜索引擎', 'zh-TW': '搜尋引擎', 'en': 'Search Engine', 'ru': 'Поисковик' },

    // Options page messages
    'options.title': { 'zh-CN': 'TidyMark - 设置', 'zh-TW': 'TidyMark - 設定', 'en': 'TidyMark - Settings', 'ru': 'TidyMark — Настройки' },
    'options.save.success': { 'zh-CN': '设置已保存', 'zh-TW': '設定已儲存', 'en': 'Settings saved', 'ru': 'Настройки сохранены' },
    'options.save.fail': { 'zh-CN': '保存设置失败', 'zh-TW': '儲存設定失敗', 'en': 'Failed to save settings', 'ru': 'Не удалось сохранить настройки' },
    'ai.prompt.copy.success': { 'zh-CN': '提示词已复制', 'zh-TW': '提示詞已複製', 'en': 'Prompt copied', 'ru': 'Промпт скопирован' },
    'ai.prompt.copy.fail': { 'zh-CN': '复制失败，请手动选择复制', 'zh-TW': '複製失敗，請手動選擇複製', 'en': 'Copy failed, please select and copy manually', 'ru': 'Не удалось скопировать, выделите и скопируйте вручную' },
    'ai.prompt.reset.success': { 'zh-CN': '已重置为默认提示词', 'zh-TW': '已重設為預設提示詞', 'en': 'Reset to default prompt', 'ru': 'Сброшено к стандартному промпту' },
    'preview.generated.simple': { 'zh-CN': '预览已生成，请在下方确认', 'zh-TW': '預覽已生成，請在下方確認', 'en': 'Preview generated; please confirm below', 'ru': 'Предпросмотр создан; подтвердите ниже' },
    'backup.export.success': { 'zh-CN': '备份导出成功', 'zh-TW': '備份匯出成功', 'en': 'Backup exported successfully', 'ru': 'Резервная копия экспортирована' },
    'backup.export.fail': { 'zh-CN': '备份失败，请重试', 'zh-TW': '備份失敗，請重試', 'en': 'Backup failed, please retry', 'ru': 'Сбой резервирования, попробуйте снова' },
    'rules.update.success': { 'zh-CN': '规则已更新', 'zh-TW': '規則已更新', 'en': 'Rule updated', 'ru': 'Правило обновлено' },
    'rules.add.success': { 'zh-CN': '规则已添加', 'zh-TW': '規則已新增', 'en': 'Rule added', 'ru': 'Правило добавлено' },
    'rules.reset.success': { 'zh-CN': '已重置为默认规则', 'zh-TW': '已重設為預設規則', 'en': 'Reset to default rules', 'ru': 'Сброс к стандартным правилам' },
    'backup.export.fail.short': { 'zh-CN': '导出备份失败', 'zh-TW': '匯出備份失敗', 'en': 'Export backup failed', 'ru': 'Сбой экспорта резервной копии' },
    'backup.import.dev': { 'zh-CN': '备份导入功能正在开发中', 'zh-TW': '備份匯入功能正在開發中', 'en': 'Backup import is under development', 'ru': 'Импорт резервной копии в разработке' },
    'backup.import.fail': { 'zh-CN': '导入备份失败: {error}', 'zh-TW': '匯入備份失敗：{error}', 'en': 'Import backup failed: {error}', 'ru': 'Сбой импорта резервной копии: {error}' },
    'sync.github.config.incomplete': { 'zh-CN': '请填写完整的 GitHub 配置', 'zh-TW': '請填寫完整的 GitHub 設定', 'en': 'Please fill in complete GitHub config', 'ru': 'Заполните полную конфигурацию GitHub' },
    'sync.github.done': { 'zh-CN': '已同步到 GitHub', 'zh-TW': '已同步到 GitHub', 'en': 'Synced to GitHub', 'ru': 'Синхронизировано с GitHub' },
    'sync.github.error': { 'zh-CN': '同步过程中出现异常：{error}', 'zh-TW': '同步過程中出現異常：{error}', 'en': 'Error occurred during sync: {error}', 'ru': 'Ошибка во время синхронизации: {error}' },

    // Reset page
    'reset.title': { 'zh-CN': '重置 TidyMark', 'zh-TW': '重置 TidyMark', 'en': 'Reset TidyMark', 'ru': 'Сброс TidyMark' },
    'reset.desc': { 'zh-CN': '点击下面的按钮清除使用记录，重新显示首次使用引导', 'zh-TW': '點擊下面的按鈕清除使用記錄，重新顯示首次使用引導', 'en': 'Click the button to clear usage and show first-time guide again', 'ru': 'Нажмите кнопку, чтобы очистить данные и снова показать первое руководство' },
    'reset.btn': { 'zh-CN': '重置为首次使用', 'zh-TW': '重置為首次使用', 'en': 'Reset to first-time use', 'ru': 'Сброс к первому запуску' },
    'reset.alert': { 'zh-CN': '已重置！现在打开 TidyMark 弹窗将显示首次使用引导', 'zh-TW': '已重置！現在打開 TidyMark 彈窗將顯示首次使用引導', 'en': 'Reset! Opening TidyMark popup will show the first-time guide', 'ru': 'Сброшено! Всплывающее окно TidyMark покажет руководство для первого запуска' },

    // Background: context menus and notifications
    'bg.context.add.page': { 'zh-CN': '添加到 TidyMark 并分类（页面）', 'zh-TW': '新增到 TidyMark 並分類（頁面）', 'en': 'Add to TidyMark and categorize (Page)', 'ru': 'Добавить в TidyMark и классифицировать (Страница)' },
    'bg.context.add.link': { 'zh-CN': '添加到 TidyMark 并分类（链接）', 'zh-TW': '新增到 TidyMark 並分類（連結）', 'en': 'Add to TidyMark and categorize (Link)', 'ru': 'Добавить в TidyMark и классифицировать (Ссылка)' },
    'bg.context.add.selection': { 'zh-CN': '添加到 TidyMark 并分类（选中文本）', 'zh-TW': '新增到 TidyMark 並分類（選中文本）', 'en': 'Add to TidyMark and categorize (Selection)', 'ru': 'Добавить в TidyMark и классифицировать (Выделение)' },
    'bg.notification.add.title': { 'zh-CN': 'TidyMark 添加成功', 'zh-TW': 'TidyMark 新增成功', 'en': 'Added to TidyMark', 'ru': 'Добавлено в TidyMark' },
    'bg.notification.add.message': { 'zh-CN': '已添加到「{category}」文件夹', 'zh-TW': '已新增到「{category}」資料夾', 'en': 'Added to “{category}” folder', 'ru': 'Добавлено в папку «{category}»' }
  };
  Object.assign(translations, translationsAdd);

  // Options: Navigation settings and hints
  const translationsOptionsNav = {
    'options.nav.tab': { 'zh-CN': '导航设置', 'zh-TW': '導覽設定', 'en': 'Navigation', 'ru': 'Навигация' },
    'options.nav.header': { 'zh-CN': '🧭 导航设置', 'zh-TW': '🧭 導覽設定', 'en': '🧭 Navigation Settings', 'ru': '🧭 Настройки навигации' },
    'options.nav.desc': { 'zh-CN': '配置新标签页显示模块与透明度等外观偏好', 'zh-TW': '設定新分頁顯示模組與透明度等外觀偏好', 'en': 'Configure New Tab modules and opacity preferences', 'ru': 'Настройка модулей новой вкладки и прозрачности' },
    'options.nav.widgets.header': { 'zh-CN': '🧩 导航页小组件', 'zh-TW': '🧩 導覽頁小元件', 'en': '🧩 New Tab Widgets', 'ru': '🧩 Виджеты новой вкладки' },
    'options.nav.widgets.desc': { 'zh-CN': '在新标签页显示可选信息模块', 'zh-TW': '在新分頁顯示可選資訊模組', 'en': 'Optional info modules on New Tab', 'ru': 'Дополнительные информационные модули на новой вкладке' },
    'options.nav.weather.toggle': { 'zh-CN': '显示天气信息', 'zh-TW': '顯示天氣資訊', 'en': 'Show weather', 'ru': 'Показывать погоду' },
    'options.nav.weather.tip': { 'zh-CN': '开启后，在新标签页顶部显示城市天气', 'zh-TW': '開啟後，在新分頁頂部顯示城市天氣', 'en': 'Show city weather at the top of New Tab', 'ru': 'Показывать погоду города в верхней части новой вкладки' },
    'options.nav.weather.city.label': { 'zh-CN': '城市', 'zh-TW': '城市', 'en': 'City', 'ru': 'Город' },
    'options.nav.weather.city.placeholder': { 'zh-CN': '如：北京、Shanghai、New York', 'zh-TW': '如：北京、Shanghai、New York', 'en': 'e.g., Beijing, Shanghai, New York', 'ru': 'например, Beijing, Shanghai, New York' },
    'options.nav.weather.city.desc': { 'zh-CN': '支持中文或英文城市名；留空将使用默认查询', 'zh-TW': '支援中文或英文城市名；留空將使用預設查詢', 'en': 'Supports Chinese or English city names; leave empty for default', 'ru': 'Поддерживаются китайские и английские названия; оставьте пустым для значения по умолчанию' },
    'options.nav.wallpaper.toggle': { 'zh-CN': '显示 Bing 壁纸背景', 'zh-TW': '顯示 Bing 壁紙背景', 'en': 'Show Bing wallpaper', 'ru': 'Показывать обои Bing' },
    'options.nav.wallpaper.tip': { 'zh-CN': '开启后，新标签页将使用 Bing 每日壁纸作为背景', 'zh-TW': '開啟後，新分頁將使用 Bing 每日壁紙作為背景', 'en': 'Use Bing daily wallpaper as background', 'ru': 'Использовать ежедневные обои Bing как фон' },
    'options.nav.sixty.toggle': { 'zh-CN': '显示 60s 读懂世界', 'zh-TW': '顯示 60s 讀懂世界', 'en': 'Show 60s Read the World', 'ru': 'Показывать «60 секунд: новости мира»' },
    'options.nav.sixty.tip': { 'zh-CN': '开启后，在新标签页显示每日「60s读懂世界」新闻摘要', 'zh-TW': '開啟後，在新分頁顯示每日「60s讀懂世界」新聞摘要', 'en': 'Show daily “60s Read the World” news summary', 'ru': 'Показывать ежедневное краткое резюме новостей «60 секунд»' },
    'options.nav.cnDefault.hint': { 'zh-CN': '非中文环境默认隐藏，可在此开启', 'zh-TW': '非中文環境預設隱藏，可在此開啟', 'en': 'Hidden by default in non-Chinese locales; enable here', 'ru': 'В не китайских языках скрыто по умолчанию; включите здесь' },
    'options.nav.opacity.header': { 'zh-CN': '非聚焦透明度（导航页框）', 'zh-TW': '非聚焦透明度（導覽頁框）', 'en': 'Unfocused opacity (New Tab blocks)', 'ru': 'Прозрачность без наведения (блоки новой вкладки)' },
    'options.nav.opacity.search.label': { 'zh-CN': '搜索框透明度', 'zh-TW': '搜尋框透明度', 'en': 'Search opacity', 'ru': 'Прозрачность поиска' },
    'options.nav.opacity.search.descPrefix': { 'zh-CN': '未聚焦/未悬停时：当前', 'zh-TW': '未聚焦/未懸停時：目前', 'en': 'Unfocused/idle: current', 'ru': 'Без фокуса/наведения: текущая' },
    'options.nav.opacity.bookmarks.label': { 'zh-CN': '书签框透明度', 'zh-TW': '書籤框透明度', 'en': 'Bookmarks opacity', 'ru': 'Прозрачность блока закладок' },
    'options.nav.opacity.bookmarks.descPrefix': { 'zh-CN': '未悬停时：当前', 'zh-TW': '未懸停時：目前', 'en': 'Idle: current', 'ru': 'Без наведения: текущая' },
    'options.nav.opacity.sixty.label': { 'zh-CN': '60s 栏目透明度', 'zh-TW': '60s 欄目透明度', 'en': '60s module opacity', 'ru': 'Прозрачность блока 60s' },
    'options.nav.opacity.sixty.descPrefix': { 'zh-CN': '未悬停时：当前', 'zh-TW': '未懸停時：目前', 'en': 'Idle: current', 'ru': 'Без наведения: текущая' },
    'options.nav.opacity.topVisited.label': { 'zh-CN': '热门栏目透明度', 'zh-TW': '熱門欄目透明度', 'en': 'Top visited opacity', 'ru': 'Прозрачность популярного' },
    'options.nav.opacity.topVisited.descPrefix': { 'zh-CN': '未悬停时：当前', 'zh-TW': '未懸停時：目前', 'en': 'Idle: current', 'ru': 'Без наведения: текущая' },
    'options.nav.bookmarks.toggle': { 'zh-CN': '显示书签列表', 'zh-TW': '顯示書籤列表', 'en': 'Show bookmarks list', 'ru': 'Показывать список закладок' },
    'options.nav.bookmarks.tip': { 'zh-CN': '默认不展示。开启后，新标签页显示书签列表。', 'zh-TW': '預設不顯示。開啟後，新分頁顯示書籤列表。', 'en': 'Hidden by default. Enable to show bookmarks list on New Tab.', 'ru': 'По умолчанию скрыто. Включите, чтобы показывать список закладок на новой вкладке.' },
    'options.nav.topVisited.toggle': { 'zh-CN': '显示热门栏目（访问频率 Top N）', 'zh-TW': '顯示熱門欄目（造訪頻率 Top N）', 'en': 'Show Top Visited (Top N)', 'ru': 'Показывать «Популярные» (Top N)' },
    'options.nav.topVisited.tip': { 'zh-CN': '开启后，在导航页顶部显示按访问次数排序的热门书签栏目', 'zh-TW': '開啟後，在導覽頁頂部顯示依造訪次數排序的熱門書籤欄位', 'en': 'Show a top-visited section sorted by visit count', 'ru': 'Показывать раздел «Популярные» по счётчику посещений' },
    'options.nav.topVisited.count.label': { 'zh-CN': '热门栏目数量（Top N）', 'zh-TW': '熱門欄目數量（Top N）', 'en': 'Top visited count (Top N)', 'ru': 'Количество в «Популярных» (Top N)' },
    'options.nav.topVisited.count.placeholder': { 'zh-CN': '10', 'zh-TW': '10', 'en': '10', 'ru': '10' },
    'options.nav.topVisited.count.desc': { 'zh-CN': '控制显示的热门栏目数量，建议 5-20', 'zh-TW': '控制顯示的熱門欄目數量，建議 5-20', 'en': 'Number of items to show; recommended 5–20', 'ru': 'Количество элементов; рекомендовано 5–20' },
    'options.archive.header': { 'zh-CN': '🗂️ 自动归档旧书签', 'zh-TW': '🗂️ 自動歸檔舊書籤', 'en': '🗂️ Auto-archive old bookmarks', 'ru': '🗂️ Автоархив старых закладок' },
    'options.archive.desc': { 'zh-CN': '根据最近访问时间自动将不常访问的书签移动到“归档”文件夹（默认关闭）', 'zh-TW': '依最近造訪時間自動將不常造訪的書籤移至「歸檔」資料夾（預設關閉）', 'en': 'Move infrequently visited bookmarks to “Archive” based on last visit (off by default)', 'ru': 'Перемещать редко посещаемые закладки в «Архив» по дате последнего визита (по умолчанию выкл.)' },
    'options.archive.toggle': { 'zh-CN': '启用自动归档', 'zh-TW': '啟用自動歸檔', 'en': 'Enable auto-archive', 'ru': 'Включить автоархив' },
    'options.archive.hint': { 'zh-CN': '开启后，扩展会定期将最近访问时间早于阈值的书签搬入“归档”；没有访问记录的书签将回退按添加时间判断。', 'zh-TW': '開啟後，擴充功能會定期將最近造訪時間早於臨界值的書籤搬入「歸檔」；沒有造訪記錄的書籤將回退按新增時間判斷。', 'en': 'When enabled, periodically moves bookmarks older than the threshold to “Archive”; items without visit history fall back to added time.', 'ru': 'При включении периодически переносит закладки старше порога в «Архив»; без истории посещений используется дата добавления.' },
    'options.archive.threshold.label': { 'zh-CN': '归档阈值（距今多少天前）', 'zh-TW': '歸檔臨界值（距今多少天前）', 'en': 'Archive threshold (days ago)', 'ru': 'Порог архивации (сколько дней назад)' },
    'options.archive.threshold.desc': { 'zh-CN': '按最近访问时间判断，未有访问记录则按添加时间；默认 180 天。', 'zh-TW': '依最近造訪時間判斷，未有造訪記錄則依新增時間；預設 180 天。', 'en': 'Use last visit time, or added time if none; default 180 days.', 'ru': 'По времени последнего визита, или по времени добавления; по умолчанию 180 дней.' }
  };
  Object.assign(translations, translationsOptionsNav);

  // Organize params dialog & labels
  const translationsOrganizeParams = {
    'organize.confirm.title': { 'zh-CN': '确认整理参数', 'zh-TW': '確認整理參數', 'en': 'Confirm Organize Parameters', 'ru': 'Подтвердить параметры упорядочивания' },
    'organize.scope.label': { 'zh-CN': '整理范围', 'zh-TW': '整理範圍', 'en': 'Scope', 'ru': 'Область' },
    'organize.scope.option.all': { 'zh-CN': '全部书签', 'zh-TW': '全部書籤', 'en': 'All bookmarks', 'ru': 'Все закладки' },
    'organize.target.label': { 'zh-CN': '目标父目录', 'zh-TW': '目標父目錄', 'en': 'Target parent folder', 'ru': 'Целевая родительская папка' },
    'organize.target.option.bar': { 'zh-CN': '书签栏（默认）', 'zh-TW': '書籤列（預設）', 'en': 'Bookmarks Bar (default)', 'ru': 'Панель закладок (по умолчанию)' }
  };
  Object.assign(translations, translationsOrganizeParams);

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
    return env.__tidymark_lang || 'en';
  }

  async function init() {
    const stored = await getStoredLanguage();
    const autoLang = normalize(navigator.language || navigator.userLanguage);
    const lang = normalize(stored || autoLang);
    env.__tidymark_lang = supported.includes(lang) ? lang : 'en';
    // In non-DOM environments, applyTranslations should be a no-op
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
    if (key) return translateCategory(key);
    // Fallback normalize using additional pairs when categoryMap lacks an entry
    const lang = getLanguageSync();
    const isZh = String(lang || '').toLowerCase().startsWith('zh');
    if (isZh) {
      const zh = ADDITIONAL_CATEGORY_PAIRS_REVERSE[name];
      return zh || name;
    } else {
      const en = ADDITIONAL_CATEGORY_PAIRS[name];
      return en || name;
    }
  }

  function applyTranslations(root) {
    const doc = (typeof document !== 'undefined') ? document : null;
    root = root || doc;
    if (!root) return;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(key));
    });
    // Support translating title attributes
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', t(key));
    });
    // Support translating aria-label attributes
    root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      el.setAttribute('aria-label', t(key));
    });
  }

  async function setLanguage(lang) {
    const normalized = normalize(lang);
    env.__tidymark_lang = normalized;
    await setStoredLanguage(normalized);
    applyTranslations();
  }

  env.I18n = { init, t, tf, setLanguage, applyTranslations, translateCategory, translateCategoryByName, resolveCategoryKeyByName, getLanguageSync };
})();