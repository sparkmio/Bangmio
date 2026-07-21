# Bangmio 项目技术文档

> 最后更新：2026-07-14
> 版本：v4（纯 Web 端，已移除 Electron/Android 本地端）

---

## 1. 项目概述

Bangmio 是 Bangumi (bgm.tv) 第三方客户端，聚合了多个平台数据源，提供一站式追番/追剧体验。

**线上地址**：https://bangmio.pages.dev
**GitHub**：https://github.com/sparkmio/Bangmio
**部署平台**：Cloudflare Pages（全球 CDN，不限带宽）

### 1.1 核心定位

- 面向二次元/泛二次元用户的一站式追番社区
- 解决"追番需要多平台到处跑"的痛点
- 集成 Bangumi + 萌娘百科 + 豆瓣 + B站 + 第三方视频/音乐平台

### 1.2 特色功能（非 Bangumi 原版）

| 功能           | 数据源             | 说明                                 |
| -------------- | ------------------ | ------------------------------------ |
| 豆瓣评分       | 豆瓣搜索 API       | 一站式查看多平台评分                 |
| B站评分 & 观看 | B站搜索 API        | 整合 B站番剧搜索与评分，直达在线观看 |
| 萌娘百科       | 萌娘百科搜索 API   | 链接查看更全的中文番剧简介           |
| 在线观看       | B站 + girigirilove | 一键跳转第三方番剧在线播放平台       |
| 相关音乐       | Bangumi 关联条目   | 一键跳转该番剧有关的音乐             |
| 小组           | Bangumi 网页抓取   | 多源重试 + 兜底小组列表              |

---

## 2. 技术架构

```
┌─────────────────────────────────────────────┐
│              Cloudflare Pages               │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │  静态资源 (SPA)   │  │ Pages Functions │ │
│  │  client/dist/    │  │ functions/api/  │ │
│  │  Vue 3 + Vite    │  │ Hono 服务端     │ │
│  └──────────────────┘  └────────┬────────┘ │
│                                 │            │
│         ┌───────────────────────┤            │
│         │                       │            │
│    ┌────▼─────┐          ┌─────▼─────┐      │
│    │ Bangumi  │          │  外部 API  │      │
│    │ API v0   │          │ 豆瓣/B站/  │      │
│    │ + 网页抓取│          │ 萌娘百科   │      │
│    └──────────┘          └───────────┘      │
└─────────────────────────────────────────────┘
```

### 2.1 技术栈

| 层        | 技术                  | 版本/说明                                  |
| --------- | --------------------- | ------------------------------------------ |
| 前端框架  | Vue 3                 | Composition API + `<script setup>`         |
| 构建工具  | Vite                  | 前端构建                                   |
| 状态管理  | Pinia                 | auth store                                 |
| CSS 框架  | TailwindCSS + DaisyUI | 粉色主题（primary: #E8909C）               |
| 动画      | GSAP                  | 页面转场动画                               |
| 后端框架  | Hono                  | 轻量级，兼容 CF Workers                    |
| API 代理  | Bangumi API v0        | 官方 API + bangumi.lol 镜像                |
| 网页抓取  | 原生 fetch + 正则解析 | 吐槽箱/讨论版/小组                         |
| HTML 解析 | node-html-parser      | 替代 cheerio（CF 兼容）                    |
| 部署      | Cloudflare Pages      | `wrangler pages deploy`                    |
| 打包      | esbuild               | 服务端 bundle → `functions/api/_server.js` |

### 2.2 为什么选这些技术

- **Hono**：兼容 Cloudflare Workers 运行时，无 Node.js 依赖
- **node-html-parser**：cheerio 依赖 node:stream，CF Workers 不支持
- **bangumi.lol 镜像**：国内直连 bgm.tv 很慢，镜像站加速
- **esbuild bundle**：CF Pages Functions 要求单文件入口，esbuild 将所有服务端代码打包成 `_server.js`

---

## 3. 项目结构

