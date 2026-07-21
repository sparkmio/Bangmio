# Tasks

- [x] Task 1: 重写 server/src/routes/groups.js 多源抓取与缓存
  - [x] 实现 fetchHTMLWithRetry(urls, timeout) 工具函数，支持多 URL 顺序重试
  - [x] 将兜底列表 FALLBACK_GROUPS 精简为 8 个高活跃真实小组
  - [x] 实现 5 分钟内存缓存（getCached / setCache）
  - [x] 重写 GET /groups：优先抓取真实小组列表，解析失败则返回兜底列表
  - [x] 重写 GET /groups/:id：多源抓取详情，失败时返回含 name/url/topics[] 的兜底对象
  - [x] 优化 HTML 解析器，匹配 Bangumi 当前 DOM 结构

- [x] Task 2: 优化 client/src/views/Groups.vue UI 与交互
  - [x] 小组卡片圆角改为 rounded-xl，hover 改为 shadow-hover
  - [x] 搜索按钮点击时支持服务端兜底搜索（新增 /groups/search 调用）
  - [x] 搜索框空值时恢复全量列表
  - [x] 无结果时展示明确提示和「前往 Bangumi 小组首页」链接
  - [x] 骨架屏与卡片样式统一

- [x] Task 3: 优化 client/src/views/GroupDetail.vue UI 与空状态
  - [x] 小组信息卡片圆角改为 rounded-xl，阴影更柔和
  - [x] 最近话题列表为空时展示「暂无抓取到话题」+ 原站链接
  - [x] 每个话题右侧增加「→」图标提示可跳转
  - [x] 加载失败时显示「前往 Bangumi 查看原小组」链接

- [x] Task 4: 按需更新 client/src/api/endpoints.js
  - [x] 在 groupAPI 中新增 search(keyword) 方法（调用 /api/v1/groups/search）
  - [x] 如未新增搜索端点，则确保 getList / getDetail 仍正常工作

- [x] Task 5: 构建并部署验证
  - [x] 运行 npm run build 确认无报错
  - [x] 部署到 Cloudflare Pages
  - [x] 验证小组列表页可加载
  - [x] 验证小组详情页可加载
  - [x] 验证搜索和兜底状态正常

# Task Dependencies

- Task 2, 3, 4 依赖 Task 1（服务端 API 先行）
- Task 5 依赖所有前置任务完成
