# 豆瓣与萌娘百科稳定嵌入 Spec

## Why

`fix-six-core-issues` 已上线基于「服务端代理 + linkedom 清洗 + iframe srcdoc 嵌入」的豆瓣/萌娘百科展示方案，解决了广告过滤与跨域隔离问题。但生产环境反馈及跨浏览器测试表明，该方案在以下场景仍不稳定：

1. **浏览器差异**：部分浏览器（Safari/Firefox 移动端）对 `sandbox` 属性或 `srcdoc` 的解析行为差异，导致样式错乱、空白或链接不可点。
2. **上游反爬**：豆瓣、萌娘百科对第三方服务器抓取有反爬与 JS 检测，服务端偶尔返回拦截页或极短 HTML，清洗后内容为空。
3. **移动端适配**：清洗后的页面未注入移动端 viewport，导致小屏设备上横向滚动、文字过小。
4. **高度自适应缺陷**：`IframeEmbed.vue` 依赖 `contentDocument.body.scrollHeight`，同源策略下受限，且图片懒加载后高度不更新。
5. **缺少降级**：当 iframe 完全不可用时，前端没有结构化摘要 fallback，用户只能看到错误占位。

本 spec 系统性尝试并验证多种技术方案，建立可回退的嵌入策略，最终在不同浏览器与设备上稳定展示豆瓣/萌娘百科内容。

## What Changes

### 方案 A：服务端清洗增强（基线优化）

- 增强 `server/src/routes/douban.js` 的 `cleanDoubanPage`：
  - 移除 `<noscript>`、`<link rel="stylesheet">` 等残留标签
  - 将相对链接（`href="/..."`、`src="/..."`）绝对化
  - 注入 `<meta name="viewport">` 与响应式基础 CSS
- 增强 `server/src/routes/moegirl.js` 的 `cleanMoegirlPage`：
  - 处理图片懒加载（`data-src` → `src`）
  - 链接绝对化
  - 注入 viewport 与表格/图片响应式 CSS

### 方案 B：iframe 稳定性增强

- 重构 `client/src/components/IframeEmbed.vue`：
  - 新增 `mode` prop：`srcdoc`（现有模式）与 `src`（直接加载代理 URL）
  - `srcdoc` 模式：增强 sandbox 说明、增加 CSP meta、处理加载超时
  - `src` 模式：iframe 直接指向 `/api/v1/douban/page/:id` 或 `/api/v1/moegirl/page/:name`，由服务端返回完整 HTML 文档
  - 高度自适应：优先使用 `ResizeObserver`，降级为定时轮询；图片加载后重新计算
  - 加载超时（>8s）显示错误占位，支持自动重试与手动重试
- 在 `Detail.vue` 中默认使用 `srcdoc`，通过 URL query `?embed=src` 可切换到 `src` 模式，用于 AB 测试

### 方案 C：流式代理（可选）

- 当清洗后 HTML 较大时，服务端通过 Web Streams API（`ReadableStream`）返回 `text/html`，避免大字符串在 Worker 内存中复制。
- 仅对 `src` 模式启用流式响应。

### 方案 D：API 摘要 fallback

- 新增后端摘要接口：
  - `GET /api/v1/douban/:id/summary`：返回 `{ title, rate, star, url, intro, keyInfo }`
  - `GET /api/v1/moegirl/:name/summary`：返回 `{ title, extract, url }`
- 新增前端 `ExternalEmbedFallback.vue`：
  - 当 `IframeEmbed` 连续失败 2 次或命中已知不兼容浏览器/环境时展示摘要
  - 提供「查看原站」外部链接

### 方案 E：关键资源本地化（可选）

- 识别豆瓣/萌娘页面中的首图/海报，服务端抓取后转为 base64 data URL 或同域代理 URL，避免第三方图片因 CSP/反盗链失败。
- 由于 Cloudflare Pages 有请求超时限制，仅对关键首图做此处理，避免全量图片代理。

### 验证矩阵

- 建立跨浏览器/设备测试矩阵：Chrome/Safari/Firefox/Edge 桌面端 + Safari iOS/Chrome Android 移动端。
- 每次方案迭代后记录：是否空白、样式是否正常、高度是否自适应、链接是否可点、加载时间、错误率。

## Impact

### Affected specs

- `fix-six-core-issues`：本 spec 为其豆瓣/萌娘嵌入模块的延续与增强

### Affected code