```
d:\Bangmio v4\
├── client/                        # 前端 Vue 项目
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   ├── index.js           # Axios 实例 + 拦截器
│   │   │   └── endpoints.js       # 所有 API 端点定义
│   │   ├── assets/
│   │   │   └── main.css           # 全局样式 + 动画
│   │   ├── components/
│   │   │   ├── AnimeCard.vue      # 番剧卡片（CSS 入场动画）
│   │   │   ├── CollectionButton.vue # 收藏状态按钮
│   │   │   ├── CommentSection.vue # 吐槽箱组件
│   │   │   ├── Footer.vue
│   │   │   ├── LoadingState.vue   # 加载/骨架屏组件
│   │   │   ├── Navbar.vue
│   │   │   ├── Sidebar.vue
│   │   │   ├── StarRating.vue     # 星级评分
│   │   │   └── Toast.vue
│   │   ├── router/
│   │   │   └── index.js           # Vue Router 路由定义
│   │   ├── stores/
│   │   │   └── auth.js            # Pinia auth store
│   │   ├── views/                 # 页面组件（见 3.1 节）
│   │   ├── App.vue                # 根组件（GSAP 转场）
│   │   └── main.js
│   ├── index.html
│   ├── tailwind.config.js         # 主题 + 设计令牌
│   └── package.json
│
├── server/                        # 后端 Hono 服务
│   └── src/
│       ├── app.js                 # 应用入口，注册所有路由
│       ├── routes/
│       │   ├── anime.js           # 番剧搜索/详情/章节/角色
│       │   ├── bilibili.js        # B站番剧搜索 + 评分
│       │   ├── collection.js      # 收藏管理
│       │   ├── comments.js        # 吐槽箱 + 讨论版
│       │   ├── douban.js          # 豆瓣评分 + 短评
│       │   ├── groups.js          # 小组列表 + 详情 + 搜索
│       │   ├── moegirl.js         # 萌娘百科搜索
│       │   └── user.js            # OAuth + 用户信息
│       └── services/
│           ├── bangumi.js         # Bangumi API 封装
│           └── douban.js          # 豆瓣 API 封装
│
├── functions/                     # Cloudflare Pages Functions
│   └── api/
│       ├── _server.js             # esbuild 打包产物（勿手动编辑）
│       └── [[path]].js            # CF Pages catch-all 路由入口
│
├── .trae/                         # TRAE IDE spec 文件
│   └── specs/
│       ├── ui-detail-refinement/  # UI 细节优化 spec（已完成）
│       └── fix-groups/            # 小组功能修复 spec（已完成）
│
├── bangmio-showcase.html          # TRAE 大赛创意产物 HTML
├── wrangler.toml                  # CF Pages 配置
├── package.json                   # 根 package.json
└── README.md                      # GitHub README
```

### 3.1 前端页面路由

| 路径                 | 组件              | 功能                                            | 需登录 |
| -------------------- | ----------------- | ----------------------------------------------- | ------ |
| `/`                  | Home.vue          | 首页：在追列表 + 新番时间表 + 类型筛选          | 部分   |
| `/trending`          | Trending.vue      | 新番时间表（按周分组）                          | 否     |
| `/anime`             | Browse.vue        | 搜索/浏览番剧                                   | 否     |
| `/anime/:id`         | Detail.vue        | 番剧详情（概览/章节/角色/制作/评分/在线观看等） | 否     |
| `/character/:id`     | Character.vue     | 角色详情                                        | 否     |
| `/person/:id`        | Person.vue        | 人物详情                                        | 否     |
| `/anime/:id/talkbox` | Talkbox.vue       | 吐槽箱                                          | 否     |
| `/anime/:id/topics`  | TopicBoard.vue    | 讨论版                                          | 否     |
| `/topic/:id`         | TopicDetail.vue   | 话题详情                                        | 否     |
| `/login`             | Login.vue         | 登录（Token / OAuth）                           | 否     |
| `/login/callback`    | LoginCallback.vue | OAuth 回调                                      | 否     |
| `/profile`           | Profile.vue       | 个人资料                                        | 是     |
| `/profile/:username` | Profile.vue       | 他人资料                                        | 否     |
| `/watching`          | Watching.vue      | 在追番剧                                        | 是     |
| `/groups`            | Groups.vue        | 小组列表 + 搜索                                 | 否     |
| `/group/:id`         | GroupDetail.vue   | 小组详情 + 话题                                 | 否     |
| `/settings`          | Settings.vue      | 设置                                            | 否     |
| `/about`             | About.vue         | 关于                                            | 否     |

### 3.2 后端 API 路由

| 路由前缀             | 模块          | 主要端点                                                                                                           |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/api/v1/user`       | user.js       | auth, me, oauth-url, oauth-callback, :username                                                                     |
| `/api/v1/anime`      | anime.js      | search, browse, calendar, :id, :id/episodes, :id/characters, :id/persons, :id/relations, character/:id, person/:id |
| `/api/v1/collection` | collection.js | list, :animeId (GET/POST/DELETE), stats                                                                            |
| `/api/v1/comments`   | comments.js   | character/:id, subject/:id, subject/:id/topics, topic/:id, subject/:id/talkbox, 各种 POST                          |
| `/api/v1/douban`     | douban.js     | :id, by-name, :id/details, :id/comments, :id/reviews                                                               |
| `/api/v1/bilibili`   | bilibili.js   | :id, by-name                                                                                                       |
| `/api/v1/moegirl`    | moegirl.js    | search                                                                                                             |
| `/api/v1/groups`     | groups.js     | / (列表), /search (搜索), /:id (详情)                                                                              |
| `/api/health`        | app.js        | 健康检查                                                                                                           |

---

## 4. 设计系统

### 4.1 主题色

**亮色模式**：

- Primary: `#E8909C`（粉色）
- Secondary: `#D4768A`
- 背景: `#ffffff` / `#f3f4f6` / `#e5e7eb`
- 文字: `#2d1f23`

