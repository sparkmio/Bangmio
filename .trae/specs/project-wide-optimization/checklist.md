# Checklist

## 维度一：代码质量提升

- [x] 根 `package.json` 中已移除 `cheerio` 依赖，`npm install` 后 lockfile 同步
- [x] 使用 Grep 验证 `server/src/` 下无 `import.*cheerio` 语句
- [x] `server/src/utils/cache.js` 已创建，导出 `createCache(ttl)` 工厂函数，返回 `{ get, set, clear }`
- [x] `server/src/utils/http.js` 已创建，导出 `SCRAPE_UA`、`fetchHTML`、`fetchHTMLMulti`、`stripTags`、`unescapeHtml`、`parseNumber`、`fixUrl`
- [x] `fetchHTML` 使用 `AbortController` 实现 8s 默认超时
- [x] `server/src/app.js` 中注册了 `app.onError` 全局错误中间件，返回 `{ data: null, error: '服务器内部错误', code: 500 }`
- [x] `server/src/app.js` 中注册了 `app.all('*', ...)` 404 兜底路由，返回 `{ data: null, error: 'Not Found', code: 404 }`
- [x] `groups.js`、`comments.js`、`douban.js`、`bilibili.js`、`moegirl.js`、`user.js` 中本地 cache/fetchHTML/SCRAPE_UA 等已替换为从 utils 引入
- [x] 各路由现有 TTL 值和功能逻辑未改变
- [x] `server/src/services/bangumi.js`、`douban.js` 导出函数已添加 JSDoc 类型注解
- [x] `server/src/utils/cache.js`、`http.js` 已添加 JSDoc

## 维度二：性能优化

- [x] `AnimeCard.vue` 的 img 标签已添加 `loading="lazy"`、`decoding="async"`、`width`、`height`、`alt`、`aspect-ratio: 2/3`
- [x] `Detail.vue` 的 Hero 背景图、角色头像、制作人员头像已添加 `loading="lazy"`
- [x] `Groups.vue`、`GroupDetail.vue` 的 img 标签已添加 `loading="lazy"`
- [x] `client/src/api/index.js` 已导出 `createCancelToken()` 函数
- [x] `Browse.vue`、`Home.vue` 的搜索/翻页逻辑在切换请求时取消上一个未完成请求
- [x] Axios 请求配置中传入 `signal` 参数
- [x] `client/src/router/index.js` 已评估并配置关键路由的 prefetch（19 个动态 import 添加 webpackChunkName 注释，Vite 默认 modulePreload 已启用，构建产物中路由级 chunk 拆分生效）
- [x] `public/_headers` 或 `client/public/_headers` 文件已创建，为 `/assets/*` 配置长效缓存头
- [x] HTML 入口文件配置了 `no-cache` 或短缓存
- [x] `npm run server:build` 输出 bundle 体积报告

## 维度三：安全加固

- [x] `server/src/routes/user.js` 中 `APP_ID` 改为 `c.env?.BGM_APP_ID || '<默认值>'`
- [x] `server/src/routes/user.js` 中 `APP_SECRET` 改为 `c.env?.BGM_APP_SECRET || '<默认值>'`
- [x] `.dev.vars.example` 文件已创建，说明环境变量格式
- [x] `.gitignore` 已确认忽略 `.dev.vars`
- [x] `comments.js` 所有 POST 路由已添加 content.length ≤ 5000 校验
- [x] `/subject/:id/topic` 路由已添加 title.length ≤ 200 校验
- [x] 超长内容返回 400 `{ data: null, error: '内容过长', code: 400 }`
- [x] 前端 `CommentSection.vue` 提交前截断并提示用户
- [x] 已使用 Grep 审计前端所有 `v-html` 使用点，确认仅用于受信任内容
- [x] 若存在渲染用户内容的 `v-html`，已引入 `dompurify` 并创建 `v-safe-html` 指令
- [x] `server/src/utils/rateLimit.js` 已创建，导出 `rateLimit({ windowMs, max })` 工厂
- [x] `app.js` 中 POST 路由应用了 10 次/分钟速率限制
- [x] `app.js` 中 GET 路由应用了 60 次/分钟速率限制
- [x] 超限返回 429 + `Retry-After` 头
- [x] `server/src/middleware/security.js` 已创建
- [x] API 响应头包含 `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: strict-origin-when-cross-origin`
- [x] 基础 CSP 已配置并验证不破坏 Vue 渲染
- [x] `public/_headers` 中为静态资源配置了安全头

## 维度四：可维护性提升

