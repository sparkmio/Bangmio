# Bangmio 项目资料与维护手册

> 文档用途：给后续开发 Agent、维护者和项目协作者提供一份集中式项目资料。  
> 生成日期：2026-09-25  
> 当前分支：`master`  
> 当前基线提交：`3b66694 fix: restore group topic content and mobile layout`  
> 当前远端状态：创建本文档前 `master` 与 `origin/master` 同步，工作树干净。  
> 本文档只记录项目事实、已确认决策、历史审计结论和维护规则；不包含任何 Token、密码、Cookie、OAuth Secret、邮件 API Key 或用户隐私数据。

---

## 1. 项目定位

Bangmio 是 Bangumi 的第三方客户端，目标是以更现代、响应式、适合移动端的界面提供：

- Bangumi 条目浏览、搜索和详情查看；
- OAuth 登录、Bangumi Token 绑定；
- 动画、书籍、音乐、游戏、三次元收藏管理；
- 收藏状态、10 分制评分、短评和观看进度；
- 条目吐槽箱、条目讨论版、小组社区；
- 人物、角色、关联条目、制作人员信息；
- 豆瓣、Bilibili、萌娘百科、Wikipedia、音乐等外部资料聚合；
- Cloudflare Workers + D1 运行时；
- 可选 AI 助手。

生产站点：`https://bangmio.site`  
代码仓库：`https://github.com/sparkmio/Bangmio`

项目是 Next.js + React 主架构，保留旧 Vue 客户端与部分历史样式作为兼容层。后续继续使用 Next.js + React，不进行整体切回 Vue 的迁移。

---

## 2. 事实优先级与 Agent 工作规则

### 2.1 事实来源优先级

遇到冲突时按以下顺序判断：

1. 用户当前明确需求；
2. 当前工作树中的代码、测试和配置；
3. 根目录 `AGENTS.md`；
4. `README.md`、本文件和 `.codex/skills/bangmio/references/`；
5. Git 历史和旧聊天记录；
6. 线上页面、Bangumi 原站和第三方镜像。

线上数据可能变化，旧审计结论必须标注日期，不得当作实时事实。

### 2.2 修改前必做检查

```powershell
git status --short --branch
git diff
git diff --check
git log --oneline -5
```

修改 Next.js 代码、路由、缓存或构建配置前：

- 阅读根目录 `AGENTS.md`；
- 按任务阅读 `node_modules/next/dist/docs/` 中对应的 Next.js 16.3.1 文档；
- 不手改 `next-env.d.ts`；
- 不删除 `AGENTS.md` 中由 `next dev` 自动维护的规则块。

### 2.3 工作树和提交规则

- 启动时已有的修改视为用户或其他 Agent 的工作，不得覆盖；
- 不使用 `git reset`、`git restore`、`git checkout --` 清理不明修改；
- 不把 `.dev.vars`、Cookie、密钥、临时日志、构建缓存提交到仓库；
- `commit`、`push`、`release`、`wrangler deploy`、生产 D1 写操作是独立动作，必须得到用户明确授权；
- 本文档由用户要求创建，当前任务明确要求不 commit；创建后保持未提交状态。

---

## 3. 技术栈与运行方式

| 层       | 技术                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| 主前端   | Next.js 16.3.1、React 19、TypeScript                                                                        |
| UI       | TailwindCSS、DaisyUI、历史 Vue design CSS、自定义 CSS tokens                                                |
| 后端     | Hono，集成到 Next API route                                                                                 |
| 上游     | Bangumi API v0、Bangumi HTML、bangumi.pro / bangumi.one 镜像、豆瓣、Bilibili、萌娘百科、Wikipedia、音乐服务 |
| 部署     | OpenNext + Cloudflare Workers                                                                               |
| 数据库   | Cloudflare D1，绑定名 `DB`                                                                                  |
| 本地测试 | Vitest、JSDOM、Linkedom、Vue Test Utils                                                                     |
| 旧客户端 | `client/` 下的 Vue 3/Vite 客户端                                                                            |
| 构建辅助 | Wrangler、esbuild、OpenNext、Husky、ESLint、Prettier                                                        |

### 3.1 常用命令

