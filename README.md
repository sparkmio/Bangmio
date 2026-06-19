# Bangmio

Bangumi (bgm.tv) 第三方客户端。支持 OAuth 登录、动画浏览与搜索、新番时间表、收藏管理、吐槽箱与讨论版查看。

**网站**：https://bangmio.pages.dev

## 关于

半个作者的碎碎念(还有半个是AI)

**这是一个高中生好玩做的 VibeCoding 项目**，主要是用 DeepSeek V4 Pro 和 MiMo-V2.5-Pro 做的，用了快 2亿 tokens，要不是 Deepseek 便宜根本负担不起......

本项目使用了 [Bangumi](https://bgm.tv) 的 API，前端用了 Vue 3 + Vite ，还通过网页抓取解决了吐槽版和讨论版之类的小问题，还顺手通过cloudflare的边缘节点解决了国内无法正常访问的问题。国内没啥合适的平台所以部署在 Cloudflare Pages，不限带宽，全球 CDN 加速。因为cf速度太慢，所以替换了部分接口改为桜色大佬做的镜像站bangumi.one(详见https://bgm.tv/group/topic/462456)

这是一个几乎不懂 CSS 的人用 AI 做的网站，各位可以提出批评，但也别骂的太狠。也感谢 Bangumi 现在还活着，给我提供了一个这么全的数据库，只让我做了点前端工作。**这个项目虽然没啥人关注，但我会尽我所能持续进行维护和更新。**

## 原版功能（均为[Bangumi](https://bgm.tv)原版提供）

- **OAuth 登录** — 一键登录或手动粘贴 Access Token
- **新番时间表** — 周一至周日每日播出一览
- **收藏管理** — 想看/在看/看过/搁置/弃番，支持评分和短评
- **番剧/游戏/书籍/音乐详情** — 评分分布、收藏统计、制作人员、角色、相关条目
- **吐槽箱** — 角色页嵌入式展示，番剧/人物页独立子页面
- **讨论版** — 番剧讨论帖列表 + 帖子详情
- **人物/角色详情** — 完整信息展示、参与作品、声优/关联人物、吐槽箱

## 特色功能（自己做的新功能）

- **豆瓣评分**—一站式查看多平台信息，不用多头跑
- **相关音乐**—一键跳转该番剧/游戏有关的音乐，不用到处找
- **萌娘百科**—链接萌娘百科，查看更全的番剧简介
- **在线观看**—链接第三方番剧在线观看网站，一键跳转在线观看

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Pinia + TailwindCSS + DaisyUI + GSAP |
| 后端 | Hono（Cloudflare Pages Functions） |
| API | 代理 Bangumi API v0 + 网页抓取 |
| 部署 | Cloudflare Pages |

## 相关链接

- 网站：https://bangmio.pages.dev
- GitHub：https://github.com/sparkmio/Bangmio
- 作者 Bangumi 主页：https://bgm.tv/user/acgpzh