# Bangmio 项目总结

> 本文档汇总 Bangmio 项目当前的全貌，包括技术架构、核心功能、账号体系、历史需求与迭代记录、配置说明及当前状态。随项目演进持续更新。

---

## 一、项目概述

Bangmio 是 [Bangumi (bgm.tv)](https://bgm.tv) 的第三方客户端，提供动画/游戏/书籍/音乐浏览、收藏管理、吐槽箱、讨论版、豆瓣评分、萌娘百科、相关音乐与在线观看等功能。

- **作者**：一个高中生用 AI 做的 VibeCoding 项目（DeepSeek V4 Pro / MiMo-V2.5-Pro，后改用 GLM-5.2 与 Kimi-2.7-Code）
- **网站**：https://bangmio.site
- **GitHub**：https://github.com/sparkmio/Bangmio
- **作者 Bangumi 主页**：https://bgm.tv/user/acgpzh
- **性质**：个人维护，非商业项目。因国内无法直接访问 bangumi.tv，部分接口通过镜像站 `bangumi.lol` 代理。

## 二、技术栈

| 层       | 技术                                                           |
| -------- | -------------------------------------------------------------- |
| 前端     | Vue 3 + Vite + Pinia + TailwindCSS + DaisyUI + GSAP            |
| 后端     | Hono（Cloudflare Pages Functions）                             |
| API      | 代理 Bangumi API v0 + 网页抓取第三方平台（豆瓣/萌娘百科/音乐） |
| 数据库   | Cloudflare D1（SQLite，用户账号表 `bangmio-users`）            |
| 邮件     | Resend（发件人 `Bangmio <signup@bangmio.site>`）               |
| 人机验证 | Cloudflare Turnstile                                           |
| 部署     | Cloudflare Pages（构建产物 `client/dist`）                     |
| 测试     | Vitest（220 passed / 0 skipped）                               |

### 脚本（根 package.json）

```json
"dev": "npm run dev --prefix client",
"dev:server": "node --watch server/src/app.js",
"dev:all": "concurrently -n server,client -c yellow,cyan \"npm:dev:server\" \"npm:dev\"",
"build": "npm run server:build && npm run bundle:size && cd client && npm install --no-audit --no-fund && npm run build",
"server:build": "npx esbuild server/src/app.js --bundle --platform=node --format=esm --outfile=functions/api/_server.js --metafile=functions/api/_meta.json",
"lint": "eslint . --ext .js,.vue",
"test": "vitest run"
```

---

## 三、核心功能

### 原版功能（Bangumi 提供）

- **OAuth 登录** — 一键登录或手动粘贴 Access Token
- **收藏管理** — 想看/在看/看过/搁置/弃番，支持评分和短评
- **番剧/游戏/书籍/音乐详情** — 评分分布、收藏统计、制作人员、角色、相关条目
- **吐槽箱** — 角色页嵌入式展示，番剧/人物页独立子页面
- **讨论版** — 番剧讨论帖列表 + 帖子详情
- **人物/角色详情** — 完整信息展示、参与作品、声优/关联人物、吐槽箱

### 特色功能（自研）

- **豆瓣评分** — 一站式查看多平台信息（iframe 嵌套清洗后的豆瓣页面）
- **相关音乐** — 跳转该番剧/游戏相关音乐（MusicCard 嵌入式网易云播放器）
- **萌娘百科** — 链接萌娘百科，查看更全的番剧简介（iframe 嵌套清洗后页面）
- **在线观看** — 链接第三方番剧在线观看网站，一键跳转

---

## 四、账号体系

当前采用「**Bangmio 独立账号 + Bangumi 绑定**」双模式。

### 登录方式（登录页双 Tab）

1. **Bangmio 账号**（默认）：邮箱 + 密码 + Turnstile 人机验证 + 邮箱验证码注册
2. **Bangumi 直登**：OAuth 或手动粘贴 Access Token（不创建 D1 记录）

### 核心流程

- **注册**：邮箱 + 密码（≥8 位）+ 确认密码 + Turnstile + 邮箱验证码
- **登录**：邮箱 + 密码 + Turnstile（辅助防护，失败降级放行）
- **忘记密码**：`/forgot-password`（邮箱 + Turnstile 发验证码）→ `/reset-password`（验证码 + 新密码）
- **修改密码**：设置页「账号安全」卡片（需原密码验证）
- **绑定 Bangumi**：Bangmio 用户需绑定 Bangumi 才能用番剧功能（收藏/进度/吐槽）
  - 绑定后自动拉取并缓存 Bangumi 用户资料到 `bgmUserProfile`
  - `auth.effectiveUser` computed 统一 Bangmio/Bangumi 直登的用户对象

### 数据库（D1: bangmio-users）

- `users`：id / email / password_hash (PBKDF2-SHA256) / salt / bgm_uid / bgm_token (AES-GCM 加密) / 时间戳
- `email_codes`：邮箱验证码（purpose = `register` / `reset`，10 分钟有效，一次性消费）

### 安全机制

- 密码 PBKDF2-SHA256，迭代 10 万次，salt 16 字节
- JWT（HS256）有效期 7 天，含 `userId` / `email` / `bgmUid`
- 邮箱验证码路由限流（5 次/分钟）+ 严格速率限制
- 忘记密码对未注册邮箱静默返回成功（防账号探测）
- Bangumi token 在 D1 中 AES-GCM 加密存储

---

## 五、主要页面（client/src/views）

| 路由               | 页面               | 说明                                                             |
| ------------------ | ------------------ | ---------------------------------------------------------------- |
| `/`                | Home.vue           | 首页（未登录显示欢迎区块 + 探索引导；已登录显示在追 + 热门新番） |
| `/trending`        | Trending.vue       | 新番时间表                                                       |
| `/anime`           | Browse.vue         | 搜索                                                             |
| `/anime/:id`       | Detail.vue         | 番剧详情（含评分/在线观看/豆瓣/萌娘 Tab）                        |
| `/groups`          | Groups.vue         | 小组列表                                                         |
| `/groups/:id`      | GroupDetail.vue    | 小组详情                                                         |
| `/profile`         | Profile.vue        | 个人主页（两栏布局：收藏 + 时间胶囊/统计）                       |
| `/watching`        | Watching.vue       | 追番                                                             |
| `/settings`        | Settings.vue       | 设置（含账号安全/修改密码）                                      |
| `/login`           | Login.vue          | 登录（双 Tab）                                                   |
| `/register`        | Register.vue       | 注册                                                             |
| `/forgot-password` | ForgotPassword.vue | 忘记密码                                                         |
| `/reset-password`  | ResetPassword.vue  | 重置密码                                                         |
| `/bind-bangumi`    | BindBangumi.vue    | 绑定 Bangumi                                                     |
| `/login/callback`  | LoginCallback.vue  | OAuth 回调                                                       |
| `/about`           | About.vue          | 关于                                                             |
| `/character`       | Character.vue      | 角色                                                             |
| `/person`          | Person.vue         | 人物                                                             |
| `/talkbox`         | Talkbox.vue        | 吐槽箱                                                           |
| `/topic/:id`       | TopicDetail.vue    | 讨论帖详情                                                       |
| `/topic-board`     | TopicBoard.vue     | 讨论版                                                           |

### 关键组件

- `CollectionButton.vue` — 收藏状态按钮（智能同步、分类用语差异化）
- `IframeEmbed.vue` — iframe 嵌入（srcdoc/src 双模式、高度自适应、超时重试，首次 15s/重试后 20s）
- `ExternalEmbedFallback.vue` — 外部嵌入失败时的结构化摘要降级
- `MusicCard.vue` — 嵌入式音乐播放卡片
- `StarRating.vue`、`CommentSection.vue`、`BindBangumiModal.vue`、`Toast.vue` 等

---

## 六、历史需求与迭代记录（.trae/specs）

项目下记录了多轮按 spec 驱动的开发。按时间/主题归纳如下：

### 1. 项目整体优化（project-wide-optimization）

- 全局代码质量、性能、可维护性优化
- 采用 Mock Service Worker（MSW）方案（见 `msw-decision.md`）
- 统一 UI 设计令牌（圆角 card/pill、阴影 card/hover、card-in 动画）

### 2. UI 细节精修（ui-detail-refinement）

- 统一「编辑杂志风 × 和纸美学」视觉体系
- 字体：Fraunces / DM Sans + Noto Sans SC / JetBrains Mono / Noto Serif SC
- 配色：浅色（纯白 + 淡粉 #ff8fa3/#ff6b81）、深色（深黑 + 亮粉 #f472b6）
- 移动端竖屏 UI 全面优化（底部导航、安全区适配、卡片单列）

### 3. 小组功能修复（fix-groups）

- 小组数据源改为多源抓取 + 重试（bgm.tv → bangumi.lol → bangumi.one）
- 5 分钟内存缓存，避免触发 WAF
- 小组详情抓取失败时返回名称 + 原站链接兜底
- 前端明确空状态提示 + 原站跳转链接

### 4. 六大核心问题修复（fix-six-core-issues）

- 小组功能错误分类与重试
- 豆瓣/萌娘百科 iframe 嵌套 + 广告过滤
- 番剧详情页状态同步优化（变更检测 + 防抖）
- 分类用语按 subject type 差异化（想读/想看/想听/想玩等）
- **账号体系重构**：Bangmio 独立账号 + Bangumi 绑定双模式（D1 + JWT + PBKDF2）

### 5. 账号体系增强与故障修复（auth-enhancement-and-fix）

- 登录增加 Turnstile 人机验证
- 新增修改密码、忘记密码/重置密码功能
- 修复 Bangmio 用户绑定后个人页空白、追番页失效（`effectiveUser`）

### 6. 豆瓣/萌娘百科稳定嵌入（embed-douban-moegirl-stable）

- 服务端代理 + HTML 清洗（linkedom 而非 cheerio，避免 CF 部署失败）
- 字符编码处理（TextDecoder 多编码尝试，解决萌娘乱码）
- 萌娘新皮肤 `<template>` 内容解包
- iframe 高度自适应（ResizeObserver + postMessage + 轮询）
- API 摘要降级 Fallback

### 7. 核心应用功能修复（fix-core-app-features）

- 登录功能、小组功能、外部数据加载、音乐卡片嵌入式播放、移动端竖屏 UI

### 8. 认证/小组/状态/邮件综合修复（fix-auth-groups-status-email）

- **收藏状态自动修改 bug**：仅更新评分/评论时不再自动设置默认状态（type=3）；未收藏返回 400「请先选择收藏状态」
- **登录人机验证**：Turnstile siteverify 网络异常降级放行；登录路由 Turnstile 失败降级放行（邮箱+密码为主认证）
- **小组降级标识**：返回 `degraded` 字段，前端据此显示「部分数据为兜底展示」
- **邮件改造**：发件人 `Bangmio <signup@bangmio.site>`（避免垃圾邮件误判），主题 `Bangmio验证码是{code}`
- **注册页说明**：顶部提示「Bangmio 账户处在测试阶段，推荐使用 Bangumi 直登」
- **忘记密码**：确认路由/页面/action 完整可用

### 9. 登录 token 转发修复（hotfix）

- **loginWithBangmio 未转发 captchaToken**：store 函数签名从 `(email, password)` 改为 `(email, password, captchaToken)`，请求体增加 `captchaToken` 字段——这是登录人机验证失效的根因

### 10. 评分防抖、章节并行、动画降级、Profile 重试（hotfix）

- **评分 watcher debounce**：`collectionRating` 变化后延迟 500ms 再发请求，避免快速点击星星产生多次 API 调用
- **详情页章节并行加载**：`fetchEpisodes` 合并到 `Promise.allSettled`，与详情/角色/制作人员/关联数据一起并行请求
- **prefers-reduced-motion**：系统设置开启后跳过 GSAP 动画直接完成过渡，解决低端设备白屏
- **Profile effectiveUser 为空时重试**：`loadProfile` 中检测到 `effectiveUser` 为空时自动尝试重新拉取 `bgmUserProfile`

### 11. Bangmio 登录后功能/未登录首页/嵌入超时综合修复（fix-bangmio-login-homepage-embeds，最近）

- **fetchBgmUserProfile 容错**：新增 `bgmProfileError` / `bgmProfileLoading` 状态；失败不再静默，`checkAuth` 中自动重试（最多 2 次，间隔 1s）
- **Profile.vue 三态适配**：加载中显示 spinner，失败显示重试按钮，重试时先 `fetchBgmUserProfile()` 再 `loadProfile()`
- **Watching.vue username fallback**：`currentUsername` 回退到 `bangmioUser.bgmUid`；无 username 时不发送 API 请求，显示加载/重试提示
- **未登录首页欢迎区块**：新增 Hero section（Bangmio 品牌介绍 + 登录/注册按钮）+ 探索引导卡片（新番时间表 + 搜索入口）
- **外部嵌入超时优化**：`fetchHTML` 8s→12s，`fetchHTMLMulti` 整体 12s→18s，豆瓣 `/page` 6s→10s，IframeEmbed 首次 10s→15s/重试后 20s
- **小组降级提示优化**：`degraded` 时不显示"服务暂不可用"，改为温和提示"部分小组数据为缓存展示"

### 12. 第三轮工程质量修复（2026-08-14，已提交推送至 master）

本次为纯工程质量/可维护性批次，无功能变更；提交 `be2ea01`、`9f8ce90`（GitHub master）。

- **CI 收紧**：移除 [ci.yml](file:///d:/Bangmio%20v4/.github/workflows/ci.yml) 中 lint/test 两处 continue-on-error（此前注释声称"有较多 lint 错误"，实测早已全绿），CI 恢复真实把关能力；同时把 workflow 触发分支从不存在的 `main` 修正为实际远程分支 `master`
- **组件测试基础设施**：根 package.json 新增 @vue/test-utils、jsdom、@vitejs/plugin-vue；[vitest.config.js](file:///d:/Bangmio%20v4/vitest.config.js) 增加 vue 插件、environmentMatchGlobs（`client/src/components/**` 用例走 jsdom，其余保持 node），并用 alias 统一 vue 到根目录单一副本——解决根依赖与 client 各自解析出双 vue 实例、导致挂载组件响应式更新（v-if 切换 / watch）全部失效的问题
- **CollectionButton 测试恢复执行**：[CollectionButton.test.js](file:///d:/Bangmio%20v4/client/src/components/CollectionButton.test.js) 移除依赖缺失时的 describe.skip，6 个状态同步用例真实执行（此前一直"假绿"跳过）
- **服务端双 package 合并**：删除 server/package.json、server/package-lock.json 与 server/node_modules（内含旧 hono 4.9）；后端统一用根目录 hono 4.12.29，@hono/node-server 上移根 devDependencies；functions/api/_server.js 已用根 hono 重建
- **本地开发脚本修复**：dev:server 入口从 server/src/app.js（不监听端口、原脚本无效）改为 server/src/index.js；新增 server:start（node server/src/index.js）
- **文档对齐**：[client/.env.example](file:///d:/Bangmio%20v4/client/.env.example) 变量名 VITE_API_BASE_URL → VITE_API_BASE（与代码读取的 import.meta.env.VITE_API_BASE 一致）
- **仓库卫生**：[.gitignore](file:///d:/Bangmio%20v4/.gitignore) 忽略实验性爬虫目录 ScrapyDouban-analysis/，避免误提交

### 13. Detail.vue 与 Profile.vue 大文件拆分（2026-08-14，提交 9f8ce90）

- **Detail.vue 1277 → 约 560 行**：拆分为 13 个 Tab 子组件（client/src/components/detail/）：TabOverview / TabEpisodes / TabCharacters / TabStaff / TabRelations / TabTalkbox / TabTopics / TabWiki / TabRating / TabDouban / TabMusic / TabStreaming / TabMoegirl；父组件仅保留 Hero 区、收藏交互、数据加载（并行 Promise.allSettled + 空闲预取）与 Tab 编排
  - 各 Tab 逻辑随组件自包含：TabTopics 内聚发帖弹窗 + PostNewTopic，TabMoegirl 内聚搜索（多候选名/清洗回退）、iframe 嵌入、降级回退与重试
  - cvtCareer（制作人员职业→中文）抽到共享工具 career.js；barWidth/infoValue/豆瓣卡片 computed 随组件下沉
- **Profile.vue 1036 → 约 580 行**：拆为 client/src/components/profile/ 下的 ProfileCollections（单媒介收藏卡片）、ProfileTimelineCard（时间胶囊）、ProfileStatsPanel（统计面板，含类型筛选/6 卡统计/评分分布，内部状态自包含）；状态/时间/评分条等辅助函数抽到 profile.js；统计面板以 currentUsername 为 key，换用户时重置筛选
- **新增组件测试**：tabs.test.js（10 个 Detail Tab 冒烟用例）+ profile.test.js（5 个 Profile 统计/时间胶囊逻辑用例）
- **测试覆盖**：199 passed → **220 passed / 0 skipped**

---

## 七、当前已知问题与注意事项

1. **Turnstile widget 域名配置**：需在 Cloudflare Dashboard 确认 widget hostname 覆盖 `bangmio.site`、`www.bangmio.site`、`bangmio.pages.dev`（代码层面无法修改，登录已降级放行不受影响）
2. **豆瓣反爬**：豆瓣页面存在反爬机制，iframe 直嵌受限，采用「降级 HTML + /summary 结构化摘要」策略；超时已从 6s 增至 10s
3. **小组抓取**：Cloudflare 边缘节点抓取 Bangumi 小组可能被 WAF 拦截，依赖多源重试 + 兜底数据 + `degraded` 标识；前端已优化为温和提示而非"服务暂不可用"
4. **bilibili API**：从 Cloudflare Pages 边缘节点请求 Bilibili 接口会被其 WAF 拦截（返回 412）
5. **Bangmio 登录后资料获取**：`fetchBgmUserProfile` 失败时有自动重试（2 次）+ 页面重试按钮；`effectiveUser` 为空时 Profile/Watching 页面显示加载/重试提示而非空白
6. **Git 代理配置**：本地 git 配置了 `http.proxy = http://127.0.0.1:10808`，推送时需确保代理运行或用 `git -c http.proxy='' -c https.proxy='' push` 临时绕过

## 八、配置与环境变量

### wrangler.toml

```toml
name = "bangmio"
compatibility_date = "2025-05-31"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "client/dist"

[vars]
OAUTH_REDIRECT_URI = "https://bangmio.site/login/callback"
VITE_TURNSTILE_SITE_KEY = "0x4AAAAAAD6gcShUkr9NZuAJ"
VITE_REQUIRE_EMAIL_CODE = "true"
RESEND_FROM = "Bangmio <signup@bangmio.site>"

[[d1_databases]]
binding = "DB"
database_name = "bangmio-users"
```

### 需在 Cloudflare Pages 环境变量配置（.dev.vars 示例）

- `BGM_APP_ID` / `BGM_APP_SECRET` — Bangumi OAuth 凭据（bgm.tv/dev/app 获取）
- `JWT_SECRET` — JWT 签名密钥（≥32 字符）
- `BGMIO_SALT` — 全局加密 salt
- `TURNSTILE_SECRET_KEY` — Turnstile 服务端密钥
- `RESEND_API_KEY` — Resend 邮件 API 密钥
- `D1_DATABASE_ID` — D1 数据库 ID

---

## 九、构建与部署流程

1. `npm test` — 运行 Vitest（220 passed / 0 skipped）
2. `npm run lint` — ESLint 检查
3. `npm run build` — 依次执行：
   - `server:build`：esbuild 打包后端到 `functions/api/_server.js`（+ `_meta.json`）
   - `bundle:size`：输出打包体积
   - 前端 `npm run build` → `client/dist`
4. Git 提交推送 → Cloudflare Pages 自动构建部署

### 重要工程约束（避免踩坑）

- Cloudflare Pages Functions **不支持** Node 内置模块（如 `node:stream`）与全局 `process` → 用 `globalThis` polyfill
- HTML 解析用 **linkedom** 而非 cheerio（cheerio 依赖 node:stream 会导致 CF 部署失败）
- 小组/外部抓取需多源重试 + 兜底，避免边缘节点 WAF 拦截导致功能不可用

---

_本文档由 AI 助手根据项目代码、spec 记录与配置汇总生成，供项目维护与交接参考。_
