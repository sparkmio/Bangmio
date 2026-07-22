# 豆瓣/萌娘百科嵌入优化 Diary

## 尝试 #0：现有 iframe srcdoc + 服务端代理（基线探测）

### 时间

2026-07-22

### 测试接口

- `https://bangmio.site/api/v1/douban/page/26990214`
- `https://bangmio.site/api/v1/moegirl/page/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA`

### 实现过程

直接调用线上现有代理接口，检查 HTTP 状态、Content-Type、返回长度与内容。

### 结果

- **豆瓣**：
  - HTTP 200, Content-Type: `text/html; charset=utf-8`, Size: 783B
  - 返回内容为降级 HTML（"豆瓣页面暂无法嵌入"）
  - 说明 Cloudflare Worker 出口 IP 已被豆瓣识别为第三方服务器并拦截
- **萌娘百科**：
  - HTTP 200，返回 HTML 长度正常，含 `.mw-parser-output`
  - 中文全部乱码：UTF-8 字节流被当作 Latin1/GBK 解码（如"進擊的巨人"显示为"杩涘嚮鐨勫法浜?"）
  - 残留 `<noscript id="MOE_SKIN_NOSCRIPT">` 与 `<template>` 标签
  - 图片链接为相对路径或第三方 `storage.moegirl.org.cn`

### 错误信息

- 豆瓣：`璞嗙摚椤甸潰鏆傛棤娉曞祵鍏?`（降级提示本身也因乱码显示异常）
- 萌娘百科：所有中文字符显示为 `杩涘嚮鐨勫法浜?` 等乱码

### 结论

1. 萌娘百科可通过修复字符编码解码与增强清洗规则恢复可用。
2. 豆瓣反爬拦截是主要瓶颈，需尝试更真实的请求头；若仍失败，则依赖 API 摘要 fallback + 外部链接。
3. 下一步优先修复 `fetchHTML` 的 UTF-8 解码，同时增强清洗与实现摘要 fallback。

## 尝试 #1：显式 UTF-8/GBK 解码 + 增强请求头 + 清洗增强 + 摘要接口

### 时间

2026-07-22

### 修改内容

1. `server/src/utils/http.js`：
   - `fetchHTML` 改为 `res.arrayBuffer()` + `TextDecoder('utf-8')` 显式解码；若出现 `U+FFFD` 替换字符或解码失败，回退到 `gb18030` / `gbk`。
   - 默认 `User-Agent` 升级到 Chrome 126；`Accept` / `Accept-Language` 头增强。
2. `server/src/routes/douban.js`：
   - `cleanDoubanPage` 移除 `<noscript>`、`<link rel="stylesheet">`；相对链接绝对化；注入 viewport 与响应式 CSS。
   - `/page/:id` 调用 `fetchHTML` 时携带更真实的 headers（`Referer`、`Cookie: bid=<random>; ll="108288"`）。
   - 新增 `GET /:id/summary`，由 `services/douban.js#getDoubanSummary` 提供结构化摘要。
3. `server/src/routes/moegirl.js`：
   - `cleanMoegirlPage` 移除 `<noscript>` / `<template>`；处理图片懒加载（`data-src` → `src` 并清除 `data-src`）；相对链接绝对化；注入 viewport 与表格/图片响应式 CSS。
   - `fetchPageExtract` 改用 `fetchHTML` 以统一解码。
   - 新增 `GET /:name/summary`，由 `services/moegirl.js#getMoegirlSummary` 提供结构化摘要。
4. 新增 `server/src/services/moegirl.js`；扩展 `server/src/services/douban.js` 新增 `getDoubanSummary`。
5. 更新 `douban.test.js`、`moegirl.test.js`、`http.test.js` 覆盖清洗规则、摘要路由与 GBK 解码。

### 本地验证结果

- **测试**：`npx vitest run server/src/routes/douban.test.js server/src/routes/moegirl.test.js server/src/utils/http.test.js` → **51 个测试全部通过**。
- **Lint**：`npx eslint "server/src/**/*.js"` → **0 错误 0 警告**。
- **豆瓣直接抓取**（本地 Node fetch，Chrome 126 UA + Referer + bid Cookie）：
  - `https://movie.douban.com/subject/26990214/` 返回 **HTTP 403**，长度约 994B，为登录/拦截页。
  - 说明即使增强请求头，豆瓣仍识别非浏览器/第三方服务器并拦截；保持现有降级 HTML 逻辑不变。
