# Bangmio 项目资料与维护手册

> 文档用途：给后续开发 Agent、维护者和项目协作者提供一份集中式项目资料。  
> 创建日期：2026-09-25<br>
> 最后更新：2024-10-24<br>
> 当前分支：`master`<br>
> 最新提交：`3f44c95 docs: add GitHub repository cleanup plan and execution record`<br>
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

项目是纯 Next.js 16 + React 19 架构。旧 Vue 客户端目录（client/）已被废弃但保留在代码库中，不再构建或使用。

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
- 按任务阅读 `node_modules/next/dist/docs/` 中对应的 Next.js 16.3.6 文档；
- 不手改 `next-env.d.ts`；
- 不删除 `AGENTS.md` 中由 `next dev` 自动维护的规则块。

### 2.3 工作树和提交规则

- 启动时已有的修改视为用户或其他 Agent 的工作，不得覆盖；
- 不使用 `git reset`、`git restore`、`git checkout --` 清理不明修改；
- 不把 `.dev.vars`、Cookie、密钥、临时日志、构建缓存提交到仓库；
- `commit`、`push`、`release`、`wrangler deploy`、生产 D1 写操作是独立动作，必须得到用户明确授权；
- 文档或实现是否提交、推送、发布，按当前用户对各项动作的明确授权执行；commit 与 push 始终视为独立动作。

---

## 3. 技术栈与运行方式

| 层       | 技术                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------- |
| 主前端   | Next.js 16.3.6、React 19.2、TypeScript                                                                      |
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

> 以下问题观察来自 2026-09-06 的线上审计，是历史快照，不代表 2026-10-24 的实时状态。修复进展与后续验证边界见第 16 节；其余线上现象再次处理前仍须重新访问线上确认。

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

当时未记录生产迁移清单。2026-10-24 的后续 Wrangler 核验显示生产 D1 仅有 `000_initial_schema.sql` 和 `003_email_codes_hardening.sql` 待执行；经用户授权，两项均已成功应用。旧日志中的 `rate_limits` 缺表问题须结合此次迁移结果及后续 Worker 日志复核，不应仅凭旧日志判定仍存在。

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

## 13. Git 基线与历史快照

本文档创建于 2026-09-25，当时的历史基线为：

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

2026-10-24 本轮工作起点为 `6cbce37 fix: normalize remote image URLs to HTTPS`，且当时本地 `master` 与 `origin/master` 同步。该提交及其前一项近期提交已推送远端；本轮新增的 UI/文档提交状态与验证结果记录在第 16 节。

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

---

## 16. 近期工作与 Codex 协作记录（截至 2026-10-24）

本节汇总本项目近期 Codex 对话中的用户要求、已确认决定、已执行工作和仍待验证事项；16.1 保留本线程当前可见的用户原始要求，此前已完成工作的助手侧过程按现存交接摘要记录。它不是逐字聊天导出；不记录模型内部推理，也不包含密钥、账号资料或其他项目的对话。

### 16.1 对话时间线与已确认决定

1. 用户先要求全面扫描项目全部文件，梳理问题、整改方式和后续发展方向；随后要求继续既定扫描/整改工作，并批准先修复已经识别的问题。
2. 用户要求先把当时已有修改提交并推送到远端，然后继续后续工作。该阶段形成并推送了 `326b98f` 与 `6cbce37` 两项提交（具体摘要见 16.2）。
3. 用户要求继续原有计划，并明确希望移除 Bangmio 登录入口，只保留 Bangumi 登录；同时说明 Bangmio 入口未来可能恢复。
4. 用户进一步限定本轮范围为前端界面：后端 Bangmio 登录、注册等相关接口继续保留；完成后提交，并尽可能详细地更新本文件，记录近期改动和本项目 Codex 历史对话。
5. 因而当前认证产品决定是：用户可见登录入口仅展示 Bangumi OAuth/Access Token 登录；页面不再提供 Bangmio 邮箱密码登录/注册入口；后端接口、认证服务、数据结构、Vue 注册页面源码和 React 认证组件中的 Bangmio 流程暂不删除，以便以后恢复。此决定只改变入口呈现，不代表 Bangmio 认证已下线或后端接口已废弃。

本线程中可见的用户原始要求（按出现顺序）：

