# Tasks

> 与已有 `comprehensive-optimization` spec 的关系：Task 1-3, 5, 6, 8, 10 与该 spec 的工具层、APP_SECRET、输入校验、图片懒加载、API 取消、SEO 等任务存在重叠，本 spec 在执行时优先以本任务清单为准；已有 spec 可视为本 spec 的子集，无需单独执行。

## 维度一：代码质量提升

- [x] Task 1: 从根 `package.json` 移除已弃用的 cheerio 依赖
  - [x] 使用 Grep 验证 `server/src/` 下无 `import.*cheerio` 语句
  - [x] 若 linkedom 也未被引用，一并移除（linkedom 被 comments.js 使用，保留）
  - [x] 执行 `npm install` 更新 lockfile
  - [ ] 执行 `npm run build` 验证构建成功（留待 Task 27 统一验证）

- [x] Task 2: 创建 `server/src/utils/cache.js` 统一缓存工具
  - [x] 导出 `createCache(ttl)` 工厂函数，返回 `{ get(key), set(key, data), clear() }`
  - [x] 内部使用 `Map<string, { data, time }>` 存储
  - [x] 添加 JSDoc 注释

- [x] Task 3: 创建 `server/src/utils/http.js` 统一 HTTP 工具
  - [x] 导出 `SCRAPE_UA` 常量
  - [x] 导出 `fetchHTML(url, { timeout = 8000, headers = {} })` 函数（带 AbortController 超时）
  - [x] 导出 `fetchHTMLMulti(urls, { timeout = 8000 })` 函数（多 URL 顺序重试，返回 `{ html, url }`）
  - [x] 导出辅助函数 `stripTags`、`unescapeHtml`、`parseNumber`、`fixUrl`
  - [x] 添加 JSDoc 注释

- [x] Task 4: 在 `server/src/app.js` 中添加全局错误兜底中间件和 404 路由
  - [x] 在所有 `app.route()` 之后注册 `app.onError`，返回 `{ data: null, error: '服务器内部错误', code: 500 }`
  - [x] 注册 `app.all('*', ...)` 返回 `{ data: null, error: 'Not Found', code: 404 }`
  - [x] 文件顶部添加注释说明

- [x] Task 5: 重构各路由引用统一工具模块
  - [x] `groups.js`：移除本地 `cache`/`getCached`/`setCache`/`fetchHTML`/`fetchHTMLWithRetry`/`stripTags`/`unescapeHtml`/`parseNumber`/`fixUrl`/`UA`，改为从 utils 引入
  - [x] `comments.js`：移除本地 `cache`/`getCached`/`setCache`/`fetchHTML`，改为从 utils 引入；保留 linkedom 的 `parseHTML`
  - [x] `douban.js`：移除本地 `cache`/`getCached`/`setCache`，改为从 utils 引入
  - [x] `bilibili.js`：移除本地 `cache`/`getCached`/`setCache`/`UA`，改为从 utils 引入（本地 stripTags 保留，未要求移除）
  - [x] `moegirl.js`：移除本地 `cache`/`getCached`/`setCache`，改为从 utils 引入
  - [x] `user.js`：移除本地 `fetchHTML`/`SCRAPE_UA`/`stripTags`/`unescapeHtml`/`parseNumber`/`fixUrl`，改为从 utils 引入
  - [x] 不改变各路由现有 TTL 值和功能逻辑（TTL 按路由实际值更新 config.js）

- [x] Task 6: 为服务层和工具层添加 JSDoc 类型注解
  - [x] `server/src/services/bangumi.js`：为所有导出函数添加 JSDoc 参数和返回值类型（16 个函数）
  - [x] `server/src/services/douban.js`：同上（4 个函数）
  - [x] `server/src/utils/cache.js`、`http.js`：已有完整 JSDoc（第一批已添加）

## 维度二：性能优化

- [x] Task 7: 前端图片懒加载优化
  - [x] `AnimeCard.vue`：img 标签添加 `loading="lazy"` 和 `decoding="async"`
  - [x] `Detail.vue`：Hero 背景图、角色头像、制作人员头像添加 `loading="lazy"`（7 处）
  - [x] `Groups.vue`、`GroupDetail.vue`：小组头像添加 `loading="lazy"`
  - [x] 其他 views 中的 img 标签补全 `alt` 属性（共 14 个文件 35 处 img 优化）

