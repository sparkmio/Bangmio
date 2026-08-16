# Bangmio

Bangumi (bgm.tv) 第三方客户端。支持 OAuth 登录、动画浏览与搜索、收藏管理、吐槽箱与讨论版查看。

**网站**：https://bangmio.site （终于买上域名了）

## 关于

作者的碎碎念

**这是一个高中生好玩做的 VibeCoding 项目**，主要是用 DeepSeek V4 Pro 和 MiMo-V2.5-Pro 做的（二遍：改用glm5.2和kimi2.7code了），用了快 2亿 tokens（二遍：早就用了十亿tokens了），要不是 Deepseek 便宜根本负担不起......

本项目使用了 [Bangumi](https://bgm.tv) 的 API，前端用了 Vue 3 + Vite 。国内没啥合适的平台所以部署在 Cloudflare Pages。因为国内已经访问不了bangumi的域名了，所以替换了部分接口改为桜色大佬做的镜像站bangumi.lol(详见https://bgm.tv/group/topic/462456)

这是一个几乎不懂 CSS 的人用 AI 做的网站，各位可以提出批评，但也别骂的太狠。也感谢 Bangumi 现在还活着，给我提供了一个这么全的数据库，只让我做了点前端工作。**这个项目虽然没啥人关注，但我会尽我所能持续进行维护和更新。**

二遍：拿这个作品去参加trae的大赛，结果连top2000都没进，感觉没啥好搞的了

## 原版功能（均为[Bangumi](https://bgm.tv)原版提供）

- **OAuth 登录** — 一键登录或手动粘贴 Access Token
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

| 层   | 技术                                                |
| ---- | --------------------------------------------------- |
| 前端 | Vue 3 + Vite + Pinia + TailwindCSS + DaisyUI + GSAP |
| 后端 | Hono（Cloudflare Pages Functions）                  |
| API  | 代理 Bangumi API v0 + 网页抓取第三方平台            |
| 部署 | Cloudflare Pages                                    |

## Cloudflare Pages OAuth 配置

生产环境的 Bangumi OAuth 需要在 Cloudflare Pages 项目 `bangmio` 的 **Settings → Variables and Secrets → Production** 中配置：

- `BGM_APP_SECRET`：从 Bangumi OAuth 应用复制的 Secret，类型选择 **Secret**（必填）；
- `BGM_APP_ID`：可选，默认使用仓库中的公开 App ID；如果填写，必须和 `BGM_APP_SECRET` 属于同一个 OAuth 应用；
- `OAUTH_REDIRECT_URI`：`https://bangmio.site/login/callback`，必须与 Bangumi 应用后台完全一致。

修改 Production 变量后请重新部署一次，再从 `https://bangmio.site` 发起登录。不要使用 `www` 或 `pages.dev` 地址测试 OAuth。授权返回后如果仍失败，页面会区分显示：配置错误、回调地址/授权码错误，或 Bangumi 上游暂时不可用。

## 自动发布 Release

项目通过 GitHub Actions 自动创建 Release。发布前先把 `package.json` 中的版本号更新为目标版本并提交，然后创建并推送同名的语义化版本标签，例如：

```bash
git tag v1.1.0
git push origin v1.1.0
```

标签版本必须与 `package.json` 的 `version` 完全一致。发布管线会依次执行 Lint、测试和生产构建，再由 `scripts/release-notes.mjs` 按 Conventional Commits 自动整理更新日志并创建 GitHub Release。`feat`、`fix`、`security`、`docs` 等提交会分别归类，并附带对应提交链接。

本地可以提前预览将要发布的更新日志：

```bash
npm run release:notes -- --from v1.0.0 --to HEAD
```

如果仓库还没有语义化版本标签，可以省略 `--from`，脚本会从仓库最早的提交开始生成。

## 相关链接

- 网站：https://bangmio.site
- GitHub：https://github.com/sparkmio/Bangmio
- 作者 Bangumi 主页：https://bgm.tv/user/acgpzh