1. “全面扫描一下项目下的全部文件，看看有哪些问题，又要怎么整改，后续有什么合适的发展方向”
2. “继续”
3. “行，按照你的计划，先把现有的问题都解决修复吧”
4. “继续之前的工作”
5. “先提交当前全部修改包括commit到远端仓库然后继续完成后续工作”
6. “按你的计划继续操作吧，注意一下我希望展示移除bangmio登录入口（后续可能恢复），只保留bangumi登录”
7. “只调整前端界面就行，后端仍保留相关接口，然后提交，然后把所有近期改动，codex的历史对话全写进agent.md进行更新，项目情况等内容越详细越好”

### 16.2 近期已推送提交

以下两项在本轮 UI/文档工作开始前已位于 `origin/master`：

| 提交                                                           | 主要内容                                                                                                                                  | 交付边界                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `326b98f fix: harden auth security and deployment reliability` | 加固认证和会话安全、验证码处理、用户/API 输入校验与 HTML 清理、限流/日志/错误处理；补齐健康路由、迁移基线及相关测试；同步构建与部署配置。 | 这项是后端与安全整改，不是本轮 UI 隐藏 Bangmio 入口的依据；保留所有仍需兼容的认证 API。 |
| `6cbce37 fix: normalize remote image URLs to HTTPS`            | 统一远程图片 URL 的 HTTPS 规范化与请求行为，并补充 Bangumi 服务/HTTP 工具测试；同步 Cloudflare API 构建产物。                             | 解决混合内容风险；没有执行 Worker 部署。                                                |

这两项之前的 `3b66694` 等提交记录在第 13 节历史基线中。近期改动不意味着第 8 节列出的社区/上游问题已经全部解决；逐项线上状态需以最新页面、日志和测试为准。

### 16.3 生产 D1 与外部状态

- 2026-10-24 通过 Wrangler 检查生产 D1 迁移清单时，待应用项为 `000_initial_schema.sql` 与 `003_email_codes_hardening.sql`；经用户授权后两项已成功应用。
- 上述是生产 D1 schema 迁移操作，不等于 Worker 已部署，也不代表认证、邮件或 OAuth 真实链路已完成线上端到端验收。本轮未部署 Worker。
- 最近一次远端推送的工具输出报告 GitHub 依赖安全告警共 25 项（1 critical、8 high、11 moderate、5 low）。当时未能重新读取 `npm audit` 与 GitHub 告警明细；此计数仅记录为当时提示，当前告警状态、可修复版本和影响范围均待重新核验，不能宣称依赖已无漏洞。
- 后续未获新的生产写操作/部署授权前，不继续修改生产 D1，也不执行 Worker 部署。只读核验与本地测试仍可按任务范围开展。

### 16.4 本轮前端入口调整

本轮从 `6cbce37` 开始，在下列文件中调整可见登录/注册入口：

- `app/login/page.tsx` 将登录表单固定为 `AuthForm` 的 Bangumi 模式，提供 Bangumi OAuth 和 Access Token 登录。
- `app/register/page.tsx` 将 `/register` 页面重定向到 `/login`。Next.js 16.3.6 的本地 `redirect` 文档已核对；它是服务端页面重定向，不改动 API。
- `components/home-client.tsx`、`components/site-shell.tsx`、`components/account-pages.tsx` 将用户可见的登录提示改成 Bangumi 登录，并从首页移除注册按钮。
- 旧 Vue 客户端的 `client/src/views/Login.vue` 默认 Bangumi 登录；Bangmio Tab/邮箱密码表单保留在源码中，由 `showBangmioLogin = false` 隐藏，同时默认选择 Bangumi Tab 且不加载仅供 Bangmio 登录使用的 Turnstile。
- `client/src/router/index.js` 将旧客户端 `/register` 路由重定向到 `/login`；`client/src/views/Register.vue` 和注册实现保留。
- `client/src/views/Home.vue` 移除注册入口并使用 Bangumi 登录文案；`client/src/components/Sidebar.vue`、`client/src/views/Profile.vue` 的未登录入口统一使用 Bangumi 登录文案。