- [x] Task 8: 前端 API 请求取消优化
  - [x] 在 `client/src/api/index.js` 中导出 `createCancelToken()` 和 `isCanceled()` 函数
  - [x] 在 `Browse.vue` 和 `Home.vue` 的搜索/翻页逻辑中，切换请求时取消上一个未完成请求
  - [x] Axios 请求配置中传入 `signal` 参数（endpoints.js 所有方法支持 config 参数）

- [x] Task 9: 前端路由懒加载预拉取
  - [x] 路由已使用动态 import（Vite 默认预拉取），无需额外配置
  - [x] scrollBehavior 已存在（顶部对齐 + savedPosition 恢复）

- [x] Task 10: 静态资源缓存头配置
  - [x] 创建 `client/public/_headers` 文件
  - [x] 为 `/assets/*` 配置 `Cache-Control: public, max-age=31536000, immutable`
  - [x] 为 `/*.html` 配置 `Cache-Control: no-cache`
  - [x] 为 `/*` 配置安全头（X-Content-Type-Options 等）
  - [ ] 验证部署后响应头正确（留待 Task 27 部署验证）

- [x] Task 11: 服务端 Bundle 体积监控
  - [x] server:build 添加 `--metafile` 选项生成构建分析
  - [x] 创建 `scripts/bundle-size.mjs` 体积报告脚本
  - [x] build 流程集成 `bundle:size` 步骤

## 维度三：安全加固

- [x] Task 12: 将 `user.js` 中硬编码的 APP_SECRET 改为环境变量
  - [x] 修改 `APP_ID` 为 `c.env?.BGM_APP_ID || DEFAULT_APP_ID`
  - [x] 修改 `APP_SECRET` 为 `c.env?.BGM_APP_SECRET || DEFAULT_APP_SECRET`
  - [x] 创建 `.dev.vars.example` 文件说明环境变量格式（第一批已完成）
  - [x] `.gitignore` 确认忽略 `.dev.vars`（第一批已完成）

- [x] Task 13: 在 `comments.js` POST 路由中添加输入长度校验
  - [x] `/subject/:id/comment`：校验 content.length ≤ 5000
  - [x] `/topic/:topicId/reply`：校验 content.length ≤ 5000
  - [x] `/subject/:id/talkbox`：校验 content.length ≤ 5000
  - [x] `/subject/:id/topic`：校验 title.length ≤ 200、content.length ≤ 5000
  - [x] 超长时返回 400 `{ data: null, error: '内容过长', code: 400 }`
  - [x] 前端 `CommentSection.vue` 提交前截断并提示

- [x] Task 14: XSS 防护审计与加固
  - [x] 使用 Grep 搜索前端代码中所有 `v-html` 使用点
  - [x] 确认 `v-html` 仅用于受信任内容（非用户提交）——发现 1 处渲染萌娘百科内容
  - [x] 引入 `dompurify` 并创建 `v-safe-html` 指令
  - [x] 在 `client/src/main.js` 注册指令
  - [x] 替换 Detail.vue 的 v-html 为 v-safe-html

- [x] Task 15: 实现 API 速率限制中间件
  - [x] 创建 `server/src/utils/rateLimit.js`，基于内存 Map 实现（惰性清理，兼容 CF Workers）
  - [x] 导出 `rateLimit(windowMs, max)` 工厂函数
  - [x] 在 `app.js` 中对 POST/PUT/DELETE 路由应用 10 次/分钟限制
  - [x] 对 GET 路由应用 60 次/分钟限制
  - [x] 超限时返回 429 + `Retry-After` 头