```powershell
# Next 开发服务器，默认端口 3001
npm run dev
npm run dev:next

# 独立 Hono 本地服务器
npm run dev:server
npm run server:start

# 同时启动后端和 Next
npm run dev:all

# 检查
npm run lint
npm run lint:react
npm run typecheck
npm test
npm run check

# Next / OpenNext
npm run next:build
npm run build
npm run next:dry-run
npm run next:deploy

# 本地 D1
npm run db:local:init

# Vue 兼容客户端
npm run dev:vue
npm run build:vue
```

### 3.2 本地开发注意事项

- Next 本地端口为 `3001`，不要盲目启动第二个服务；先检查端口和已有 Node 进程；
- `next dev` 可能自动更新 `next-env.d.ts`，这类生成差异不要手改；
- OpenNext/Wrangler 的开发日志配置已在 `next.config.mjs` 中尽量限制到项目内 `.wrangler`，避免全局 AppData 写入失败；
- 若出现大量 `fetch failed`，沿着“页面 → Next API route → Hono → 上游/ D1”链路排查，不要只在前端加假数据；
- 本地 API 默认回环地址为 `http://localhost:3001`，生产配置目前使用站点地址，见“架构风险”。

---

## 4. 目录地图

### 4.1 主应用

- `app/`：Next.js App Router 页面、API 转发、全局样式；
- `components/`：React 客户端组件；部分文件仍以 `vue-` 命名，表示历史兼容组件，不代表必须使用 Vue；
- `lib/`：API 客户端、数据类型、查询解析、页面数据契约、社区规范化；
- `server/src/`：Hono 应用、控制器、路由、服务、D1、抓取和安全工具；
- `server/db/`：D1 schema 和 migrations；
- `public/`：静态资源；
- `scripts/`：构建、数据库、本地工具和 release 脚本。

### 4.2 历史兼容层

- `client/`：旧 Vue 3/Vite 客户端。除非用户明确要求，不将其当成 Next 主应用替代品；
- `app/vue-reference.css`：历史 Vue/DaisyUI 编译样式，目前仍被 `globals.css` 引入；
- `app/legacy.css`：历史样式；
- `functions/api/`：服务端 bundle 跟踪构建产物，涉及 `server/src/app.js` 时检查是否需要同步；
- `bangmio-site-clone/`：反向工程/样板性质目录，不应和当前主应用混淆。

### 4.3 关键文件

| 目标           | 文件                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| 首页           | `app/page.tsx`、`components/home-client.tsx`                                              |
| 条目浏览       | `app/anime/page.tsx`                                                                      |
| 条目详情       | `app/anime/[id]/page.tsx`、`components/vue-anime-detail.tsx`                              |
| 条目讨论       | `app/anime/[id]/topics/page.tsx`                                                          |
| 条目吐槽       | `app/anime/[id]/talkbox/page.tsx`                                                         |
| 小组列表       | `app/groups/page.tsx`、`components/vue-groups-client.tsx`                                 |
| 小组详情       | `app/group/[id]/page.tsx`                                                                 |
| 小组话题       | `app/group/topic/[id]/page.tsx`、`components/topic-thread.tsx`                            |
| 通用话题       | `app/topic/[id]/page.tsx`、`components/topic-thread.tsx`                                  |
| 个人页         | `app/profile/page.tsx`、`app/profile/[username]/page.tsx`、`components/account-pages.tsx` |
| 在追页         | `app/watching/page.tsx`、`components/account-pages.tsx`                                   |
| 设置页         | `app/settings/page.tsx`、`components/appearance-provider.tsx`                             |
| API 转发       | `app/api/v1/[...path]/route.ts`                                                           |
| Hono 入口      | `server/src/app.js`                                                                       |
| API 客户端     | `lib/api.ts`                                                                              |
| 页面必需数据   | `lib/page-data.ts`                                                                        |
| 社区数据规范化 | `lib/community.ts`                                                                        |
| 全局样式       | `app/globals.css`、`app/community.css`                                                    |
| OpenNext       | `open-next.config.ts`、`wrangler.toml`                                                    |
| 数据库         | `server/db/schema.sql`、`server/db/migrations/`                                           |

---

## 5. 页面和路由清单

### 5.1 页面路由

