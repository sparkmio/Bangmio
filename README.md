# Bangmio

Bangumi (bgm.tv) 第三方客户端。支持 OAuth 登录、动画浏览与搜索、新番时间表、收藏管理、吐槽箱与讨论版查看。

🔗 **在线体验**：https://bangmio.pages.dev

## 关于

半个作者的碎碎念
> *还有半个是AI*

这是一个高中生好玩做的 VibeCoding 项目，主要是用 DeepSeek V4 Pro 和 MiMo-V2.5-Pro 做的，用了快 7000 万 tokens，要不是 D 便宜根本负担不起......

本项目使用了 [Bangumi](https://bgm.tv) 的 API，前端用了 Vue 3 + Vite + Pinia + TailwindCSS，还通过网页抓取解决了吐槽版和讨论版之类的小问题。国内没啥合适的平台所以部署在 Cloudflare Pages，不限带宽，全球 CDN 加速。

这是一个几乎不懂 CSS 的人用 AI 做的网站，各位可以提出批评，但也别骂的太狠。也感谢 Bangumi 现在还活着，给我提供了一个这么全的数据库，只让我做了点前端工作。

## 功能

- **OAuth / Token 双登录** — 扫码授权或手动粘贴 Access Token
- **动画浏览** — 按热度、标签、类型筛选番剧，支持搜索和分页
- **新番时间表** — 周一至周日每日播出一览
- **收藏管理** — 想看/在看/看过/搁置/弃番，支持评分和短评
- **番剧详情** — 评分分布、收藏统计、制作人员、角色、相关条目
- **吐槽箱** — 角色页嵌入式展示，番剧/人物页独立子页面
- **讨论版** — 番剧讨论帖列表 + 帖子详情（含回复和子回复）
- **人物/角色详情** — 完整信息展示、参与作品、声优/关联人物、吐槽箱
- **暗色/浅色模式**

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Pinia + TailwindCSS + DaisyUI + GSAP |
| 后端 | Hono（Cloudflare Pages Functions） |
| API | 代理 Bangumi API v0 + 网页抓取 |
| 图片 CDN | bgmimg.anibt.net 反代 + Cloudflare 边缘缓存 |
| OAuth | bgm.tv 反代（绕过 GFW） |
| 部署 | Cloudflare Pages（前后端一体） |

## 本地开发

```bash
# 安装依赖
npm run install:all

# 启动（同时运行前端和后端）
npm run dev
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

## 部署

### Cloudflare Pages（一键部署）

1. Fork 本仓库
2. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Pages
3. 连接 GitHub 仓库
4. 构建配置使用 `wrangler.toml`（已配置好）
5. 部署后在 Settings → Environment Variables 添加 `OAUTH_REDIRECT_URI` = `https://你的域名.pages.dev/login/callback`

## 相关链接

- 🌐 网站：https://bangmio.pages.dev
- 📦 GitHub：https://github.com/sparkmio/Bangmio
- 👤 作者 Bangumi 主页：https://bgm.tv/user/acgpzh

## 项目结构

```
Bangmio/
├── client/                 # Vue 3 前端
│   ├── src/
│   │   ├── api/            # API 调用
│   │   ├── components/     # 通用组件
│   │   ├── composables/    # 组合式函数
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── views/          # 页面组件
│   │   ├── router/         # 路由配置
│   │   └── assets/         # 样式资源
│   └── public/             # 静态资源
├── server/                 # Hono 后端（本地开发用）
│   └── src/
│       ├── app.js          # Hono 应用入口
│       ├── routes/         # API 路由
│       ├── controllers/    # 控制器
│       └── services/       # Bangumi API 服务
├── functions/              # Cloudflare Pages Functions
│   ├── api/[[path]].js     # API 代理（Hono app）
│   ├── oauth/[[path]].js   # OAuth 代理（bgm.tv 登录页）
│   └── img/[[path]].js     # 图片代理（bgmimg.anibt.net）
└── wrangler.toml           # Cloudflare Pages 配置
```