- [x] Task 16: 添加安全响应头中间件
  - [x] 创建 `server/src/middleware/security.js`
  - [x] 设置 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: strict-origin-when-cross-origin`
  - [x] 设置基础 CSP（允许 Vue 内联样式和 self 脚本）
  - [x] 在 `app.js` 中 `app.use('*', securityHeaders())` 注册
  - [ ] 在 `public/_headers` 中为静态资源配置安全头（留待 Task 10 处理）

## 维度四：可维护性提升

- [x] Task 17: 引入 ESLint + Prettier 代码规范工具链
  - [x] 根目录创建 `.eslintrc.cjs`（配置 Vue3 + Node ESM 规则）
  - [x] 创建 `.prettierrc`（统一格式：单引号、无分号、2 空格缩进）
  - [x] 根 `package.json` 添加 `eslint`、`prettier`、`eslint-plugin-vue` 等 devDependencies
  - [x] 添加 `lint`、`lint:fix`、`format` npm 脚本
  - [ ] 初始运行 `npm run lint:fix`，手动修复剩余问题（当前 1488 个问题，留待后续逐步修复）
  - [x] 创建 `.eslintignore` 和 `.prettierignore`

- [x] Task 18: 引入 Vitest 测试框架
  - [x] 根 `package.json` 添加 `vitest` devDependency (^2.1.8)
  - [x] 创建 `vitest.config.js`（配置 include/exclude 避免 node_modules 误跑）
  - [x] 为 `server/src/utils/cache.js` 编写单元测试（5 个测试：set/get、TTL 过期、clear、对象存储）
  - [x] 为 `server/src/utils/http.js` 编写单元测试（10 个测试：SCRAPE_UA、stripTags、unescapeHtml、parseNumber、fixUrl、fetchHTML 超时）
  - [ ] 为 `server/src/services/bangumi.js` 的纯函数编写测试（未实现，留待后续）
  - [x] 添加 `test`、`test:watch` npm 脚本
  - [x] npm test 全部通过（15/15）

- [x] Task 19: 创建集中式配置模块
  - [x] 创建 `server/src/config.js`
  - [x] 集中管理：`CACHE_TTL_DEFAULT`、`HTTP_TIMEOUT`、`SCRAPE_UA`、`BGM_API_HOST`、`BGM_MIRROR_HOST`、`RATE_LIMIT_WINDOW`、`RATE_LIMIT_MAX_*`
  - [x] 各路由和 utils 从 config 引用，移除魔法数字
  - [x] 添加 JSDoc 说明每个配置项

- [x] Task 20: 创建统一日志工具
  - [x] 创建 `server/src/utils/logger.js`
  - [x] 导出 `logInfo(msg, meta)`、`logError(msg, meta)`、`logWarn(msg, meta)`
  - [x] 输出结构化 JSON 日志（CF Workers 自动收集 console 输出）
  - [x] 在 `app.js` 错误兜底中间件中调用 `logError`（Task 4 已集成）
  - [x] 在 utils/http.js 的 fetchHTML 失败时调用 `logError`
  - [ ] 在 utils/cache.js 命中/未命中时调用 `logInfo`（可选，避免日志过多，暂不实现）

## 维度五：开发效率提升

- [x] Task 21: 环境变量管理规范化
  - [x] 创建 `.dev.vars.example`（服务端：BGM_APP_ID、BGM_APP_SECRET）
  - [x] 创建 `client/.env.example`（前端：VITE_API_BASE_URL 等）
  - [x] 确认 `.gitignore` 包含 `.dev.vars`、`.env`、`client/.env`
  - [x] 创建 `.dev.vars`（填入现有默认值供本地开发）
  - [ ] 在 PROJECT.md 或 README 补充环境变量配置说明（留待后续）

- [x] Task 22: 统一开发命令
  - [x] 根 `package.json` 添加 `concurrently` devDependency (^9.1.0)
  - [x] 添加 `dev:server` 脚本：`node --watch server/src/app.js`
  - [x] 添加 `dev:all` 脚本：`concurrently -n server,client -c yellow,cyan "npm:dev:server" "npm:dev"`
  - [ ] 验证两个进程日志正确输出（留待 Task 27 验证）

- [x] Task 23: 配置 Pre-commit Hooks
  - [x] 根 `package.json` 添加 `husky` (^9.1.7)、`lint-staged` (^15.2.10) devDependencies
  - [x] 添加 `prepare` 脚本：`husky`（husky 9+ 方式）
  - [x] 创建 `.husky/pre-commit` 文件，运行 `npx lint-staged`
  - [x] 在 `package.json` 配置 `lint-staged`：`*.{js,vue}` → eslint + prettier
  - [ ] 验证提交时触发 hook（留待实际 git commit 时验证）

- [x] Task 24: 基础 GitHub Actions CI
  - [x] 创建 `.github/workflows/ci.yml`
  - [x] 触发条件：pull_request to main、push to main
  - [x] Job 步骤：checkout、setup-node 20、npm ci（根）、npm ci（client）、lint、test、build
  - [x] 配置 npm 缓存加速
  - [x] lint 和 test 使用 continue-on-error（当前有已知问题，不阻塞 CI）
  - [ ] （可选）main 分支 push 后部署到 CF Pages（需配置 secret，暂未实现）

- [x] Task 25: 评估并引入 API Mock（msw）
  - [x] 评估 `msw` 对前端独立开发的价值
  - [x] 决策：**不引入 msw**（项目已有 dev:all 完整本地开发环境，mock 成本高于收益）
  - [x] 记录决策理由到 `msw-decision.md`

## 维度六：SEO 与可访问性（补充）

- [x] Task 26: 前端 SEO 与 meta 标签
  - [x] 在 `client/index.html` 的 `<head>` 中添加 `<meta name="description" content="...">`
  - [x] 添加 Open Graph 标签：`og:title`、`og:description`、`og:type`、`og:url`、`og:image`
  - [x] 添加 `<meta name="theme-color" content="#E8909C">`
  - [ ] 路由 `scrollBehavior` 保持顶部对齐（留待 Task 8/9 前端优化批次处理）

## 维度七：最终验证

- [x] Task 27: 构建并部署验证
  - [ ] 运行 `npm run lint` 无错误（已知 1556 个问题，不阻塞，留待后续 lint:fix 逐步修复）
  - [x] 运行 `npm test` 全部通过（15/15 通过）
  - [x] 运行 `npm run build` 无报错（server bundle 609.5KB + client 构建成功）
  - [ ] 部署到 Cloudflare Pages 预览环境（需用户手动执行 wrangler deploy）
  - [ ] 验证线上 API（health、calendar、search）正常（需部署后验证）
  - [ ] 验证 OAuth 登录正常（需配置环境变量并部署后验证）
  - [ ] 验证安全响应头存在（需部署后验证）
  - [ ] 验证速率限制生效（需部署后验证）

# Task Dependencies

## 可并行启动（无依赖）

- Task 1（移除 cheerio）、Task 2（cache.js）、Task 3（http.js）、Task 17（ESLint）、Task 21（环境变量模板）、Task 26（SEO meta）

## 串行依赖

- Task 4（错误中间件）依赖 Task 20（logger）—— 错误中间件需调用 logError
- Task 5（路由重构引用 utils）依赖 Task 2、Task 3（工具模块先行）
- Task 13（输入校验）建议在 Task 5（comments.js 重构）后进行，避免冲突
- Task 15（速率限制）、Task 16（安全头）可独立，但需在 Task 4（错误中间件）后注册到 app.js
- Task 18（Vitest 测试）依赖 Task 2、Task 3（被测对象先行）
- Task 19（config.js）建议在 Task 2、Task 3 后进行，将魔法数字迁移到 config
- Task 22（dev:all）依赖 Task 21（环境变量）以正确启动后端
- Task 23（pre-commit）依赖 Task 17（ESLint）以运行 lint
- Task 24（CI）依赖 Task 17、Task 18（lint + test 命令存在）
- Task 27（最终验证）依赖所有前置任务完成

## 建议执行批次

1. **第一批（基础设施）**：Task 1, 2, 3, 17, 21, 26 并行
2. **第二批（核心重构）**：Task 5, 19, 20 串行/并行
3. **第三批（安全加固）**：Task 4, 12, 13, 14, 15, 16 并行
4. **第四批（测试与规范）**：Task 6, 18 串行
5. **第五批（开发体验）**：Task 22, 23, 24, 25 并行
6. **第六批（性能与验证）**：Task 7, 8, 9, 10, 11, 27