```text
/                              首页
/about                         关于
/anime                         条目搜索/浏览
/anime/:id                     条目详情
/anime/:id/topics              条目讨论列表
/anime/:id/talkbox             条目吐槽箱
/trending                      新番时间表
/watching                      当前用户在追列表
/groups                        小组首页
/group/:id                     小组详情
/group/topic/:id               小组话题详情
/topic/:id                     通用话题详情
/person/:id                    人物详情
/person/:id/talkbox            人物吐槽箱
/character/:id                 角色详情
/profile                       当前用户个人页
/profile/:username             公开用户个人页
/settings                      设置
/login                         登录
/login/callback                OAuth 回调
/register                      注册
/forgot-password               找回密码
/reset-password                重置密码
/bind-bangumi                  绑定 Bangumi
/jump                          跳转辅助页
```

### 5.2 API 分组

所有主 API 通过 `/api/v1/*` 暴露，由 `app/api/v1/[...path]/route.ts` 转给 `server/src/app.js`。

| 前缀          | 作用                                                           |
| ------------- | -------------------------------------------------------------- |
| `/auth`       | 注册、登录、刷新、OAuth、绑定、密码、验证码、当前用户          |
| `/user`       | 用户资料、收藏、人物、角色、目录、好友、小组、时间线、年度统计 |
| `/anime`      | 搜索、浏览、详情、章节、角色、制作人员、关联、日历、标签       |
| `/collection` | 收藏列表、统计、读写、删除                                     |
| `/comments`   | 吐槽、条目话题、话题详情、回复、人物吐槽                       |
| `/groups`     | 小组列表、发现、搜索、小组详情、话题详情、发帖、回复           |
| `/douban`     | 豆瓣条目、简介、评论、短评、页面代理                           |
| `/bilibili`   | Bilibili 搜索和番剧资料                                        |
| `/moegirl`    | 萌娘百科搜索、摘要、页面                                       |
| `/wikipedia`  | Wikipedia 搜索、摘要、页面                                     |
| `/music`      | 音乐搜索                                                       |
| `/ai`         | AI 对话和建议                                                  |
| `/geo`        | 地理/地区判断                                                  |

### 5.3 已存在但前端入口不完整的用户 API

后端已经有以下能力，但前端尚未形成完整页面闭环：

```text
/user/:username/characters
/user/:username/persons
/user/:username/indexes
/user/:username/friends
/user/:username/groups
/user/:username/timeline
/user/:username/stats-yearly
```

后续应优先补可导航入口，而不是继续增加孤立 API。

---

## 6. 核心数据契约

### 6.1 收藏状态

|  值 | 状态 |
| --: | ---- |
|   1 | 想看 |
|   2 | 看过 |
|   3 | 在看 |
|   4 | 搁置 |
|   5 | 抛弃 |

其他约束：

- `rating` 为 0～10 的整数；
- 评分 UI 为 10 颗彼此分离的星星，不改回 5 星或重叠星星；
- `ep_status` 为 0～10000 的观看进度；
- API 读取同时兼容 `ep_status` 和旧字段 `episode`；
- API 写入同时接受 `ep_status` 和 `episode`，实际写入 Bangumi 的 `ep_status`；
- `comment` 最多 2000 个字符；
- 未提供 `status` 时，只有确认已有收藏状态才允许保留原状态；未收藏条目不能静默创建默认收藏。

### 6.2 页面数据错误语义

- 已确认上游 404：可以 `notFound()`；
- 502、超时、镜像不可用：不能当成 404；
- 可选区域失败：显示明确的 `DataUnavailable`，不要伪装成空数据；
- 统计未知：显示“暂不可用”或 `—`，不能显示假 `0`；
- 真实数量为 0：才显示 `0`；
- 社区详情应优先使用最近成功缓存，尽量避免整页不可用。

### 6.3 图片地址

远程图片可能来自 `http://` 镜像，而生产站点为 HTTPS。任何公共图片地址都需要统一规范化，至少将可信远程 `http://` 升级到 `https://`，避免混合内容导致封面全空白。后续还应限制可接受的外部图片来源。

---

## 7. 已确认产品决策

以下能力不可在重构中回退：

