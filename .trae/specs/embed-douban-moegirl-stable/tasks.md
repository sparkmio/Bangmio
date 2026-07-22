# Tasks

## Phase 1：诊断与基线测试

- [x] Task 1: 线上探测当前代理接口
  - [x] 1.1 使用 curl/浏览器访问 `https://bangmio.site/api/v1/douban/page/:id`，记录 HTTP 状态、Content-Type、HTML 长度、关键选择器（`#interest_sectl`、`.comment-item`）存在性
  - [x] 1.2 使用 curl/浏览器访问 `https://bangmio.site/api/v1/moegirl/page/:name`，记录 HTML 长度、`.mw-parser-output` 存在性、图片是否可加载
  - [x] 1.3 在 Chrome/Safari/Firefox/Edge 桌面端与移动端打开 Bangmio 番剧详情页，记录豆瓣/萌娘 Tab 的渲染结果（空白、样式错乱、高度异常、链接不可点）
  - [x] 1.4 整理问题清单，写入 `.trae/specs/embed-douban-moegirl-stable/diary.md`（每次尝试的记录文件）
- [x] Task 2: 建立最小可复现测试页
  - [x] 2.1 创建 `client/public/embed-test.html`，独立测试 `srcdoc` 与 `src` 模式
  - [x] 2.2 对比两种模式在主流浏览器下的差异

## Phase 2：服务端清洗增强（方案 A）

- [x] Task 3: 增强豆瓣页面清洗
  - [x] 3.1 在 `cleanDoubanPage` 中移除 `<noscript>` 与 `<link rel="stylesheet">`
  - [x] 3.2 将 `href="/..."` 与 `src="/..."` 转换为 `https://movie.douban.com/...`
  - [x] 3.3 在返回的 HTML 顶部注入 `<meta name="viewport">` 与响应式基础 CSS
  - [x] 3.4 保留 `#interest_sectl`、`.comment-item`、`.review-item` 等核心内容
- [x] Task 4: 增强萌娘百科页面清洗
  - [x] 4.1 在 `cleanMoegirlPage` 中处理图片懒加载（`data-src` → `src`）
  - [x] 4.2 将相对链接转换为对应萌娘域名的绝对链接
  - [x] 4.3 注入 viewport 与表格/图片响应式 CSS
  - [x] 4.4 确保 `.mw-parser-output` 外无多余导航/广告元素
  - [x] 4.5 新增 template 内容解包逻辑，兼容萌娘百科新皮肤
- [x] Task 5: 单元测试覆盖清洗规则
  - [x] 5.1 新增/更新 `douban.test.js`：验证移除 noscript/link、链接绝对化、viewport 注入
  - [x] 5.2 新增/更新 `moegirl.test.js`：验证 mw-parser-output 提取、图片懒加载处理、链接绝对化、四候选源 fallback

## Phase 3：iframe 组件稳定性增强（方案 B）

- [x] Task 6: 重构 `IframeEmbed.vue`
  - [x] 6.1 新增 `mode` prop（`'srcdoc' | 'src'`，默认 `'srcdoc'`）
  - [x] 6.2 `srcdoc` 模式：fetch 获取 HTML 后设置 `srcdoc`，保持现有 sandbox，增加 CSP meta 注入
  - [x] 6.3 `src` 模式：直接设置 iframe `src` 为代理 URL，由服务端返回完整 HTML 文档
  - [x] 6.4 高度自适应：`srcdoc` 模式使用 `ResizeObserver` + 图片 load 事件；`src` 模式使用 `postMessage` 双向通信
  - [x] 6.5 加载超时：8 秒未成功则显示错误占位，支持手动重试
  - [x] 6.6 连续失败 2 次后触发 `fallback` 事件，父组件切换为 API 摘要展示
- [x] Task 7: 在 `Detail.vue` 中集成双模式与 fallback
  - [x] 7.1 默认使用 `srcdoc` 模式
  - [x] 7.2 读取 URL query `?embed=src` 切换到 `src` 模式，便于 AB 测试
  - [x] 7.3 监听 `IframeEmbed` 的 `fallback` 事件，切换到 `ExternalEmbedFallback` 组件
  - [x] 7.4 记录模式切换与 fallback 触发次数（可选，通过 console 或日志）

