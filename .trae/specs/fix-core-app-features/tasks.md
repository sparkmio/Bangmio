# Tasks

- [ ] Task 1: 登录功能修复
  - [ ] SubTask 1.1: 在 `stores/auth.js` 的登录 action 中，提交开始时清空 `error`
  - [ ] SubTask 1.2: 登录成功后、跳转前再次清空 `error`
  - [ ] SubTask 1.3: 在 `Login.vue` 中 Tab 切换与输入变化时清空 `auth.error`
  - [ ] SubTask 1.4: 对后端异常响应（无 token / 格式错误）给出明确错误提示

- [ ] Task 2: 小组功能修复
  - [ ] SubTask 2.1: 在 `server/src/routes/groups.js` 增加顶层防御性异常处理，异常时返回本地兜底小组数据
  - [ ] SubTask 2.2: 优化 `server/src/utils/http.js` 的 `fetchHTMLMulti`，支持并发择优与单源失败重试
  - [ ] SubTask 2.3: 在 `Groups.vue` 区分网络错误、服务异常、数据为空、占位数据四种状态
  - [ ] SubTask 2.4: 在 `GroupDetail.vue` 对占位数据（`name === id`）显示“小组信息暂不可用”并提供 Bangumi 原站链接

- [ ] Task 3: 外部数据加载优化
  - [ ] SubTask 3.1: 改造 `http.js`：`fetchHTMLMulti` 支持整体超时 + 并发择优，单源失败时支持一次重试
  - [ ] SubTask 3.2: 调整 `IframeEmbed.vue` 超时策略（首次 10s、重试 15s），超时后自动触发 `fallback` 事件
  - [ ] SubTask 3.3: 优化 `server/src/routes/douban.js` 与 `server/src/routes/moegirl.js`，缩短反爬/超时场景响应时间，优先返回带直达链接的降级 HTML
  - [ ] SubTask 3.4: 调整 `ExternalEmbedFallback.vue` 对“加载超时”给出明确文案和重试入口

- [ ] Task 4: 音乐卡片嵌入式播放改造
  - [ ] SubTask 4.1: 新增服务端 `server/src/services/music.js`，按名称搜索网易云音乐并返回候选曲目
  - [ ] SubTask 4.2: 新增服务端路由 `server/src/routes/music.js`，暴露 `/api/v1/music/search?q=`
  - [ ] SubTask 4.3: 在服务端入口注册 `/api/v1/music` 路由
  - [ ] SubTask 4.4: 新增 `MusicCard.vue` 组件：卡片展示、点击嵌入网易云播放器 iframe、支持播放/暂停
  - [ ] SubTask 4.5: 在 `Detail.vue` 音乐 Tab 中使用 `MusicCard` 卡片网格，保留网易云/B站搜索降级入口

- [ ] Task 5: 移动端竖屏 UI 更新
  - [ ] SubTask 5.1: 调整 `App.vue` / `Navbar.vue` / `Sidebar.vue`：小屏移除侧边栏空白，底部导航增加“小组”入口，增加 `env(safe-area-inset-bottom)` 适配
  - [ ] SubTask 5.2: 优化 `Home.vue` 竖屏布局：在追列表与详情面板上下堆叠，增大列表项点击区域
  - [ ] SubTask 5.3: 优化 `Watching.vue` 竖屏布局：收藏列表与详情面板上下堆叠，剧集按钮适配小屏宽度
  - [ ] SubTask 5.4: 优化 `Profile.vue` 竖屏布局：主栏与侧边栏堆叠，统计卡片保持 2 列，收藏封面横向滚动适配
  - [ ] SubTask 5.5: 优化 `Detail.vue` 竖屏布局：Hero 区域垂直居中、Tab bar 横向滚动、音乐/评分/豆瓣卡片单列展示
  - [ ] SubTask 5.6: 调整 `main.css` / `tailwind.config.js` 的 `anime-grid` 与间距 token，优化 xs 屏幕显示

- [ ] Task 6: 测试与验证
  - [ ] SubTask 6.1: 运行 `npm test` 并确保通过
  - [ ] SubTask 6.2: 运行 `npm run lint` 并修复错误
  - [ ] SubTask 6.3: 本地启动客户端与服务端，手动验证登录、小组、豆瓣/萌娘百科嵌入、音乐卡片、移动端竖屏布局

- [ ] Task 7: 提交与部署
  - [ ] SubTask 7.1: 整理变更文件，编写清晰的 commit message
  - [ ] SubTask 7.2: 提交并推送到远程仓库
  - [ ] SubTask 7.3: 触发并验证 Cloudflare Pages 部署

# Task Dependencies

- Task 2 depends on Task 3（HTTP 工具优化）的部分 SubTask 3.1
- Task 4 depends on SubTask 4.1, 4.2, 4.3
- Task 5 与 Task 1-4 可并行
- Task 6 depends on Task 1-5
- Task 7 depends on Task 6
