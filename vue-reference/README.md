# Bangmio Vue UI Reference

这是从 Bangmio Git 历史中恢复的最近完整 Vue 前端版本，仅作为 UI、交互和页面结构参考，不替换当前 Next.js 主项目。

## 来源

- 快照提交：`5008843a7167bbf922f7a0b62378573c22532060`
- 历史目录：`client/`
- 恢复时间：2026-10-25

该快照包含首页、番剧搜索与详情、在看、个人页、小组、话题、登录/注册、设置、关于等页面，以及对应的公共组件、Pinia 状态和样式。`client/.env.production` 未复制到本目录，避免带入历史环境配置。

## 本地运行

```bash
cd vue-reference
npm ci
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
npm run dev
```

默认开发地址为 `http://localhost:5173`。开发服务器会把 `/api` 请求代理到 `http://localhost:3000`。

## 生产构建

```bash
npm ci
npm run build
npm run preview
```

生产输出目录为 `dist/`，可以部署到 Cloudflare Pages、Netlify、Vercel 静态站点或任意静态文件托管服务。需要配置 SPA fallback，将未知前端路由回退到 `/index.html`；本目录的 `public/_redirects` 已包含该规则。

## API 配置

默认 API 地址为同源 `/api/v1`。如果前端和后端分开部署，在 `.env` 中设置：

```dotenv
VITE_API_BASE=https://api.example.com/api/v1
```

跨域部署时，后端需要允许前端来源，并正确处理凭据、`Authorization` 和 `X-Bangumi-Username` 请求头。此目录只提供前端 UI，不包含后端实现；可以连接当前 Bangmio API，也可以替换 `src/api/endpoints.js` 为自己的数据服务。

## 说明

- 该目录保留了历史 Vue 版本的 UI 和交互实现，方便逐页对照，不代表当前主项目的产品入口或认证策略。
- 历史代码中仍包含 Bangmio 登录、注册和邮箱验证码页面；如果只想展示 Bangumi 登录入口，需要在 `src/views/Login.vue` 中按当前产品策略隐藏对应表单。
- 不要把真实 `.env`、Access Token、OAuth Secret 或其他密钥提交到仓库。
