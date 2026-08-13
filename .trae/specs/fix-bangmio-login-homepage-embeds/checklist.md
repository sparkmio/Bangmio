# Checklist

## Bangmio 登录后功能修复

- [x] `client/src/stores/auth.js` 新增 `bgmProfileError` 和 `bgmProfileLoading` 状态
- [x] `fetchBgmUserProfile` 失败时设置 `bgmProfileError = true`，成功时清空
- [x] `checkAuth` 中对 `bgmUserProfile` 为空的情况有重试逻辑（最多 2 次）
- [x] `client/src/views/Profile.vue` 在 `bgmProfileLoading` 时显示加载中
- [x] `client/src/views/Profile.vue` 在 `bgmProfileError` 时显示重试按钮
- [x] `client/src/views/Watching.vue` 获取 username 有 fallback 逻辑
- [x] `client/src/views/Watching.vue` 无可用 username 时不崩溃，显示提示

## 未登录首页优化

- [x] `client/src/views/Home.vue` 未登录时显示欢迎区块（Hero section）
- [x] 欢迎区块含登录/注册按钮
- [x] "热门新番"区块对所有用户可见

## 小组/豆瓣/萌娘百科修复

- [x] `server/src/utils/http.js` `fetchHTML` 默认超时为 12000ms
- [x] `server/src/utils/http.js` `fetchHTMLMulti` 整体超时为 18000ms
- [x] `server/src/routes/douban.js` `/page` 超时为 10000ms
- [x] `client/src/components/IframeEmbed.vue` 首次超时为 15000ms，重试后 20000ms
- [x] `client/src/views/Groups.vue` `degraded` 时不显示"服务暂不可用"，改为温和提示
- [x] `functions/api/_server.js` 包含最新超时参数

## 测试与构建

- [x] `npm test` 全部通过
- [x] `npm run lint` 无错误
- [x] `npm run server:build` 成功
- [x] `cd client && npm run build` 成功