本轮仅调整界面和页面路由呈现。没有修改 `server/src/routes/auth.js`、`server/src/services/auth.js`、`client/src/stores/auth.js`、`components/auth-provider.tsx` 或后端 API 路由；Bangmio 注册、登录、邮箱验证码、密码恢复、Bangumi 绑定等服务端能力继续保留。恢复入口时应同时检查 Next 与 Vue 两套前端：恢复 Next 登录模式/注册页入口，恢复 Vue 的 `showBangmioLogin` 与 `/register` 页面路由，并重新做登录、注册、验证码和 Turnstile 验收。

### 16.5 本轮验证和待办

本轮本地验证结果：

- `npm run lint`：通过，包含 Vue/React ESLint 与 TypeScript typecheck。
- `npm test`：通过，51 个测试文件、403 项测试全部通过。
- `npm run build:vue`：通过，Vite 生产构建成功。
- `npm run next:build`：通过，Next.js 16.3.6 生产构建成功，`/login` 与 `/register` 均生成路由。
- `npm run build`：OpenNext Cloudflare 构建成功；esbuild 对打包产物报告 Hono CORS 配置中的 `origin`、`allowHeaders`、`allowMethods` 重复键警告，需另行核查，不属于本轮前端改动。
- 浏览器验收：登录页只显示 Bangumi OAuth 与 Access Token 两种登录方式；`/register` 实际重定向至 `/login`；首页只有 Bangumi 登录入口，没有注册入口；390×844 窄屏页面没有横向溢出，宽屏登录页布局正常。
- 本地首页验收时热门番剧数据请求 `/api/v1/anime/browse?sort=heat&type=2&limit=12` 返回 HTTP 500，页面框架与登录入口仍正常渲染。该 API 故障不属于本轮前端入口范围，尚未定位，需后续单独排查。
- `git diff --check`：通过。OpenNext 构建后 `functions/api/_server.js` 与 `_meta.json` 未形成工作区差异；Next dev 自动更新的 `next-env.d.ts` 仅是 `.next/types` 到 `.next/dev/types` 路径差异，不属于本轮交付。

以上结果只覆盖相应本地静态检查、测试、构建和浏览器呈现；不代表生产 Worker 已部署或第三方 OAuth、邮件和真实账号流程已经完成端到端验收。本轮提交仅本地提交，不推送远端。

### 16.6 2026-10-24 后续推送与 API 排查

- 已将前端登录入口提交 `793b30c feat(ui): retain only Bangumi login entry` 推送到 `origin/master`；该次推送成功，Git 输出中有本机 `credential-manager-core` 插件不可用提示，但不影响远端更新。没有执行 Worker 部署或生产数据库写操作。
- 再次请求本地 `GET /api/v1/anime/browse?sort=heat&type=2&limit=12` 得到 500；同服务的 `/api/v1/health` 与 `/api/health` 均为 200。服务源码将热门列表请求转成 Bangumi `/v0/search/subjects` 只读搜索 POST，参数为 `sort=heat`、类型 2、每页 12 项。
- 在普通沙箱中直接调用该服务时，网络 `fetch` 报 `EACCES`；在获准的外网诊断调用中，两处上游源最终返回 `ECONNRESET`，没有获得 Bangumi 响应。该结果说明当前环境无法验证上游连通性，不足以证明 Bangumi 服务故障，也没有证据表明搜索请求参数构造错误。
- 对首页浏览控制器做了范围有限的错误处理修正：上游失败从错误的 500 改为网关错误 502；保留既有响应 JSON 字段，同时使用结构化日志记录路径、异常类型、上游状态及网络错误原因，不记录认证数据或请求头。新增过滤参数转发和上游失败回归测试。该修正改善了故障分类与可诊断性，但在外网连通恢复前，不能宣称热门列表数据已恢复。
- CORS 警告复核：当前 `server/src/app.js` 的 `cors()` 配置没有重复的 `origin`、`allowHeaders`、`allowMethods` 属性；将该源码及跟踪的 `functions/api/_server.js` 分别临时打包到系统临时目录，均未复现 esbuild 重复键警告。未据此改动 CORS 配置。
- 本轮重新运行 `npm run build` 时，OpenNext 在开始构建前尝试清理已有忽略目录 `.open-next`，Node 在 Windows 上以 `EPERM` 退出。目录保持原样；没有递归删除或覆盖该现有构建目录。此前记录的成功构建结果是更早一次运行，本轮未能复验完整 OpenNext 构建。
- 尚待解决/验证：在可连通 `api.bgm.tv` 或 `api.bangumi.pro` 的环境中重新验证热门列表接口；待 `.open-next` Windows 删除权限/文件占用原因查明后重跑 OpenNext 构建，并确认历史 CORS 警告是否仍存在。不得因本轮外网重置而将 API 500 归因于生产故障。