- `server/src/routes/douban.js` — 清洗规则增强、摘要接口、流式响应（可选）
- `server/src/routes/moegirl.js` — 清洗规则增强、摘要接口、流式响应（可选）
- `server/src/services/douban.js` — 新增摘要抽取逻辑
- `server/src/services/moegirl.js` — 新增摘要抽取逻辑
- `client/src/components/IframeEmbed.vue` — 支持双模式、高度自适应、超时重试
- `client/src/components/ExternalEmbedFallback.vue` — 新建摘要降级组件
- `client/src/views/Detail.vue` — 集成 fallback 与模式切换
- `client/src/api/endpoints.js` — 新增摘要接口调用

## ADDED Requirements

### Requirement: 服务端清洗增强

系统 SHALL 在返回 iframe 内容前，对豆瓣/萌娘百科页面进行更彻底的清洗与适配，包括移除 noscript 与外部样式表、绝对化相对链接、注入 viewport 与响应式 CSS。

#### Scenario: 豆瓣页面清洗

- **WHEN** 服务端抓取 `https://movie.douban.com/subject/:id/`
- **THEN** 返回的 HTML 不含 `<script>`、`<style>`、`<noscript>`、`<link rel="stylesheet">`、导航栏、侧边栏、广告位
- **AND** 相对链接已转换为绝对链接
- **AND** 包含 `<meta name="viewport" content="width=device-width,initial-scale=1">`

#### Scenario: 萌娘百科页面清洗

- **WHEN** 服务端抓取 `https://zh.moegirl.org.cn/:name`
- **THEN** 返回的 HTML 仅保留 `.mw-parser-output` 内容
- **AND** 图片懒加载属性已转换为可正常显示
- **AND** 相对链接已转换为绝对链接
- **AND** 包含 viewport meta

### Requirement: iframe 双模式支持

系统 SHALL 在 `IframeEmbed.vue` 中支持 `srcdoc` 与 `src` 两种嵌入模式，以兼容不同浏览器的行为差异。

#### Scenario: srcdoc 模式

- **WHEN** `mode="srcdoc"`
- **THEN** 组件通过 fetch 获取 HTML 片段，设置 iframe `srcdoc` 属性
- **AND** 使用 `sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"`

#### Scenario: src 模式

- **WHEN** `mode="src"`
- **THEN** 组件直接设置 iframe `src` 为代理 URL
- **AND** 由服务端返回完整 HTML 文档（含 DOCTYPE、viewport、基础样式）

### Requirement: iframe 高度自适应

系统 SHALL 在不同模式下均能正确计算并设置 iframe 高度，避免内容截断或大量空白。

#### Scenario: srcdoc 高度同步

- **WHEN** iframe 加载完成或内容变化
- **THEN** 优先通过 `contentDocument.body.scrollHeight` 读取高度
- **AND** 图片加载完成后重新计算高度

#### Scenario: src 高度同步

- **WHEN** iframe 内页面加载完成
- **THEN** iframe 内部通过 `postMessage` 向父页面发送高度
- **AND** 父页面监听 `message` 事件并设置 iframe 高度

### Requirement: 加载超时与重试

系统 SHALL 在 iframe 加载超时或失败时提供友好的错误提示与重试入口。

#### Scenario: 加载超时

- **WHEN** 8 秒内未收到 iframe load 事件或内容为空
- **THEN** 显示错误占位「加载超时，请重试」
- **AND** 提供「重试」按钮

#### Scenario: 连续失败降级

- **WHEN** 连续两次加载失败
- **THEN** 自动切换到 API 摘要 fallback 展示

### Requirement: API 摘要 fallback

系统 SHALL 在 iframe 嵌入不可用时，提供结构化的豆瓣/萌娘百科摘要信息。

#### Scenario: 豆瓣摘要

- **WHEN** 请求 `GET /api/v1/douban/:id/summary`
- **THEN** 返回 `{ title, rate, star, url, intro, keyInfo }`

#### Scenario: 萌娘摘要

- **WHEN** 请求 `GET /api/v1/moegirl/:name/summary`
- **THEN** 返回 `{ title, extract, url }`

## MODIFIED Requirements

### Requirement: 豆瓣/萌娘页面代理路由

原 `/api/v1/douban/page/:id` 与 `/api/v1/moegirl/page/:name` 仅返回清洗后的 HTML 片段；现增加返回完整 HTML 文档的能力（`src` 模式），并增强清洗规则。

### Requirement: IframeEmbed 组件

原组件仅支持 `srcdoc` 模式与定时器高度同步；现支持双模式、`ResizeObserver`、postMessage 高度同步、超时重试与 fallback 切换。

## REMOVED Requirements

无
