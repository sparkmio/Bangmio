# Checklist

## 维度一：基线诊断

- [ ] 线上 `/api/v1/douban/page/:id` 返回正常 HTML（长度 > 1000，含核心选择器）
- [ ] 线上 `/api/v1/moegirl/page/:name` 返回正常 HTML（长度 > 1000，含 `.mw-parser-output`）
- [ ] Chrome 桌面端豆瓣/萌娘 Tab 正常渲染
- [ ] Safari 桌面端豆瓣/萌娘 Tab 正常渲染
- [ ] Firefox 桌面端豆瓣/萌娘 Tab 正常渲染
- [ ] Chrome Android 豆瓣/萌娘 Tab 正常渲染
- [ ] Safari iOS 豆瓣/萌娘 Tab 正常渲染
- [ ] 问题清单已记录到 `diary.md`

## 维度二：服务端清洗增强

- [ ] `cleanDoubanPage` 移除 `<noscript>` 与 `<link rel="stylesheet">`
- [ ] 豆瓣页面相对链接已绝对化
- [ ] 豆瓣页面返回 HTML 含 viewport meta
- [ ] `cleanMoegirlPage` 处理图片懒加载（`data-src` → `src`）
- [ ] 萌娘页面相对链接已绝对化
- [ ] 萌娘页面返回 HTML 含 viewport meta
- [ ] 豆瓣/萌娘清洗单元测试通过

## 维度三：iframe 组件稳定性

- [ ] `IframeEmbed.vue` 支持 `mode="srcdoc"` 与 `mode="src"`
- [ ] `srcdoc` 模式保持现有功能并增强 CSP/sandbox 说明
- [ ] `src` 模式直接加载代理 URL
- [ ] `srcdoc` 模式高度自适应正常工作（ResizeObserver 或定时器）
- [ ] `src` 模式通过 `postMessage` 同步高度
- [ ] 加载超时 8 秒后显示错误占位
- [ ] 手动重试按钮正常工作
- [ ] 连续失败 2 次后触发 fallback 事件

## 维度四：流式代理与资源本地化（可选）

- [ ] 服务端 `/page/*` 路由支持流式响应
- [ ] 流式响应在 Cloudflare Pages 正常工作
- [ ] 关键图片资源本地化不超时

## 维度五：API 摘要 fallback

- [ ] `GET /api/v1/douban/:id/summary` 返回结构化摘要
- [ ] `GET /api/v1/moegirl/:name/summary` 返回结构化摘要
- [ ] `ExternalEmbedFallback.vue` 组件正常展示摘要与外链
- [ ] `Detail.vue` 在 iframe fallback 时正确切换为摘要组件

## 维度六：最终验证

- [ ] `npx vitest run` 全部通过
- [ ] `npx eslint` 0 错误 0 警告
- [ ] `npx vite build` 成功
- [ ] 跨浏览器测试矩阵记录完整
- [ ] `diary.md` 已记录每次尝试的方案、错误与结论
- [ ] git commit 描述完整
- [ ] git push origin master 成功，CF Pages 自动部署