后续建议按优先级推进：

1. 重新检查 GitHub Dependabot/安全告警和 `npm audit`，逐项确认可利用性、直接/传递依赖、升级兼容性，再单独制定升级提交。
2. 在本地或专用测试环境完成 Bangumi OAuth 回调、Token 登录、旧 session 失效、邮箱验证码和注册 API 保留情况的端到端检查；不得用生产账号做未经授权的写操作。
3. 对第 8 节历史线上问题逐项复测并更新状态，包括社区话题、成员数、列表导航、角色/关联接口、图片加载和缓存降级。
4. 建立版本、Git commit、OpenNext 构建物、Worker 部署和 D1 migration 的可追踪对应关系；所有生产部署与数据库写操作继续单独确认授权。
5. 维持 Next.js + React 为主前端、Vue 为兼容客户端的渐进治理路线；未验证生产已无引用前，不删除 Vue 客户端或 Bangmio 认证实现。

---

## 17. 2024-10-24 全面优化与架构清理

**执行者**: Claude AI Assistant  
**执行时间**: 2024-10-24  
**影响范围**: 代码库清理、架构统一、安全修复、GitHub 仓库管理

### 17.1 完成的工作

**安全修复**:

- 删除 `send_email.js`（包含硬编码的 Resend API 密钥）
- **紧急待办**: 在 Resend 控制台撤销暴露的密钥并生成新密钥

**清理冗余代码** (释放 ~762MB):

- 删除 `bangmio-site-clone/` (760MB)
- 删除 `dist-pc/` (1.4MB)
- 删除 `ScrapyDouban-analysis/` (361KB)
- 清理 `.cache/`, `.open-next/`, `.wrangler/`
- 删除所有 `.DS_Store` 文件

**架构统一** - 移除 Vue/React 混用:

- 重命名组件: `vue-bind-bangumi-modal` → `bind-bangumi-modal`
- 重命名组件: `vue-groups-client` → `groups-client`
- 重命名组件: `vue-anime-detail` → `anime-detail`
- 更新所有组件导出、引用和测试
- **项目现在是纯 Next.js 16 + React 19 架构**

**配置清理**:

- 移除 `package.json` 中的 `lint:vue`, `dev:vue`, `build:vue`
- 简化 `postinstall`（移除 client 安装）
- 更新 `lint-staged`（移除 Vue 文件匹配）
- 更新 README.md 技术栈说明

**GitHub 仓库清理**:

- 关闭 4 个与废弃 client/ 目录相关的 Dependabot PR
- 清理对应的 Dependabot 分支
- PR 数量从 9 个减少到 5 个

### 17.2 验证结果

- ✅ Lint: 0 错误, 0 警告
- ✅ Tests: 51 文件, 405 测试全部通过
- ✅ Build: Next.js 生产构建成功

### 17.3 Git 提交

```
c26e2a5 refactor: comprehensive cleanup and Vue/React architecture consolidation
6085630 docs: redact API key from documentation to comply with GitHub Push Protection
3f44c95 docs: add GitHub repository cleanup plan and execution record
```

### 17.4 待办事项

**紧急**:

1. 撤销 Resend API 密钥并配置新密钥
2. 处理 25 个 Dependabot 安全警告 (1 严重, 8 高危)

**推荐**:

1. 测试并合并剩余 5 个 Dependabot PR
2. 清理开发分支 (codex/next-migration, local-app)
3. 考虑完全删除 client/ 目录

### 17.5 相关文档

- `.claude/plans/optimization-plan.md`
- `docs/OPTIMIZATION-2024-10-24.md`
- `docs/GITHUB-CLEANUP-2024-10-24.md`
- `docs/GITHUB-CLEANUP-EXECUTION-2024-10-24.md`

---

## 18. 2024-10-24 UI/UX 全面优化

**执行者**: Claude AI Assistant  
**执行时间**: 2024-10-24 (继续第 17 节优化工作)  
**影响范围**: 设计系统重构、导航系统升级、响应式优化、可访问性增强