1. 继续使用 Next.js + React，不切回 Vue；
2. 详情页收藏区名称为“收藏盒”；
3. 10 分制评分和评分分布图保留；
4. “在看”状态自动显示观看进度；
5. 角色和百科信息必须保持可读尺寸；
6. 移动端和桌面端都要保留加载、空数据、未登录、失败状态；
7. 旧 Vue 客户端先保留，不做无授权删除；
8. 生产目标是 OpenNext + Cloudflare Workers，不退回旧 Pages `client/dist` 部署；
9. 视觉可以使用动效、毛玻璃和液态层次，但用户必须能在设置中关闭；
10. 不执行线上发帖、回复、评分、收藏等写操作进行审计。

---

## 8. 线上审计记录（最后一次已知快照）

> 以下结论来自 2026-09-06 的线上审计，不代表 2026-09-25 的实时状态。再次修复前必须重新访问线上页面确认。

### 8.1 已观察到的问题

#### A. 小组话题详情偶发整页失败

访问 `/group/topic/470276` 时曾显示：

```text
页面暂时无法加载
服务暂时不可用，不代表条目不存在。请稍后重试。
```

而 `/groups` 和 `/group/boring` 可以打开。原因方向是 SSR 自请求 + 上游小组详情抓取链超时或失败。

重点文件：

```text
app/group/topic/[id]/page.tsx
lib/page-data.ts
lib/api.ts
server/src/routes/groups.js
```

#### B. 时间表封面空白

`/api/v1/anime/calendar` 曾返回 `http://lain.bangumi.pro/...` 图片地址，浏览器因 HTTPS 混合内容拦截，导致 `/trending` 卡片只有占位。

#### C. 小组成员数解析不可靠

真实 DOM 中成员数常位于 anchor 的兄弟节点或更高层 `li`，旧解析只看 anchor 父节点，导致线上出现大量 `0 成员`。未知值不得伪造为 0。

#### D. 小组列表存在导航污染风险

直接扫描全页 `a[href]` 可能把页头、页脚和帮助区域的小组链接混入“发现小组”数据。应限定真实列表容器并加结构过滤。

#### E. 角色、关联接口曾出现 500

曾观察到：

```text
GET /api/v1/anime/10380/characters 500
GET /api/v1/anime/10380/relations 500
```

页面已有局部降级，但应进一步区分“无数据”和“上游失败”，并考虑镜像回退和 stale cache。

#### F. D1 rate_limits 表未确认迁移

旧线上日志出现：

```text
D1_ERROR: no such table: rate_limits
D1 速率限制不可用，已回退内存计数
```

仓库已有 `server/db/migrations/002_rate_limits.sql`，生产 D1 是否已应用需要通过 Wrangler 重新核验。

### 8.2 线上 UI 观察

- 社区页整体结构已比早期稳定，但颜色和卡片语义仍不完全统一；
- 小组详情页正文很长，桌面右侧存在明显空白；
- 小组详情缺少概览/讨论/成员导航；
- 个人页小组名称一度只是文本，不可进入小组；
- 时间胶囊入口实际只是页面内时间线占位；
- AI 助手悬浮按钮在移动端视觉权重偏高；
- 话题详情缺少分页、加载更多、指定楼层跳转、举报/编辑/删除等能力；
- `/watching`、`/anime` 等页面曾出现“正在加载”状态，必须确认最终数据是否落地，而不是只观察初始 AX tree。

---

## 9. 与 bgm.tv 原站的功能差距

原站首页/导航曾观察到以下能力，Bangmio 尚未完整覆盖：

### 内容体系

- 动画近期注目、排行榜、分类浏览、标签、日志、每日放送；
- 书籍、音乐、游戏、三次元的对应浏览、排行、标签和日志；
- 人物、收藏角色、收藏人物、人物更新；
- 超展开、探索、目录、维基、开发者平台等。

### 首页社区聚合

- 动态时间线；
- 吐槽、收藏、进度、日志筛选；
- 小组话题；
- 热门条目讨论；
- 每日放送；
- 公告/站务信息；
- 动态发表入口。

### 小组社区

原站有或曾提供：

```text
/group/discover
/group/all
/group/my_topic
/group/my_reply
/group/mine
/group/:id
/group/:id/forum
/group/:id/members
/group/topic/:id
```

Bangmio 当前主要覆盖：

```text
/groups
/groups/search
/group/:id
/group/topic/:id
POST /groups/:id/topic
POST /groups/topic/:id/reply
```

缺口：

