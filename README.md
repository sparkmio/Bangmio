# Bangmio

Bangumi (bgm.tv) 第三方客户端。支持 OAuth 登录、动画浏览与搜索、新番时间表、收藏管理、吐槽箱与讨论版查看。

## 功能

- **OAuth / Token 双登录** — 扫码授权或手动粘贴 Access Token
- **动画浏览** — 按热度、标签、类型筛选番剧，支持搜索和分页
- **新番时间表** — 周一至周日每日播出一览（类似 B 站时间表样式）
- **收藏管理** — 想看/在看/看过/搁置/弃番，支持评分和短评
- **番剧详情** — 评分分布、收藏统计、制作人员、角色（主角/配角排序）、相关条目
- **吐槽箱** — 角色页嵌入式展示，番剧/人物页独立子页面
- **讨论版** — 番剧讨论帖列表 + 帖子详情（含回复和子回复）
- **人物/角色详情** — 完整信息展示、参与作品、声优/关联人物、吐槽箱
- **暗色/浅色模式**

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | Vue 3 + Vite + Pinia + TailwindCSS |
| 后端 | Node.js + Express |
| API | 代理 Bangumi API v0 + 网页抓取 |

## 本地开发

```bash
# 安装依赖
cd client && npm install
cd ../server && npm install

# 启动（同时运行前端和后端）
cd .. && npm run dev
```

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

## Bangumi 开放平台配置

1. 访问 https://bgm.tv/dev/app 创建应用
2. **回调地址**设置为：
   - **本地开发**：`http://localhost:5173/login/callback`
   - **GitHub Pages 生产**：`https://sparkmio.github.io/Bangmio/login/callback`（需先部署后端）

## 部署

### GitHub Pages（仅前端）

推送后自动通过 GitHub Actions 构建并部署到 `https://sparkmio.github.io/Bangmio/`。

**注意**：GitHub Pages 只能托管静态文件。后端需单独部署到 Railway/Render 等平台，然后在 `client/src/api/index.js` 修改 `baseURL` 指向后端地址。

### 后端部署

```bash
# 推荐 Railway/Render 一键部署
cd server
npm start
```

## 项目结构

```
Bangmio/
├── client/           # Vue 3 前端
│   ├── src/
│   │   ├── api/      # API 调用
│   │   ├── components/ # 通用组件
│   │   ├── stores/   # Pinia 状态管理
│   │   ├── views/    # 页面组件
│   │   └── router/   # 路由配置
│   └── public/       # 静态资源
├── server/           # Express 后端
│   └── src/
│       ├── routes/   # API 路由
│       ├── controllers/ # 控制器
│       └── services/ # Bangumi API 服务
└── .github/workflows/ # CI/CD
```
