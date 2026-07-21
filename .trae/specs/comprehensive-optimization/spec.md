# Bangmio 全面优化 Spec

## Why

项目功能基本完善但存在多个可优化点：APP_SECRET 硬编码在源码中存在安全隐患；服务端缺少统一缓存工具层导致各路由重复实现缓存逻辑；前端未做路由懒加载预拉取和图片懒加载优化；错误处理散落各处缺少统一中间件；用户输入未做校验存在 XSS 风险；网页抓取超时未设置可能阻塞请求。

## What Changes

### 1. 安全性加固

- **BREAKING**: 将 `server/src/routes/user.js` 中硬编码的 `APP_ID` / `APP_SECRET` 改为从环境变量读取（`c.env.BGM_APP_ID` / `c.env.BGM_APP_SECRET`），本地开发通过 `.dev.vars` 文件提供
- 在 Bangumi 网页抓取 POST 路由中，对用户提交的 `content` / `title` 做长度限制（content ≤ 5000 字符，title ≤ 200 字符）
- 在客户端 `CommentSection.vue` 中对用户输入做前端长度校验，提交前截断

### 2. 服务端缓存工具层抽取

- 创建 `server/src/utils/cache.js`，统一封装 `createCache(ttl)` 工厂函数，返回 `{ get, set, clear }` 接口
- 将 `groups.js`、`douban.js`、`bilibili.js`、`comments.js`、`moegirl.js` 中各自重复的 `cache` + `getCached` + `setCache` 替换为引用 `createCache`
- 不改变缓存 TTL 和 key 命名

### 3. 服务端 HTTP 工具层抽取

- 创建 `server/src/utils/http.js`，封装通用的 `fetchHTML(url, { timeout, headers })` 和 `fetchHTMLMulti(urls, { timeout })` 多源重试函数
- 将 `groups.js`、`user.js`、`comments.js` 中重复的 `fetchHTML` 和 `SCRAPE_UA` 替换为引用统一工具
- 添加 8s 默认超时（使用 `AbortController`）

### 4. 服务端错误处理中间件

- 在 `server/src/app.js` 中添加全局错误兜底中间件，捕获未处理异常返回 `{ error: '服务器内部错误' }` 500
- 在 `app.js` 中添加 404 兜底路由

### 5. 前端图片懒加载与优化

- 在 `AnimeCard.vue` 的 `<img>` 标签上添加 `loading="lazy"` 属性
- 在 `Detail.vue` Hero 背景图和角色/人物头像 img 上添加 `loading="lazy"`
- 为所有番剧海报 img 添加 `decoding="async"` 属性

### 6. 前端 API 请求优化

- 在 `client/src/api/index.js` 中添加请求取消逻辑：在路由切换时取消未完成的 API 请求（使用 `AbortController`）
- 为 `animeAPI.search` 和 `animeAPI.browse` 添加防抖标识，避免快速翻页时旧请求覆盖新结果

### 7. 前端 SEO 与可访问性

- 在 `client/index.html` 中补充 `<meta name="description">` 和 Open Graph 标签
- 为所有页面 `<img>` 添加 `alt` 属性（已有部分，补全缺失的）
- 在路由 `scrollBehavior` 中保持顶部对齐

## Impact

- Affected specs: 无
- Affected code:
  - `server/src/routes/user.js` — 环境变量化 APP_SECRET + 输入校验
  - `server/src/routes/groups.js` — 引用统一缓存和 HTTP 工具
  - `server/src/routes/comments.js` — 引用统一缓存和 HTTP 工具 + 输入校验
  - `server/src/routes/douban.js` — 引用统一缓存
  - `server/src/routes/bilibili.js` — 引用统一缓存
  - `server/src/routes/moegirl.js` — 引用统一缓存
  - `server/src/utils/cache.js` — 新建
  - `server/src/utils/http.js` — 新建
  - `server/src/app.js` — 添加错误中间件 + 404
  - `client/src/api/index.js` — 请求取消
  - `client/src/components/AnimeCard.vue` — 图片懒加载
  - `client/src/views/Detail.vue` — 图片懒加载
  - `client/index.html` — SEO meta 标签

## ADDED Requirements

### Requirement: 敏感信息环境变量化

系统 SHALL 从环境变量读取 Bangumi OAuth 凭据（`BGM_APP_ID`、`BGM_APP_SECRET`），不在源码中硬编码。

#### Scenario: 本地开发

- **WHEN** 开发者在本地运行项目
- **THEN** 从 `.dev.vars` 文件读取 `BGM_APP_ID` 和 `BGM_APP_SECRET`
- **AND** 若未配置则回退到当前硬编码值并打印警告

### Requirement: 统一缓存工具

系统 SHALL 提供统一的缓存工具模块 `server/src/utils/cache.js`，支持按 TTL 创建缓存实例。

#### Scenario: 路由使用缓存

- **WHEN** 任意路由需要缓存数据
- **THEN** 调用 `createCache(ttl)` 创建实例，使用 `.get(key)` 和 `.set(key, data)` 方法

### Requirement: 统一 HTTP 工具

系统 SHALL 提供统一的 HTTP 抓取工具模块 `server/src/utils/http.js`，支持单 URL 抓取（带超时）和多 URL 顺序重试。

#### Scenario: 网页抓取超时

- **WHEN** 单次 fetch 超过 8 秒
- **THEN** 请求被 abort，返回超时错误

### Requirement: 用户输入长度校验

系统 SHALL 对用户提交的文本内容做长度校验：评论 content ≤ 5000 字符，话题 title ≤ 200 字符。

#### Scenario: 提交超长内容

- **WHEN** 用户提交超过 5000 字符的评论
- **THEN** 返回 400 错误，提示「内容过长」

### Requirement: 全局错误兜底

系统 SHALL 在所有路由之后注册全局错误中间件和 404 兜底路由。

#### Scenario: 未捕获异常

- **WHEN** 路由内抛出未 try-catch 的异常
- **THEN** 返回 `{ error: '服务器内部错误' }` 500

### Requirement: 图片懒加载

系统 SHALL 在所有非首屏图片上添加 `loading="lazy"` 和 `decoding="async"` 属性。

#### Scenario: 番剧列表加载

- **WHEN** 用户浏览番剧列表页
- **THEN** 视口外的海报图片延迟加载，减少初始请求量

## MODIFIED Requirements

### Requirement: Bangumi OAuth 凭据

原硬编码凭据 SHALL 改为从 `c.env.BGM_APP_ID` / `c.env.BGM_APP_SECRET` 读取，保留默认回退值用于兼容。

### Requirement: 路由缓存

原各路由独立的 `cache` / `getCached` / `setCache` SHALL 统一替换为 `createCache(ttl)` 实例。

### Requirement: 路由 HTTP 抓取

原各路由独立的 `fetchHTML` 和 `SCRAPE_UA` SHALL 统一替换为 `server/src/utils/http.js` 导出的函数。

## REMOVED Requirements

无