- 我发表的话题；
- 我回复的话题；
- 我参加的小组独立页面；
- 成员列表；
- 加入/退出小组；
- 讨论分页；
- 话题置顶、关注、跳页；
- 回复加载更多、指定楼层；
- 编辑、删除、举报；
- 作者主页链接；
- 成员/讨论/概览 Tab。

### 用户中心

已有基础收藏、时间线、好友、小组、统计，但还缺：

- 真正独立的时间胶囊/时光机页面；
- 完整时间线筛选和分页；
- 角色收藏页；
- 人物收藏页；
- 日志、目录、维基入口；
- 可点击的小组列表；
- 更完整的好友、关注和人物更新能力。

### 条目详情

已有收藏盒、评分、进度、评分分布、章节、角色、制作人员、关联、豆瓣、音乐、在线观看、Wiki、吐槽和讨论入口。仍缺或较弱：

- 长评/日志入口；
- 最近讨论内嵌；
- 吐槽内容内嵌；
- 章节跳转到原站具体章节；
- 条目编辑/维基贡献入口；
- 讨论/吐槽数量统计和更完整互动。

---

## 10. 架构风险与治理方向

### 10.1 SSR 自请求公网域名

当前 `wrangler.toml` 中配置了生产 `BANGMIO_API_ORIGIN` 指向 `https://bangmio.site`。服务端组件可能经过公网域名再次调用自己的 API：

```text
SSR → bangmio.site → Next API route → Hono → 上游
```

这会增加网络跳转、超时和偶发整页失败概率。治理方向：

1. 评估服务端直接调用 Hono `app.fetch()`；
2. 保留浏览器端 `/api/v1` 相对路径；
3. 统一服务端和客户端请求策略；
4. 对必要网络请求增加有限重试和 stale-if-error；
5. 将页面错误降级为局部错误，不让可选模块拖垮整页。

### 10.2 多套 CSS 设计系统

当前同时存在：

```text
app/globals.css
app/community.css
app/vue-reference.css
app/legacy.css
DaisyUI primary/secondary/accent
--bm-* 自定义变量
--community-* 社区变量
```

这会导致颜色在粉色、深粉、紫色之间漂移，也是 UI 缺少统一质感的主要原因之一。

治理方向：

```text
--color-brand
--color-brand-strong
--color-brand-soft
--color-surface
--color-surface-elevated
--color-border
--color-text
--color-text-muted
--color-success
--color-warning
--color-danger
```

React 页面逐步迁移到单一 token；旧 Vue 样式先隔离，确认无生产依赖后再删除。

### 10.3 上游抓取逻辑分散

`groups.js`、`comments.js`、`user.js` 和 anime services 各自处理抓取、缓存、镜像、乱码和降级。长期应抽出统一的 upstream 层：

```text
upstream/
  fetch-with-fallback
  edge-cache
  memory-cache
  stale-if-error
  timeout-policy
  response-status
```

### 10.4 认证与安全

- OAuth Secret、JWT Secret、Resend Key 只能放 Worker Secret；
- 历史中已暴露的真实邮件 Key 应在 Resend 控制台撤销并重生成；
- 当前收藏 API 有 username/token 绑定校验，不得移除；
- CSP 中 `unsafe-inline`、外部图片白名单、Token 存储方式仍需后续评估；
- 生产 D1 迁移必须有明确核验记录；
- 不在文档或日志中输出真实 Token、Cookie 或用户资料。

---

## 11. 推荐治理路线

### 阶段一：可靠性优先

1. 修复小组话题页整页失败；
2. 统一 stale-if-error 和最近成功缓存；
3. 修复远程图片 HTTPS；
4. 修复小组列表导航污染；
5. 修复成员数解析并禁止未知变 0；
6. 核验并补齐生产 D1 migration；
7. 修复角色、关联条目的镜像回退和局部重试；
8. 记录线上 Worker、构建版本和 Git commit 的对应关系。

### 阶段二：社区闭环

1. 小组概览 / 讨论 / 成员 Tab；
2. 成员列表；
3. 加入/退出小组；
4. 我的主题 / 我的回复 / 我参加的小组；
5. 话题和回复分页；
6. 作者主页链接；
7. 回复成功局部刷新；
8. 编辑、删除、举报、关注；
9. 指定楼层和最后阅读位置。

### 阶段三：首页和用户中心

