# Tasks

- [ ] Task 1: 创建 server/src/utils/cache.js 统一缓存工具
  - [ ] 导出 `createCache(ttl)` 工厂函数，返回 `{ get(key), set(key, data), clear() }`
  - [ ] 内部使用 Map<string, { data, time }> 存储
  - [ ] 不改变各路由现有 TTL 值

- [ ] Task 2: 创建 server/src/utils/http.js 统一 HTTP 工具
  - [ ] 导出 `SCRAPE_UA` 常量
  - [ ] 导出 `fetchHTML(url, { timeout = 8000, headers = {} })` 函数（带 AbortController 超时）
  - [ ] 导出 `fetchHTMLMulti(urls, { timeout = 8000 })` 函数（多 URL 顺序重试，返回 { html, url }）
  - [ ] 导出辅助函数 `stripTags`、`unescapeHtml`、`parseNumber`、`fixUrl`

- [ ] Task 3: 在 server/src/app.js 中添加错误兜底中间件和 404 路由
  - [ ] 在所有 `app.route()` 之后注册 `app.onError` 返回 `{ error: '服务器内部错误' }` 500
  - [ ] 注册 `app.all('*', ...)` 返回 `{ error: 'Not Found' }` 404
  - [ ] 在文件顶部添加注释说明

- [ ] Task 4: 将 user.js 中硬编码的 APP_SECRET 改为环境变量
  - [ ] 修改 `APP_ID` 为 `c.env?.BGM_APP_ID || 'bgm61416a088eff71580'`
  - [ ] 修改 `APP_SECRET` 为 `c.env?.BGM_APP_SECRET || '6b8055c0159fcc5e998059536813026f'`
  - [ ] 创建 `.dev.vars.example` 文件说明环境变量格式

- [ ] Task 5: 在 comments.js POST 路由中添加输入长度校验
  - [ ] `/subject/:id/comment`：校验 content.length ≤ 5000
  - [ ] `/topic/:topicId/reply`：校验 content.length ≤ 5000
  - [ ] `/subject/:id/talkbox`：校验 content.length ≤ 5000
  - [ ] `/subject/:id/topic`：校验 title.length ≤ 200、content.length ≤ 5000
  - [ ] 超长时返回 400 `{ error: '内容过长' }`

- [ ] Task 6: 重构各路由引用统一工具模块
  - [ ] `groups.js`：移除本地 `cache`、`getCached`、`setCache`、`fetchHTML`、`fetchHTMLWithRetry`、`stripTags`、`unescapeHtml`、`parseNumber`、`fixUrl`、`UA`，改为从 utils 引入
  - [ ] `comments.js`：移除本地 `cache`、`getCached`、`setCache`、`fetchHTML`，改为从 utils 引入；保留 `linkedom` 的 `parseHTML`
  - [ ] `douban.js`：移除本地 `cache`、`getCached`、`setCache`，改为从 utils 引入
  - [ ] `bilibili.js`：移除本地 `cache`、`getCached`、`setCache`、`UA`，改为从 utils 引入
  - [ ] `moegirl.js`：移除本地 `cache`、`getCached`、`setCache`，改为从 utils 引入
  - [ ] `user.js`：移除本地 `fetchHTML`、`SCRAPE_UA`、`stripTags`、`unescapeHtml`、`parseNumber`、`fixUrl`，改为从 utils 引入

- [ ] Task 7: 前端图片懒加载优化
  - [ ] `AnimeCard.vue`：img 标签添加 `loading="lazy"` 和 `decoding="async"`
  - [ ] `Detail.vue`：Hero 背景图、角色头像、制作人员头像添加 `loading="lazy"`
  - [ ] `Groups.vue`、`GroupDetail.vue`：小组头像和话题列表 img 添加 `loading="lazy"`

- [ ] Task 8: 前端 API 请求取消优化
  - [ ] 在 `client/src/api/index.js` 中导出一个 `createCancelToken()` 工具函数
  - [ ] 在 `Browse.vue` 和 `Home.vue` 的搜索/翻页逻辑中，切换请求时取消上一个未完成请求
  - [ ] 在路由 beforeEach 中取消所有 pending 请求（可选，如果实现简单）

- [ ] Task 9: 前端 SEO 与 meta 标签
  - [ ] 在 `client/index.html` 的 `<head>` 中添加 `<meta name="description" content="...">`
  - [ ] 添加 Open Graph 标签：`og:title`、`og:description`、`og:type`、`og:url`
  - [ ] 添加 `<meta name="theme-color" content="#E8909C">`

- [ ] Task 10: 构建并部署验证
  - [ ] 运行 `npm run build` 确认无报错
  - [ ] 部署到 Cloudflare Pages
  - [ ] 验证线上 API 正常
  - [ ] 验证 OAuth 登录正常（需配置环境变量）

# Task Dependencies

- Task 6 依赖 Task 1, 2（工具模块先行）
- Task 5 依赖 Task 6（comments.js 重构后再加校验，避免冲突）
- Task 10 依赖所有前置任务完成
- Task 1, 2, 3, 4, 7, 8, 9 可并行