## Phase 4：流式代理与资源本地化（方案 C/E，可选）

- [ ] Task 8: 实现服务端流式响应
  - [ ] 8.1 在 `douban.js` 与 `moegirl.js` 的 `/page/*` 路由中，当 HTML 较大时使用 `ReadableStream` 返回
  - [ ] 8.2 仅对 `src` 模式启用流式（通过请求头或 query 区分）
  - [ ] 8.3 验证流式响应在 Cloudflare Pages 上正常工作
- [ ] Task 9: 关键图片资源本地化
  - [ ] 9.1 识别豆瓣/萌娘页面中的首图/海报
  - [ ] 9.2 服务端抓取后转为 base64 data URL（仅 1-2 张关键图，避免超时）
  - [ ] 9.3 替换原页面中的对应 `src`/`data-src`

## Phase 5：API 摘要 fallback（方案 D）

- [x] Task 10: 后端实现结构化摘要接口
  - [x] 10.1 在 `server/src/services/douban.js` 新增 `getDoubanSummary(id)`，返回 `{ title, rate, star, url, intro, keyInfo }`
  - [x] 10.2 在 `server/src/services/moegirl.js` 新增 `getMoegirlSummary(name)`，返回 `{ title, extract, url }`
  - [x] 10.3 在 `douban.js` 路由新增 `GET /:id/summary`
  - [x] 10.4 在 `moegirl.js` 路由新增 `GET /:name/summary`
- [x] Task 11: 前端实现 `ExternalEmbedFallback.vue`
  - [x] 11.1 接收 `title`、`content`（HTML 或纯文本）、`url`、`source`（douban/moegirl）props
  - [x] 11.2 展示结构化摘要与「查看原站」按钮
  - [x] 11.3 视觉风格与 Bangmio 现有卡片一致
  - [x] 11.4 在 `Detail.vue` 中集成，当 `IframeEmbed` fallback 事件触发时显示

## Phase 6：验证与部署

- [x] Task 12: 跨浏览器测试矩阵验证（部分完成）
  - [x] 12.1 Chrome 桌面版：集成 Chromium（Chrome 142 / Electron 39.2.7）已打开测试页，页面结构与控件渲染正常
  - [ ] 12.2 Chrome Android：需在真实设备/模拟器中手动验证
  - [ ] 12.3 Safari 桌面版：需手动验证
  - [ ] 12.4 Safari iOS：需手动验证
  - [ ] 12.5 Firefox 桌面版：需手动验证
  - [ ] 12.6 Firefox Android：需手动验证
  - [ ] 12.7 Edge 桌面版：需手动验证
  - [x] 12.8 记录每浏览器下最终采用的嵌入模式与遇到的问题（已记录于 `diary.md` 尝试 #2）
- [x] Task 13: 测试 + lint + 构建
  - [x] 13.1 `npm test`（vitest run）全部通过：186 passed / 6 skipped / 0 failed
  - [x] 13.2 `npm run lint` 0 错误 0 警告
  - [x] 13.3 `npm run build`（client）成功
- [ ] Task 14: 提交并推送
  - [ ] 14.1 整理 `diary.md` 中的尝试记录，作为 commit message 附件或 PR 说明
  - [ ] 14.2 `git commit`
  - [ ] 14.3 `git push origin master` 触发 CF Pages 部署

# Task Dependencies

- Task 2 依赖 Task 1（先完成基线探测，再建复现页）
- Task 5 依赖 Task 3 + Task 4（清洗增强完成后补测试）
- Task 7 依赖 Task 6（组件重构完成后再集成到 Detail）
- Task 8 依赖 Task 3 + Task 4 + Task 6（流式响应需清洗与组件支持）
- Task 9 依赖 Task 3 + Task 4（图片本地化基于清洗后的页面）
- Task 11 依赖 Task 10（后端摘要接口完成后前端 fallback）
- Task 12 依赖 Task 6 + Task 7 + Task 11（需组件与 fallback 都可用）
- Task 13 依赖所有前置任务
- Task 14 依赖 Task 13

# Parallelizable Work

以下任务可并行执行：

- Task 1 与 Task 2 可部分并行
- Task 3 与 Task 4 可并行
- Task 6 与 Task 10 可并行
- Task 11 依赖 Task 10，但可与 Task 7 并行开发（使用 mock 数据）
