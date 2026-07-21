# Bangmio 项目全面优化 Spec

> 基于 PROJECT.md 全文分析得出的战略性优化方案，覆盖代码质量、性能、安全、可维护性、开发效率五个维度。
> 与已有 `comprehensive-optimization` spec 互补：后者聚焦具体代码级修复（缓存/HTTP 工具层、APP_SECRET 环境变量化、图片懒加载等），本 spec 在其基础上补全工程化、安全加固、测试、CI/CD 等系统性能力。

## Why

PROJECT.md 显示项目功能基本完善、技术选型合理（Vue3 + Hono + Cloudflare Pages），但存在系统性短板：

1. **工程化缺失**：无 ESLint/Prettier/测试框架/CI，依赖清理不彻底（cheerio 已弃用但仍在 package.json）；
2. **错误处理不一致**：服务端无全局错误兜底中间件、无 404 路由，约定"错误返回 null"模式掩盖了真实失败原因；
3. **安全风险**：POST 路由无速率限制、无 CSP/安全响应头、Token 存 localStorage 存在 XSS 暴露面；
4. **开发体验差**：前后端需分别 `cd` 启动、无环境变量统一管理、无 pre-commit 校验、无 HMR 后端开发；
5. **可观测性弱**：无统一日志、无错误上报、线上问题排查靠肉眼。

本 spec 旨在通过分阶段、低风险的改造，将项目从"能跑"提升到"可维护、可扩展、可监控"的工程化水准。

## What Changes

### 维度一：代码质量提升

#### 1.1 依赖清理

- **BREAKING**：从根 `package.json` 移除已弃用的 `cheerio` 依赖（PROJECT.md §10.1 已标注弃用但未移除）
- 移除 `linkedom` 若实际未被使用（需先 grep 验证引用）

#### 1.2 统一错误处理与响应格式

- 在 `server/src/app.js` 注册全局 `app.onError` 兜底中间件，捕获未处理异常返回 `{ error: '服务器内部错误', code: 500 }`
- 注册 `app.all('*', ...)` 404 兜底路由
- 服务端统一响应格式：成功 `{ data: T }`，失败 `{ data: null, error: string, code: number }`（向后兼容现有 `data: null` 约定）

#### 1.3 服务端公共工具层抽取

- 创建 `server/src/utils/cache.js`：统一 `createCache(ttl)` 工厂（参考已有 `comprehensive-optimization` spec Task 1）
- 创建 `server/src/utils/http.js`：统一 `fetchHTML` + `SCRAPE_UA` + 超时控制（参考已有 spec Task 2）
- 各路由移除重复的本地 cache/fetchHTML 实现，改为引用统一工具

#### 1.4 服务层 JSDoc 类型注解

- 为 `server/src/services/bangumi.js` 和 `server/src/services/douban.js` 的导出函数添加 JSDoc 类型注解
- 为 `server/src/utils/*.js` 导出函数添加 JSDoc

### 维度二：性能优化

#### 2.1 前端路由懒加载预拉取

- 在 `client/src/router/index.js` 中为所有路由组件配置 `webpackPrefetch`/`webpackPreload` 提示（Vite 通过 `<link rel="prefetch">` 实现）
- 关键路由（Home、Detail）在空闲时预拉取，次级路由在 hover 时预拉取

#### 2.2 图片懒加载与优化（参考已有 spec）

- `AnimeCard.vue`、`Detail.vue` 等组件 img 标签添加 `loading="lazy"` 和 `decoding="async"`
- 为番剧海报添加 `width`/`height` 属性避免 CLS（布局偏移）

#### 2.3 前端 API 请求取消（参考已有 spec）

- `client/src/api/index.js` 添加 `AbortController` 支持
- 路由切换时取消未完成请求，避免旧响应覆盖新结果

#### 2.4 静态资源缓存头

- 在 `functions/api/[[path]].js` 或 `_routes.json` 中为 `client/dist/assets/*` 配置长效缓存头（`Cache-Control: public, max-age=31536000, immutable`）
- HTML 入口文件配置短缓存或 `no-cache`

#### 2.5 服务端 Bundle 体积监控

