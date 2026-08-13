# Tasks

- [x] Task 1: 修复 auth store 中 fetchBgmUserProfile 的静默失败问题
  - [x] 1.1: 新增 `bgmProfileError` ref 和 `bgmProfileLoading` ref
  - [x] 1.2: `fetchBgmUserProfile` 失败时设置 `bgmProfileError = true`，成功时清空
  - [x] 1.3: `checkAuth` 中若 `bgmUserProfile` 为空且有 `bgmUid`，重试拉取（最多 2 次，间隔 1s）
  - [x] 1.4: 导出 `bgmProfileError`、`bgmProfileLoading` 供页面使用

- [x] Task 2: Profile.vue 适配 effectiveUser 为空的情况
  - [x] 2.1: 当 `bgmProfileLoading` 为 true 时显示加载中状态
  - [x] 2.2: 当 `bgmProfileError` 为 true 时显示错误提示 + 重试按钮
  - [x] 2.3: 重试按钮调用 `auth.fetchBgmUserProfile()` 后重新 `loadProfile()`

- [x] Task 3: Watching.vue 适配 effectiveUser 为空的情况
  - [x] 3.1: 获取 username 时增加 fallback：`effectiveUser?.username || bangmioUser?.bgmUid`
  - [x] 3.2: 当无可用 username 时显示"正在获取 Bangumi 资料..."提示，不发送 API 请求

- [x] Task 4: Home.vue 未登录欢迎区块
  - [x] 4.1: 在 `v-if="auth.isLoggedIn"` 的"在追"区块前，新增 `v-else` 欢迎区块
  - [x] 4.2: 欢迎区块含 Bangmio 品牌名、简短介绍、登录/注册按钮
  - [x] 4.3: 下方"热门新番"区块保持对所有用户可见

- [x] Task 5: 调整外部嵌入超时参数
  - [x] 5.1: `server/src/utils/http.js` 中 `fetchHTML` 默认超时从 8000 改为 12000
  - [x] 5.2: `server/src/utils/http.js` 中 `fetchHTMLMulti` 整体超时从 12000 改为 18000
  - [x] 5.3: `server/src/routes/douban.js` 中 `/page` 超时从 6000 改为 10000
  - [x] 5.4: `client/src/components/IframeEmbed.vue` 首次超时从 10000 改为 15000，重试后 20000

- [x] Task 6: 优化小组前端降级提示
  - [x] 6.1: `client/src/views/Groups.vue` 在 `degraded` 为 true 时不显示"服务暂不可用"错误，改为温和提示条
  - [x] 6.2: 确保 `degraded` 数据仍正常渲染小组列表

- [x] Task 7: 构建与验证
  - [x] 7.1: `npm test` 全部通过
  - [x] 7.2: `npm run lint` 无错误
  - [x] 7.3: `npm run server:build` 成功且 `functions/api/_server.js` 已更新
  - [x] 7.4: `cd client && npm run build` 成功

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 7 depends on all other tasks
