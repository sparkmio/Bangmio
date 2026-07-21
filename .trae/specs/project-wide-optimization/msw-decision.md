# API Mock (msw) 评估决策

## 评估日期

2026-07-21

## 评估结论

**不引入 msw**（Mock Service Worker）

## 评估理由

1. 项目已有完整后端（Hono + Cloudflare Pages），可通过 `npm run dev:all` 同时启动前后端开发
2. 后端作为代理层聚合了 Bangumi/豆瓣/B站等外部 API，前端直接依赖后端 API，mock 成本高
3. 外部 API 数据结构复杂（番剧详情含角色/章节/制作人员等），mock 数据维护成本高
4. 后端已有内存缓存机制，外部 API 不稳定时缓存可兜底
5. 引入 msw 需要为每个 API 端点录制 mock fixtures，初始投入大，收益有限

## 替代方案

- 使用 `npm run dev:all` 启动完整本地开发环境
- 后端开发环境（.dev.vars）已配置默认 OAuth 凭据
- 需要离线开发时，可后续考虑为关键 API（calendar、search）添加 mock

## 未来考虑

若后续前端独立开发需求增加，可重新评估引入 msw