- 在 `npm run server:build` 后输出 bundle 体积报告
- 评估是否可进一步 tree-shake（当前 ~580KB）

### 维度三：安全加固

#### 3.1 敏感信息环境变量化（参考已有 spec）

- `server/src/routes/user.js` 中 `APP_ID`/`APP_SECRET` 改为从 `c.env.BGM_APP_ID`/`c.env.BGM_APP_SECRET` 读取
- 创建 `.dev.vars.example` 文件说明环境变量格式
- 回退到默认值仅用于开发，生产强制要求环境变量

#### 3.2 用户输入校验（参考已有 spec）

- `comments.js` POST 路由校验 content ≤ 5000 字符、title ≤ 200 字符
- 前端 `CommentSection.vue` 提交前截断

#### 3.3 XSS 防护：用户内容 sanitize

- 前端渲染用户提交的评论/吐槽/话题内容时，使用 `DOMPurify` 或 Vue 默认转义（确认未使用 `v-html` 渲染用户内容）
- 若存在 `v-html` 渲染用户内容，必须引入 `dompurify` 包并包装为 `v-safe-html` 指令

#### 3.4 API 速率限制

- 使用 `hono/rate-limiter` 或自实现基于内存 Map 的速率限制中间件
- POST 路由（发评论/话题/回复）限制：每 IP 每分钟 10 次
- 搜索类 GET 路由限制：每 IP 每分钟 60 次

#### 3.5 安全响应头