**暗色模式**：

- Primary: `#FFB7C5`
- 背景: `#0d0d14` / `#141420` / `#1e1e2e`
- 文字: `#e8e0f0`

### 4.2 设计令牌（tailwind.config.js）

```
borderRadius: { card: 0.75rem, pill: 9999px }
boxShadow: { card: 0 2px 8px -2px rgba(0,0,0,0.08), hover: 0 8px 24px -6px rgba(0,0,0,0.12) }
animation: { card-in: cardIn 0.35s ease-out both }
```

### 4.3 圆角规范

| 元素类型    | 圆角 | Tailwind class |
| ----------- | ---- | -------------- |
| 卡片/列表项 | 12px | `rounded-xl`   |
| 弹窗        | 16px | `rounded-2xl`  |
| 按钮/Tab    | 全圆 | `rounded-full` |
| 小元素      | 8px  | `rounded-lg`   |

### 4.4 字体

- 标题: Overpass / Noto Sans SC
- 正文: DM Sans / Noto Sans SC
- 代码/数字: JetBrains Mono

---

## 5. 数据流与 API 交互

### 5.1 前端 API 调用链

```
Vue 组件 → endpoints.js (API 方法) → api/index.js (Axios) → /api/v1/* → CF Pages Function → Hono 路由 → Service → 外部 API
```

### 5.2 Bangumi API 代理策略

- **海外节点**：直连 `api.bgm.tv`（Bangumi 官方 API）
- **国内节点**：走 `api.bangumi.lol` 镜像（桜色大佬维护）
- **判断依据**：`CF-IPCountry` 请求头
- **图片 URL 重写**：`lain.bgm.tv` → `lain.bangumi.lol`

### 5.3 认证流程

1. **Token 登录**：用户在 bgm.tv 获取 Access Token → 粘贴到登录页 → 服务端验证
2. **OAuth 登录**：点击 OAuth → 跳转 bgm.tv → 回调带 code → 服务端换 token
3. **Token 存储**：`localStorage`（`bangmio_token` / `bangmio_refresh_token` / `bangmio_user`）
4. **Token 传递**：Axios 请求拦截器自动加 `Authorization: Bearer {token}` 头

### 5.4 各数据源抓取方式

| 数据源                 | 方式        | 说明                                           |
| ---------------------- | ----------- | ---------------------------------------------- |
| Bangumi 番剧/角色/人物 | API v0      | 官方 REST API                                  |
| Bangumi 吐槽箱         | 网页抓取    | 解析 HTML                                      |
| Bangumi 讨论版         | 网页抓取    | 解析 HTML                                      |
| Bangumi 小组           | 网页抓取    | `/group/all` 列表 + `/group/:id` 详情          |
| 豆瓣评分               | API 搜索    | 搜索 + 抓取详情 + 短评                         |
| B站番剧                | B站搜索 API | `api.bilibili.com/x/web-interface/search/type` |
| 萌娘百科               | 搜索 API    | `mzh.moegirl.com.cn/api.php`                   |

### 5.5 缓存策略

所有需要网页抓取/外部 API 的路由都使用内存缓存：

```javascript
const CACHE_TTL = 10 * 60 * 1000 // 默认 10 分钟
// groups.js: 5 分钟
// douban.js: 10 分钟
// bilibili.js: 10 分钟
```

缓存实现：`Map<string, { data, time }>` + `getCached(key)` / `setCache(key, data)`

---

## 6. 构建与部署

### 6.1 本地开发

```bash
# 安装依赖
npm install

# 启动前端开发服务器
cd client && npm run dev

# 启动后端（需单独运行）
cd server && node --watch src/app.js
```

### 6.2 构建生产版本

```bash
npm run build
# 等价于：
# 1. npx esbuild server/src/app.js --bundle --platform=node --format=esm --outfile=functions/api/_server.js
# 2. cd client && npm install && npm run build
```

构建产物：

- `functions/api/_server.js` — 服务端 bundle（~580KB）
- `client/dist/` — 前端静态资源

### 6.3 部署到 Cloudflare Pages

```bash
npx wrangler pages deploy client/dist --project-name bangmio
```

### 6.4 Cloudflare Pages 配置

**wrangler.toml**：