- **萌娘百科直接抓取**（本地 Node fetch，UA + Referer + no-cache）：
  - 返回 HTTP 200，长度正常，含 `.mw-parser-output`。
  - 但中文仍全部乱码；分别按 `utf-8`、`gbk`、`gb18030` 解码均无法得到正确中文，且绕过 Cloudflare 缓存（带随机 query + `Cache-Control: no-cache`）后依旧乱码。
  - 初步判断乱码已超出简单的「UTF-8 被当作 Latin1/GBK 解码」，可能源于上游/Cloudflare 边缘返回的字节流本身已损坏或存在多层转码。

### 结论

1. 服务端清洗增强、摘要接口、显式解码逻辑已按 spec 实现并测试通过。
2. 豆瓣反爬：增强 headers 未见效，继续依赖降级 HTML + API 摘要 fallback。
3. 萌娘百科：清洗规则已增强，但生产环境中文乱码可能需要进一步排查上游响应字节或尝试 `action=render`、移动端域名等替代抓取源。

## 尝试 #2：萌娘百科新皮肤 template 解包 + 多候选源 + 摘要服务增强

### 时间

2026-07-22

### 修改内容

1. `server/src/routes/moegirl.js`：
   - 调整 `/page/:name` 候选 URL 顺序，优先使用 `?useskin=vector` 皮肤参数，再回退默认皮肤、海外源（`zh.moegirl.uk`）。
   - 在 `cleanMoegirlPage` 中新增 template 内容解包逻辑：萌娘百科新皮肤将正文放在 `<template id="MOE_SKIN_TEMPLATE_BODYCONTENT">` 中，linkedom 不会自动展开，需先将模板内容提取到 body 再执行清洗选择器。
2. `server/src/services/moegirl.js`：
   - 同步新增 template 解包逻辑，确保摘要抽取能命中 `.mw-parser-output`。
   - 摘要抓取同样使用四候选源（vector/默认 × 国内/海外），提升可用性。
3. `server/src/routes/moegirl.test.js`：
   - 更新测试断言，匹配新的 `?useskin=vector` 默认 URL 与四候选源 fallback 行为。

### 本地验证结果

- **测试**：`npm test` → **186 个测试通过，6 个跳过，0 失败**。
- **Lint**：`npm run lint` → **0 错误 0 警告**。
- **客户端构建**：`npm run build`（client）→ **构建成功**。
- **萌娘百科页面代理**（本地 Node fetch）：
  - `GET /api/v1/moegirl/page/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA` 返回 HTTP 200，长度约 532KB。
  - 中文正常（`contains title: true`、`utf8 check: true`），`.mw-parser-output` 内容完整保留。
- **萌娘百科摘要接口**（本地 Node fetch）：
  - `GET /api/v1/moegirl/%E8%BF%9B%E5%87%BB%E7%9A%84%E5%B7%A8%E4%BA%BA/summary` 返回正确 JSON，`title` 为「进击的巨人」，extract 已能提取到正文段落。
- **豆瓣页面代理**（本地 Node fetch）：
  - `GET /api/v1/douban/page/26990214` 仍返回 695B 降级 HTML（豆瓣反爬未突破，符合预期）。
- **跨浏览器测试页**（`client/public/embed-test.html`）：
  - 已在集成 Chromium 浏览器（Chrome 142 / Electron 39.2.7）中打开 `http://localhost:5174/embed-test.html`。
  - 由于浏览器自动化工具对包含 iframe 与长日志文本框的页面坐标计算存在限制，未能完成点击交互；但页面结构、控件与初始加载流程已可正常渲染。
  - 后续需在 Chrome / Safari / Firefox / Edge 桌面端及 iOS Safari / Android Chrome 中手动打开该页面，按测试矩阵记录：是否空白、样式是否正常、高度是否自适应、链接是否可点击、加载时间、错误率。

### 错误信息

- 浏览器自动化点击时提示 `Click target intercepted / coordinates outside viewport`，与页面滚动/坐标映射有关，非嵌入功能本身缺陷。

### 结论

1. 萌娘百科页面代理与摘要接口已恢复稳定：template 解包 + vector 皮肤参数 + 多候选源策略解决了新皮肤下内容为空/乱码的问题。
2. 豆瓣反爬仍无法突破，保持降级 HTML + 摘要 fallback 策略。
3. 跨浏览器测试页已就绪，建议在真实多浏览器环境中完成最终矩阵验证。
