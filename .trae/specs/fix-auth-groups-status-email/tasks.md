# Tasks

- [x] Task 1: 收藏状态自动修改 bug 修复
  - [x] SubTask 1.1: 修改 `server/src/routes/collection.js` 的 `POST /:animeId`：当 `body.status` 未提供时，不再在 catch 中强行 `payload.type = 3`；若查询当前状态失败（404），返回 400 提示"请先选择收藏状态"
  - [x] SubTask 1.2: 仅当 `body.status` 显式提供且 `>= 1` 时才设置 `payload.type`
  - [x] SubTask 1.3: 更新或新增 `server/src/routes/collection.test.js` 中相关测试用例

- [x] Task 2: 登录人机验证修复
  - [x] SubTask 2.1: 修改 `server/src/utils/turnstile.js`：siteverify fetch 抛出网络异常时降级返回 `{ success: true, skipped: true, reason: 'network-error' }` 并记录日志，仅在响应体明确 `success: false` 时拒绝
  - [x] SubTask 2.2: 修改 `client/src/views/Login.vue`：Turnstile error-callback 时展示具体原因；登录失败时若后端返回的人机验证错误包含 errorCodes 则透传展示
  - [x] SubTask 2.3: 确认 `wrangler.toml` / Cloudflare Pages 环境变量中 `TURNSTILE_SITE_KEY` 与 `TURNSTILE_SECRET_KEY` 配置正确，且 widget 域名包含 `bangmio.site`、`www.bangmio.site`、`bangmio.pages.dev`

- [x] Task 3: 小组功能修复
  - [x] SubTask 3.1: 修改 `server/src/routes/groups.js`：列表/详情返回时附带 `degraded` 字段标识是否为兜底数据
  - [x] SubTask 3.2: 修改 `client/src/views/Groups.vue`：根据 `degraded` 字段显示"部分数据为兜底展示"提示，而非笼统"服务暂不可用"
  - [x] SubTask 3.3: 修改 `client/src/views/GroupDetail.vue`：占位数据时显示"小组信息暂不可用"并提供 Bangumi 原站链接（已有则确认）
  - [x] SubTask 3.4: 重新构建 `functions/api/_server.js` 确保线上部署包含最新 groups 逻辑

- [x] Task 4: 邮件发送者与主题改造
  - [x] SubTask 4.1: 修改 `wrangler.toml`：`RESEND_FROM` 改为 `Bangmio <signup@bangmio.site>`
  - [x] SubTask 4.2: 修改 `server/src/services/auth.js` 的 `sendVerificationCode`：subject 改为 `Bangmio验证码是${code}`（注册与重置均适用）
  - [x] SubTask 4.3: 修改 `server/src/utils/email.js` 的 `DEFAULT_FROM` 改为 `Bangmio <signup@bangmio.site>` 作为兜底

- [x] Task 5: 注册页测试阶段说明
  - [x] SubTask 5.1: 修改 `client/src/views/Register.vue`：表单顶部新增提示条"Bangmio 账户处在测试阶段，推荐使用 Bangumi 直登"，含跳转 `/login` 链接

- [x] Task 6: 忘记密码端到端确认
  - [x] SubTask 6.1: 确认 `client/src/router/index.js` 已注册 `/forgot-password` 与 `/reset-password` 路由
  - [x] SubTask 6.2: 确认 `client/src/views/ForgotPassword.vue` 与 `ResetPassword.vue` 存在且功能完整
  - [x] SubTask 6.3: 确认 `client/src/stores/auth.js` 有 `forgotPassword` / `resetPassword` actions

- [x] Task 7: 测试与验证
  - [x] SubTask 7.1: 运行 `npm test` 确保通过
  - [x] SubTask 7.2: 运行 `npm run lint` 确保无错误
  - [x] SubTask 7.3: 运行 `npm run build`（client + server）确保构建成功
  - [x] SubTask 7.4: 重新生成 `functions/api/_server.js` 确保线上部署包含所有最新后端逻辑

- [x] Task 8: 提交与部署
  - [x] SubTask 8.1: 提交变更并推送
  - [x] SubTask 8.2: 验证 Cloudflare Pages 部署成功

# Task Dependencies

- Task 2 与 Task 3 可并行
- Task 4 与 Task 5 可并行
- Task 6 依赖 Task 4（邮件改造影响忘记密码流程）
- Task 7 依赖 Task 1-6
- Task 8 依赖 Task 7