1. 首页加入小组话题；
2. 加入热门条目讨论；
3. 加入每日放送；
4. 加入公告/站务模块；
5. 将时间胶囊改为真实页面或明确改名为动态；
6. 完成角色、人物、目录、日志、维基入口；
7. 小组和好友信息全部可点击。

### 阶段四：视觉治理

1. 建立单一颜色和间距 token；
2. 统一卡片、边框、阴影和圆角；
3. 社区页面采用内容优先的信息密度，不做无意义的大面积留白；
4. 动效保持克制，支持 `prefers-reduced-motion` 和设置关闭；
5. 玻璃效果只用于导航、浮层和轻量容器，正文保持可读；
6. AI 助手增加单独显示开关，移动端默认降低视觉权重；
7. 每次 UI 变更至少检查一个宽屏和一个窄屏。

### 阶段五：旧 Vue 兼容层治理

1. 不再新增 Vue 主功能；
2. 将 Vue 样式对 React 进行隔离；
3. 迁移剩余 `vue-*` 命名组件到清晰的 React 命名；
4. 等生产确认不再依赖旧 Vue bundle 后，再评估删除；
5. 不进行一次性大迁移。

---

## 12. 测试与验收清单

### 每次后端或数据修改

```powershell
npm test
npm run typecheck
npm run lint:react
git diff --check
```

涉及 Vue 或全仓库时追加：

```powershell
npm run lint
```

涉及构建或部署时追加：

```powershell
npm run next:build
# 仅用户明确授权时：
npm run next:dry-run
npm run next:deploy
```

### UI 验收

至少检查：

- 首页；
- 条目搜索；
- 条目详情；
- `/trending`；
- `/groups`；
- `/group/:id`；
- `/group/topic/:id`；
- `/anime/:id/topics`；
- `/anime/:id/talkbox`；
- `/profile`；
- `/watching`；
- 登录和未登录状态；
- 桌面宽屏与移动窄屏；
- 加载、空数据、接口失败、未登录、上游超时状态；
- 关闭动画和关闭玻璃质感后的可用性。

### 社区写操作安全边界

线上审计默认只读。不得为了测试擅自：

- 发帖；
- 回复；
- 评分；
- 收藏；
- 加入或退出小组；
- 发送邮件；
- 修改生产 D1。

除非用户明确授权并说明目标环境、影响和回滚方式。

---

## 13. 当前 Git 基线

创建本文档前已确认：

```text
HEAD: 3b66694 fix: restore group topic content and mobile layout
origin/master: 3b66694 fix: restore group topic content and mobile layout
working tree: clean
```

最近相关提交：

```text
3b66694 fix: restore group topic content and mobile layout
cbefde4 fix: harden community cache and topic navigation
e4ad7d9 feat: polish community workflows and resilience
491c767 chore(release): prepare v4.3.1
6cb58cf fix: govern app reliability and remediate dependency vulnerabilities
436b59e fix(ui): restore collection progress and rating details
d010471 fix(ui): rebalance anime detail layout
5b73a5a fix(deploy): build OpenNext artifacts for Cloudflare
```

本次创建 `agent.md` 后，**不执行 commit、push、tag、release 或部署**。

---

## 14. 不应做的事情

- 不要把 Next.js + React 改回 Vue；
- 不要把未知统计显示成 0；
- 不要用 fallback 假数据伪装真实线上数据；
- 不要把上游 502/超时当成 404；
- 不要删除 `episode` 收藏兼容字段；
- 不要删除评分分布、10 星评分或观看进度；
- 不要把角色、百科卡片重新压缩到不可读；
- 不要把 `BANGMIO_API_ORIGIN` 公网自请求问题当成已解决；
- 不要手改 `next-env.d.ts`；
- 不要把 Secret 写入 `wrangler.toml`；
- 不要在未授权时运行生产部署或 D1 写入；
- 不要为了“清理工作树”重置来源不明的文件。

---

## 15. 文档维护方式

当以下内容发生稳定变化时，应更新本文件：

- 主架构和部署方式；
- 产品已确认决策；
- API 数据契约；
- 路由和目录职责；
- 生产已验证的迁移状态；
- 已修复或新增的高优先级问题；
- 测试命令、端口或构建流程。

一次性截图、临时猜测、未验证的线上现象不要直接升级为长期规则；应写成带日期的审计记录。
