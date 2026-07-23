# Checklist

## 收藏状态自动修改 bug

- [x] `server/src/routes/collection.js` 的 `POST /:animeId` 不再在 status 未提供时自动设置 `type=3`
- [x] 仅更新评分/评论且已有收藏时，状态保持原值不变
- [x] 仅更新评分/评论且未收藏时，返回 400 提示"请先选择收藏状态"
- [x] 相关测试用例覆盖以上两种场景

## 登录人机验证

- [x] `server/src/utils/turnstile.js` 在 siteverify 网络异常时降级放行并记录日志
- [x] `client/src/views/Login.vue` 展示具体 Turnstile 失败原因
- [x] Turnstile widget 域名配置包含 bangmio.site、www.bangmio.site、bangmio.pages.dev

## 小组功能

- [x] `server/src/routes/groups.js` 返回降级数据时附带 `degraded: true` 标识
- [x] `client/src/views/Groups.vue` 根据 `degraded` 显示"部分数据为兜底展示"提示
- [x] `client/src/views/GroupDetail.vue` 占位数据显示"小组信息暂不可用"并提供原站链接
- [x] `functions/api/_server.js` 包含最新 groups 逻辑

## 邮件发送者与主题

- [x] `wrangler.toml` 的 `RESEND_FROM` 为 `Bangmio <signup@bangmio.site>`
- [x] `server/src/services/auth.js` 邮件主题为 `Bangmio验证码是{code}`
- [x] `server/src/utils/email.js` 的 `DEFAULT_FROM` 为 `Bangmio <signup@bangmio.site>`

## 注册页说明

- [x] `client/src/views/Register.vue` 顶部显示"Bangmio 账户处在测试阶段，推荐使用 Bangumi 直登"提示
- [x] 提示条含跳转 Bangumi 直登的链接

## 忘记密码

- [x] `/forgot-password` 路由已注册且页面可访问
- [x] `/reset-password` 路由已注册且页面可访问
- [x] `client/src/stores/auth.js` 有 `forgotPassword` / `resetPassword` actions
- [x] Login.vue 有"忘记密码？"入口链接

## 测试与构建

- [x] `npm test` 全部通过
- [x] `npm run lint` 无错误
- [x] client 构建成功
- [x] server 构建成功
- [x] `functions/api/_server.js` 已重新生成

## 部署

- [x] 变更已提交并推送
- [x] Cloudflare Pages 部署成功