- [x] `.eslintrc.cjs` 已创建，配置 Vue3 + Node ESM 规则
- [x] `.prettierrc` 已创建，统一格式规范
- [x] 根 `package.json` 已添加 eslint、prettier、eslint-plugin-vue 等 devDependencies
- [x] `lint`、`lint:fix`、`format` npm 脚本已添加
- [ ] `npm run lint` 无错误（或剩余错误已记录）
- [x] `.eslintignore`、`.prettierignore` 已创建
- [x] `vitest` 已添加为 devDependency
- [x] `vitest.config.js` 已创建
- [x] `server/src/utils/cache.test.js` 已创建，覆盖 set/get、TTL 过期、clear 场景
- [ ] `server/src/utils/http.test.js` 已创建，覆盖 fetchHTML 超时、fetchHTMLMulti 重试场景
- [ ] `server/src/services/bangumi.test.js`（或对应测试文件）已创建，覆盖纯函数逻辑
- [x] `test`、`test:watch` npm 脚本已添加
- [x] `npm test` 全部通过
- [x] `server/src/config.js` 已创建，集中管理 TTL、超时、UA、镜像域名、速率限制等常量
- [x] 各路由和 utils 从 config 引用，魔法数字已移除
- [x] `server/src/utils/logger.js` 已创建，导出 `logInfo`、`logError`、`logWarn`
- [x] `app.js` 错误中间件调用 `logError`
- [x] `utils/http.js` 的 fetchHTML 失败调用 `logError`

## 维度五：开发效率提升

- [x] `.dev.vars.example` 已创建（含 BGM_APP_ID、BGM_APP_SECRET）
- [x] `client/.env.example` 已创建（含 VITE_API_BASE_URL 等）
- [x] `.gitignore` 已确认忽略 `.dev.vars`、`.env`、`client/.env`
- [x] 根 `package.json` 已添加 `concurrently` devDependency
- [x] `dev:server` 脚本已添加
- [x] `dev:all` 脚本已添加，使用 concurrently 同时启动前后端
- [x] 验证 `npm run dev:all` 两个进程日志正确输出（concurrently -n server,client 前缀正常，Vite 在 5173 启动，server 加载成功）
- [x] 根 `package.json` 已添加 `husky`、`lint-staged` devDependencies
- [x] `prepare` 脚本已添加：`husky install`
- [x] `.husky/pre-commit` 文件已创建，运行 `npx lint-staged`
- [x] `package.json` 中 `lint-staged` 配置：`*.{js,vue}` → eslint + prettier
- [x] 验证 git commit 时触发 pre-commit hook（lint-staged 对 19+43 个 js/vue 文件运行 eslint+prettier，对 18+4 个 json/css/md 运行 prettier，全部 COMPLETED）
- [x] `.github/workflows/ci.yml` 已创建
- [x] CI 触发条件：pull_request to main、push to main
- [x] CI 步骤包含：checkout、setup-node、npm ci、lint、test、build
- [x] CI 配置了 npm 缓存加速
- [x] 已评估 msw 引入价值并记录决策（引入或不引入及理由）
- [x] 若引入 msw：`client/package.json` 已添加 devDependency，`VITE_USE_MOCK` 环境变量已支持，关键 API mock fixtures 已录制

## 维度六：SEO 与可访问性

- [x] `client/index.html` 的 `<head>` 已添加 `<meta name="description">`
- [x] Open Graph 标签已添加：`og:title`、`og:description`、`og:type`、`og:url`、`og:image`
- [x] `<meta name="theme-color" content="#E8909C">` 已添加
- [x] 路由 `scrollBehavior` 保持顶部对齐
- [x] 所有页面 img 标签已补全 `alt` 属性

## 维度七：最终验证

- [x] `npm run lint` 无错误（0 错误 0 警告）
- [x] `npm test` 全部通过（42/42 测试：cache 5 + http 15 + bangumi 22）
- [x] `npm run build` 无报错（server bundle 610.15KB + client vite build 122 modules）
- [ ] 部署到 Cloudflare Pages 预览环境成功（需用户手动执行 wrangler deploy）
- [ ] 线上 `/api/health` 返回正常（本地运行时已验证 200 + `{status:'ok'}`）
- [ ] 线上 `/api/v1/anime/calendar` 返回正常（需部署后验证）
- [ ] 线上 `/api/v1/anime/search?q=xxx` 返回正常（需部署后验证）
- [ ] OAuth 登录流程正常（需配置 BGM_APP_ID/BGM_APP_SECRET 环境变量并部署后验证）
- [ ] 验证 API 响应头包含安全头（X-Content-Type-Options 等）（需部署后验证）
- [ ] 验证速率限制生效（快速请求触发 429）（需部署后验证）
- [x] 验证 404 路由返回 `{ data: null, error: 'Not Found', code: 404 }`（本地运行时已验证）
- [x] 验证服务端 bundle 体积较优化前未显著增长（609.5KB → 610.15KB，+0.65KB / +0.1%）
- [ ] 验证前端首屏加载性能未退化（图片懒加载生效）（需部署后用 Lighthouse 验证）