```toml
name = "bangmio"
pages_build_output_dir = "client/dist"
```

**CF Pages Functions 路由**：

- `functions/api/[[path]].js` — catch-all 入口（注意：`[[path]]` 是 CF Pages 语法，不是 `[[...path]]`）
- 将所有 `/api/*` 请求转发给 Hono 应用

**\_routes.json**（如有）：控制哪些路径走 Pages Functions

### 6.5 环境变量

| 变量                  | 用途              | 在哪用                 |
| --------------------- | ----------------- | ---------------------- |
| `CF_IP_COUNTRY`       | 判断国内/海外节点 | CF 自动注入            |
| Bangumi APP_ID/SECRET | OAuth 回调        | 需在 CF Dashboard 配置 |

---

## 7. 已知问题与约束

### 7.1 Cloudflare Pages 限制

- **不支持 Node.js 内置模块**：`node:stream`、`node:http` 等不可用
- **不支持 `process` 全局变量**：如需使用要手动 polyfill（`globalThis.process = ...`）
- **catch-all 路由语法**：用 `[[path]]`（双括号），不支持 `[[...path]]`（三点语法）
- **cheerio 不可用**：依赖 `node:stream`，改用 `node-html-parser`
- **单文件限制**：所有服务端代码必须 bundle 成一个 `_server.js`

### 7.2 外部 API 不稳定性

| 问题                 | 影响               | 现有应对                             |
| -------------------- | ------------------ | ------------------------------------ |
| bgm.tv 被 WAF 拦截   | 国内抓取失败       | bangumi.lol / bangumi.one 镜像兜底   |
| B站搜索 API 返回 412 | B站评分不可用      | browser-like headers + buvid3 cookie |
| 豆瓣 API 限流        | 豆瓣评分偶尔不可用 | 内存缓存减少请求                     |
| 小组页面结构变化     | 解析失败           | 多源重试 + 兜底数据                  |

### 7.3 功能限制

- **小组功能**：依赖网页抓取，Bangumi 可能改版导致解析失败
- **讨论版发帖**：通过 Bangumi API 实现，需登录
- **B站评分**：边缘节点大概率被 WAF 拦截，评分显示"暂无"
- **OAuth**：需在 Bangumi 后台配置回调 URL

---

## 8. 开发约定

### 8.1 文件命名

- 前端页面：PascalCase（`Home.vue`、`GroupDetail.vue`）
- 后端路由：camelCase（`groups.js`、`bilibili.js`）
- 服务层：camelCase（`bangumi.js`、`douban.js`）

### 8.2 组件风格

- 使用 `<script setup>` 语法
- Props 使用 `defineProps`，Emits 使用 `defineEmits`
- 样式使用 TailwindCSS class，不用 scoped CSS（除非动画需要）

### 8.3 API 设计

- 统一返回格式：`{ data: T }` 或 `{ data: null }`
- 错误不抛异常，返回 `null` 数据
- 缓存使用内存 Map，TTL 5-10 分钟

### 8.4 Git 提交规范

```
type(scope): description

feat: 新功能
fix: 修复
refactor: 重构
chore: 构建/依赖
revert: 回滚
```

---

## 9. Spec 文件索引

位于 `.trae/specs/` 目录，用于 TRAE IDE 的 spec-driven coding 工作流。

| Spec                    | 状态   | 说明                                    |
| ----------------------- | ------ | --------------------------------------- |
| `ui-detail-refinement/` | 已完成 | UI 细节优化：圆角/动效/骨架屏/Tab 统一  |
| `fix-groups/`           | 已完成 | 小组功能修复：多源重试/缓存/搜索/空状态 |

---

## 10. 依赖清单

### 10.1 根目录（服务端）

```json
{
  "dependencies": {
    "cheerio": "^1.2.0", // ⚠️ CF 不兼容，已弃用但未从 package.json 移除
    "hono": "^4.12.27",
    "linkedom": "^0.18.12" // HTML DOM 解析（备用）
  },
  "devDependencies": {
    "esbuild": "^0.28.1"
  }
}
```

### 10.2 客户端

关键依赖：

- `vue@3` + `vue-router@4` + `pinia`
- `axios` — HTTP 客户端
- `tailwindcss` + `daisyui` — UI 框架
- `gsap` — 动画
- `vite` — 构建工具

---

## 11. 常用操作速查

```bash
# 构建并部署
npm run build
npx wrangler pages deploy client/dist --project-name bangmio

# 仅构建服务端 bundle
npm run server:build

# 查看线上 API 返回
curl https://bangmio.pages.dev/api/health
curl https://bangmio.pages.dev/api/v1/anime/calendar

# 本地调试 API（需 wrangler dev）
npx wrangler pages dev client/dist
```