- 在 `server/src/app.js` 添加安全头中间件：
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; ...`（需适配 Vue 内联样式）
- 通过 Cloudflare Pages 或 `_headers` 文件配置静态资源安全头

### 维度四：可维护性提升

#### 4.1 引入 ESLint + Prettier

- 根目录添加 `.eslintrc.cjs`（Vue + Node 配置）、`.prettierrc`
- 添加 `lint` 和 `format` npm 脚本
- 初始运行 `lint --fix` 修复可自动修复的问题，手动修复剩余

#### 4.2 引入测试框架 Vitest

- 添加 `vitest` 为 devDependency
- 为 `server/src/utils/cache.js`、`http.js` 编写单元测试
- 为关键服务层函数（bangumi.js 的 URL 重写、节点判断）编写测试
- 添加 `test` npm 脚本

#### 4.3 集中式配置管理

- 创建 `server/src/config.js`，集中管理：默认 TTL、超时、UA、镜像域名等常量
- 各路由从 config 引用，避免魔法数字散落

#### 4.4 统一日志策略

- 创建 `server/src/utils/logger.js`，封装 `logInfo`/`logError`/`logWarn`
- 关键路径（外部 API 失败、缓存命中/未命中、错误兜底）输出结构化日志
- 生产环境通过 `console.log` 输出（CF Workers 日志会自动收集）

### 维度五：开发效率提升

#### 5.1 环境变量管理

- 创建 `.dev.vars.example`（服务端开发环境变量模板）
- 创建 `client/.env.example`（前端环境变量模板，如 API base URL）
- `.gitignore` 确认忽略 `.dev.vars` 和 `.env`

#### 5.2 统一开发命令

- 根 `package.json` 添加 `dev:all` 脚本，使用 `concurrently` 同时启动前后端开发服务器
- 后端开发使用 `wrangler pages dev` 而非 `node --watch`，以模拟 CF 运行时环境

#### 5.3 Pre-commit Hooks

- 添加 `husky` + `lint-staged`
- pre-commit 时对暂存文件运行 ESLint + Prettier
- 添加 `prepare` 脚本自动安装 git hooks

#### 5.4 基础 GitHub Actions CI

- 创建 `.github/workflows/ci.yml`：
  - PR 触发：lint + build 验证
  - main 分支 push：lint + build + 部署到 Cloudflare Pages（需配置 secrets）
- CI 中缓存 npm 依赖加速

#### 5.5 API Mock for 前端独立开发

- 评估引入 `msw`（Mock Service Worker）用于前端独立开发
- 录制关键 API 响应作为 mock 数据
- 降低前端对后端/外部 API 的依赖

## Impact

- Affected specs：
  - `comprehensive-optimization` — 部分内容重叠（工具层、APP_SECRET、输入校验、图片懒加载、API 取消、SEO），本 spec 引用并扩展
  - `ui-detail-refinement` — 已完成，无影响
  - `fix-groups` — 已完成，无影响
- Affected code：
  - `package.json`（根 + client）— 移除 cheerio，新增 ESLint/Prettier/Vitest/husky/concurrently/msw
  - `server/src/app.js` — 添加错误中间件、404、安全头、速率限制
  - `server/src/utils/` — 新建 cache.js、http.js、logger.js、config.js
  - `server/src/routes/*.js` — 引用统一工具、移除重复实现
  - `server/src/services/*.js` — 添加 JSDoc
  - `client/src/api/index.js` — 请求取消
  - `client/src/router/index.js` — 路由预拉取
  - `client/src/components/*.vue` — 图片懒加载
  - `functions/api/[[path]].js` — 静态资源缓存头
  - `.eslintrc.cjs`、`.prettierrc`、`vitest.config.js`、`.github/workflows/ci.yml` — 新建
  - `.dev.vars.example`、`client/.env.example` — 新建

## ADDED Requirements

### Requirement: 全局错误兜底中间件

系统 SHALL 在所有路由之后注册全局 `onError` 中间件和 404 兜底路由，确保任何未捕获异常返回结构化错误响应而非崩溃。

#### Scenario: 路由抛出未捕获异常

- **WHEN** 路由处理函数抛出未 try-catch 的异常
- **THEN** 返回 `{ data: null, error: '服务器内部错误', code: 500 }`，HTTP 状态码 500

#### Scenario: 访问不存在的 API 路径

- **WHEN** 客户端请求未注册的 `/api/v1/xxx`
- **THEN** 返回 `{ data: null, error: 'Not Found', code: 404 }`，HTTP 状态码 404

### Requirement: 统一缓存工具模块

系统 SHALL 提供 `server/src/utils/cache.js`，导出 `createCache(ttl)` 工厂函数，返回 `{ get(key), set(key, data), clear() }` 接口。

#### Scenario: 路由使用缓存

- **WHEN** 任意路由需要缓存数据
- **THEN** 调用 `createCache(ttl)` 创建实例，使用 `.get(key)` 和 `.set(key, data)` 方法
- **AND** 不改变各路由现有 TTL 值

### Requirement: 统一 HTTP 抓取工具

系统 SHALL 提供 `server/src/utils/http.js`，导出带超时控制的 `fetchHTML(url, { timeout, headers })` 和多源重试 `fetchHTMLMulti(urls, { timeout })`。

#### Scenario: 网页抓取超时

- **WHEN** 单次 fetch 超过 8 秒（默认）
- **THEN** 请求被 AbortController 中止，返回超时错误
- **AND** 多源场景下自动尝试下一个 URL

### Requirement: API 速率限制

系统 SHALL 对所有 `/api/v1/*` 路由应用速率限制：POST 路由每 IP 每分钟 ≤ 10 次，GET 路由每 IP 每分钟 ≤ 60 次。

#### Scenario: 超出速率限制

- **WHEN** 同一 IP 在 1 分钟内发起第 11 次 POST 请求
- **THEN** 返回 `{ data: null, error: '请求过于频繁', code: 429 }`，HTTP 状态码 429
- **AND** 响应头包含 `Retry-After: 60`

### Requirement: 安全响应头

系统 SHALL 为所有 API 响应添加安全相关 HTTP 头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、基础 CSP。

#### Scenario: API 响应包含安全头

- **WHEN** 客户端请求任意 `/api/*` 路径
- **THEN** 响应头包含 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: strict-origin-when-cross-origin`

### Requirement: XSS 防护

系统 SHALL 确保所有用户提交的文本内容在渲染前经过 HTML 转义或 sanitize，禁止使用 `v-html` 直接渲染用户内容。

#### Scenario: 渲染含脚本的用户评论

- **WHEN** 用户提交包含 `<script>alert(1)</script>` 的评论
- **THEN** 前端渲染时脚本被转义为纯文本显示，不执行

### Requirement: 代码规范工具链

系统 SHALL 集成 ESLint + Prettier，提供 `npm run lint` 和 `npm run format` 脚本，并通过 pre-commit hook 自动校验暂存文件。

#### Scenario: 提交不规范代码

- **WHEN** 开发者 git commit 包含格式错误的代码
- **THEN** pre-commit hook 阻止提交，输出 lint 错误
- **AND** 可自动修复的问题已被 Prettier 修正

### Requirement: 单元测试框架

系统 SHALL 集成 Vitest，为 `server/src/utils/*.js` 和关键 service 函数提供单元测试，`npm test` 可运行全部测试。

#### Scenario: 运行测试

- **WHEN** 开发者执行 `npm test`
- **THEN** Vitest 运行所有 `*.test.js` 文件
- **AND** 输出通过/失败统计，失败时非零退出码

### Requirement: 持续集成

系统 SHALL 提供 GitHub Actions CI，在 PR 和 push 时自动运行 lint + build + test。

#### Scenario: 提交 PR

- **WHEN** 开发者向 main 分支提交 PR
- **THEN** CI 自动运行 `npm run lint`、`npm test`、`npm run build`
- **AND** 任一步骤失败时 PR 显示 ❌ 状态检查

### Requirement: 统一日志

系统 SHALL 提供 `server/src/utils/logger.js`，封装 `logInfo`/`logError`/`logWarn`，关键路径输出结构化日志。

#### Scenario: 外部 API 失败

- **WHEN** 服务端调用 Bangumi/豆瓣/B站 API 失败
- **THEN** 通过 `logError` 输出错误详情（URL、状态码、错误消息）
- **AND** 请求继续执行兜底逻辑，不中断

### Requirement: 集中式配置

系统 SHALL 提供 `server/src/config.js`，集中管理 TTL、超时、UA、镜像域名等常量，各路由从 config 引用。

#### Scenario: 修改默认缓存 TTL

- **WHEN** 开发者需要调整全局缓存 TTL
- **THEN** 只需修改 `config.js` 中的 `CACHE_TTL` 常量
- **AND** 所有引用该常量的路由自动生效

### Requirement: 统一开发命令

系统 SHALL 提供 `npm run dev:all` 脚本，使用 `concurrently` 同时启动前端和后端开发服务器。

#### Scenario: 启动本地开发

- **WHEN** 开发者执行 `npm run dev:all`
- **THEN** 前端 Vite dev server 和后端 wrangler pages dev 同时启动
- **AND** 两个进程的日志在同一个终端输出，带前缀区分

### Requirement: 依赖清理

系统 SHALL 从 `package.json` 移除已弃用且未使用的依赖（cheerio），保持依赖清单精简。

#### Scenario: 构建产物不含 cheerio

- **WHEN** 执行 `npm run build`
- **THEN** bundle 中不包含 cheerio 代码
- **AND** 构建体积较清理前减小

## MODIFIED Requirements

### Requirement: 服务端错误响应格式

原约定"错误不抛异常，返回 null 数据" SHALL 改为：成功返回 `{ data: T }`，失败返回 `{ data: null, error: string, code: number }` 并设置对应 HTTP 状态码，向后兼容现有前端 `data: null` 判断。

### Requirement: Bangumi OAuth 凭据

原硬编码凭据 SHALL 改为从 `c.env.BGM_APP_ID` / `c.env.BGM_APP_SECRET` 读取，生产环境强制要求配置。

### Requirement: 路由缓存实现

原各路由独立的 `cache` / `getCached` / `setCache` SHALL 统一替换为 `createCache(ttl)` 实例，从 `server/src/utils/cache.js` 引入。

### Requirement: 路由 HTTP 抓取

原各路由独立的 `fetchHTML` 和 `SCRAPE_UA` SHALL 统一替换为 `server/src/utils/http.js` 导出的函数。

## REMOVED Requirements

### Requirement: cheerio 依赖

**Reason**: cheerio 依赖 `node:stream`，Cloudflare Workers 运行时不支持，已在 PROJECT.md §10.1 标注弃用但未从 package.json 移除，导致依赖冗余。
**Migration**: 确认 `server/src/routes/*.js` 和 `services/*.js` 中无 `import cheerio` 语句后，从 `package.json` dependencies 移除，执行 `npm install` 更新 lockfile。