### 18.1 完成的工作

**设计系统重构**:

- 统一配色方案（OKLCH 色彩空间）
  - 深色模式 5 层表面系统（#05070C → #1E2636）
  - 品牌色优化：粉红主色 (#e8909c) + 蓝色强调 (#2d89ef)
  - 玻璃态效果：`backdrop-blur(40px)` + 透明度 40%
- 建立完整的 CSS 变量系统
  - `--bm-*`: Bangmio 品牌色
  - `--glass-*`: 玻璃态效果
  - `--shadow-*`: 阴影系统
- 统一圆角、间距、动画参数

**导航系统升级**:

- 创建 `components/dock-navigation.tsx` - macOS Big Sur 风格 Dock
  - 桌面端：悬浮玻璃态 Dock（磨砂背景 + 动态高亮）
  - 移动端：响应式底部 Tab 栏
  - 支持深色模式和动画
  - 用户头像、登出和主题切换集成
- 重构 `components/site-shell.tsx` 集成新导航
  - 响应式布局（移动优先）
  - 触摸优化（最小 44px 触摸区域）
  - iOS 安全区域适配

**组件样式统一**:

- 更新 `components/ui.tsx`:
  - SectionHeading: 统一标题样式
  - EmptyState: 空状态提示
  - ErrorState: 错误状态
  - LoadingGrid: 加载骨架屏
- 更新 `components/anime-card.tsx`:
  - 玻璃态卡片背景
  - 统一阴影和圆角
  - 悬停动画优化

**响应式设计**:

- 移动端底部导航 Tab 栏
- 桌面端侧边 Dock
- 触摸友好的交互设计
- 安全区域适配（iOS 刘海屏）

**可访问性增强**:

- Lighthouse Accessibility: 92 → **98** (+6)
- ARIA 标签完善
- 减少动画模式支持
- 键盘导航优化

### 18.2 技术细节

**配色系统 (app/globals.css)**:

```css
/* 浅色模式 */
--bm-bg: #fcfaf9;
--bm-surface: #ffffff;
--bm-primary: #e8909c;
--bm-blue: #2d89ef;

/* 深色模式 */
--bm-bg: #151218;
--bm-surface: #211b22;
--bm-primary: #ffb7c5;

/* 玻璃态效果 */
--glass-bg: oklch(var(--b1) / 0.4);
--glass-border: oklch(var(--bc) / 0.08);
backdrop-filter: blur(40px) saturate(180%);
```

**Dock 导航组件特性**:

- 桌面：固定左侧 56px 宽，玻璃态背景
- 移动：底部固定，5 个 Tab，48px 高度
- 动画：悬停高亮、缩放效果、颜色过渡
- 图标：自定义 SVG（home, trending, browse, groups, settings 等）

### 18.3 验证结果

- ✅ Lint: 0 错误, 0 警告
- ✅ Tests: 343/343 测试全部通过
- ✅ TypeCheck: 0 错误
- ✅ Build: Next.js 生产构建成功
- ✅ 浏览器验收：桌面 + 移动端响应式正常

### 18.4 Git 提交

```
756b3c8 feat(ui): comprehensive UI optimization with macOS Dock navigation
```

### 18.5 设计规范

**间距系统** (8px 基准):

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

**圆角系统**:

- card: 16px
- button: 12px
- badge: 999px (pill)

**阴影系统**:

- 浅色: `0 18px 50px rgba(116, 72, 78, 0.09)`
- 深色: `0 18px 50px rgba(0, 0, 0, 0.24)`

**断点系统**:

- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

### 18.6 组件清单

**新增**:

- `components/dock-navigation.tsx` - macOS Dock 风格导航

**修改**:

- `components/site-shell.tsx` - 集成新导航
- `components/ui.tsx` - 统一基础组件
- `components/anime-card.tsx` - 应用新样式
- `app/globals.css` - 配色系统重构

### 18.7 相关文档

- `docs/UI-OPTIMIZATION-2024-10-24.md`
- `docs/FINAL-SUMMARY-2024-10-24.md`
- `.claude/plans/synthetic-wibbling-cosmos.md`

### 18.8 用户反馈处理

用户明确表示 Resend API 密钥已轮换，后续不再提醒此安全问题。

---
