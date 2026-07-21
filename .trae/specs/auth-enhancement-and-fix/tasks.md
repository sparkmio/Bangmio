# Tasks

## 阶段一：登录人机验证（需求 1）

- [x] Task 1: 前端 Login.vue Bangmio Tab 加入 Turnstile widget
  - [x] 1.1 复用 Register.vue 的 `loadTurnstile` / `renderTurnstile` / `resetTurnstile` 逻辑
  - [x] 1.2 表单提交时携带 `captchaToken`，错误后重置 widget
  - [x] 1.3 未配置 `VITE_TURNSTILE_SITE_KEY` 时不渲染 widget，登录按钮可用
- [x] Task 2: 后端 `POST /auth/login` 增加 Turnstile 校验
  - [x] 2.1 仅在 `TURNSTILE_SECRET_KEY` 已配置时强制校验
  - [x] 2.2 校验失败返回 400「人机验证失败，请重试」
  - [x] 2.3 更新 auth.test.js 中 loginUser 相关用例适配（如需）

## 阶段二：密码管理（需求 2a 修改密码）

- [x] Task 3: 后端新增 `updateUserPassword` 数据访问层
  - [x] 3.1 在 `server/src/db/users.js` 实现 `updateUserPassword(db, id, passwordHash, salt)`
  - [x] 3.2 SQL: `UPDATE users SET password_hash=?, salt=?, updated_at=? WHERE id=?`
  - [x] 3.3 更新失败抛出 Error
- [x] Task 4: 后端 service 层新增 `changeUserPassword`
  - [x] 4.1 在 `server/src/services/auth.js` 实现 `changeUserPassword(db, env, userId, currentPassword, newPassword)`
  - [x] 4.2 流程：查用户 → verifyPassword(currentPassword) → 失败抛 400「原密码错误」 → 生成新 salt + hash → updateUserPassword
  - [x] 4.3 newPassword 长度 < 8 抛 400「新密码至少 8 位」
- [x] Task 5: 后端新增 `POST /auth/change-password` 路由
  - [x] 5.1 在 `server/src/routes/auth.js` 实现，使用 `jwtAuth()` 中间件
  - [x] 5.2 Body: `{ currentPassword, newPassword }`
  - [x] 5.3 成功返回 `{ data: { success: true } }`
  - [x] 5.4 加入速率限制（5 次/分钟，与 register/login 同级）
- [x] Task 6: 前端 Settings.vue 新增「账号安全」卡片
  - [x] 6.1 仅 `auth.isBangmioUser` 为 true 时显示
  - [x] 6.2 表单：原密码 / 新密码 / 确认新密码
  - [x] 6.3 前端校验：新密码 ≥ 8 位、两次一致
  - [x] 6.4 调用 `auth.changePassword(currentPassword, newPassword)`
  - [x] 6.5 成功提示「密码已更新」，清空表单
- [x] Task 7: auth store 新增 `changePassword` action
  - [x] 7.1 调用 `POST /auth/change-password`
  - [x] 7.2 错误信息写入 `auth.error`
- [x] Task 8: 单元测试覆盖 changeUserPassword
  - [x] 8.1 原密码错误抛 400
  - [x] 8.2 新密码 < 8 抛 400
  - [x] 8.3 正确流程：updateUserPassword 被调用、参数为新 hash + salt

## 阶段三：密码管理（需求 2b 忘记密码）

- [x] Task 9: 后端新增 `POST /auth/forgot-password` 路由
  - [x] 9.1 Body: `{ email, captchaToken }`
  - [x] 9.2 Turnstile 校验（未配置时跳过）
  - [x] 9.3 邮箱不存在时静默返回 200（防探测）
  - [x] 9.4 邮箱存在时调用 `sendVerificationCode(db, env, { email, purpose: 'reset' })`
  - [x] 9.5 加入严格速率限制（5 次/分钟）
- [x] Task 10: 后端 service 层新增 `resetUserPassword`
  - [x] 10.1 在 `server/src/services/auth.js` 实现
  - [x] 10.2 流程：verifyCode(email, code, 'reset') → 失败抛 400「验证码错误或已过期」 → 生成新 salt + hash → updateUserPassword
  - [x] 10.3 newPassword < 8 抛 400
- [x] Task 11: 后端新增 `POST /auth/reset-password` 路由
  - [x] 11.1 Body: `{ email, code, newPassword }`
  - [x] 11.2 调用 `resetUserPassword`，成功返回 `{ data: { success: true } }`
- [x] Task 12: 前端新建 ForgotPassword.vue
  - [x] 12.1 表单：邮箱 + Turnstile + 发送验证码按钮（60 秒倒计时）
  - [x] 12.2 发送成功后跳转 `/reset-password?email=xxx`
  - [x] 12.3 提示「如果该邮箱已注册，验证码已发送」（无论是否真的发送）
- [x] Task 13: 前端新建 ResetPassword.vue
  - [x] 13.1 从 query 读取 email
  - [x] 13.2 表单：验证码 + 新密码 + 确认密码
  - [x] 13.3 调用 `auth.resetPassword(email, code, newPassword)`
  - [x] 13.4 成功后跳转 `/login` 并提示「密码已重置，请登录」
- [x] Task 14: 路由 + Login.vue 链接
  - [x] 14.1 router 新增 `/forgot-password` 和 `/reset-password` 路由
  - [x] 14.2 Login.vue Bangmio Tab 密码框下方加「忘记密码？」链接 → `/forgot-password`
- [x] Task 15: auth store 新增 `forgotPassword` / `resetPassword` actions
  - [x] 15.1 `forgotPassword(email, captchaToken)` 调用 `/auth/forgot-password`
  - [x] 15.2 `resetPassword(email, code, newPassword)` 调用 `/auth/reset-password`
- [x] Task 16: 单元测试覆盖 resetUserPassword
  - [x] 16.1 验证码错误抛 400
  - [x] 16.2 新密码 < 8 抛 400
  - [x] 16.3 正确流程：updateUserPassword 被调用

## 阶段四：账号绑定与个人页故障修复（需求 3a + 3b）

- [x] Task 17: auth store 新增 `bgmUserProfile` state 与 `fetchBgmUserProfile` action
  - [x] 17.1 `bgmUserProfile` 初始从 localStorage `bgm_user_profile` 读取
  - [x] 17.2 `fetchBgmUserProfile()` 调用 `/api/v1/user/me`，成功后写入 state + localStorage
  - [x] 17.3 失败时静默（不影响主流程）
- [x] Task 18: 在绑定/登录流程中自动拉取 bgmUserProfile
  - [x] 18.1 `bindBangumi(token)` 成功后调用 `fetchBgmUserProfile()`
  - [x] 18.2 `oauthBindBangumi(code, state)` 成功后调用 `fetchBgmUserProfile()`
  - [x] 18.3 `checkAuth()` 检测 `bgmioUser.bgmUid` 存在但 `bgmUserProfile` 为空时自动拉取
- [x] Task 19: auth store 新增 `effectiveUser` computed
  - [x] 19.1 Bangmio 用户返回 `bgmUserProfile`
  - [x] 19.2 Bangumi 直登用户返回 `user`
  - [x] 19.3 都没有返回 null
- [x] Task 20: 修改 Profile.vue 使用 effectiveUser
  - [x] 20.1 `currentUsername` 改用 `auth.effectiveUser?.username`
  - [x] 20.2 `loadProfile()` 中 `profileUser.value = auth.user` 改为 `auth.effectiveUser`
- [x] Task 21: 修改其他番剧功能页面使用 effectiveUser
  - [x] 21.1 全局搜索 `auth.user` 用法，识别需要改的位置（Watching.vue / Home.vue / Detail.vue 等）
  - [x] 21.2 将与登录态判断相关的位置改为 `auth.effectiveUser`（Navbar.vue / Sidebar.vue）
  - [x] 21.3 保留 Bangumi 直登专属逻辑（如 fetchMe）不动
- [x] Task 22: 集成测试覆盖 Bangmio 绑定后 effectiveUser 流程
  - [x] 22.1 在 auth.integration.test.js 新增场景：Bangmio 注册 → 绑定 → effectiveUser 不为空
  - [x] 22.2 验证 fetchBgmUserProfile 在绑定后被调用

## 阶段五：验证与部署

- [x] Task 23: 测试 + lint + 构建
  - [x] 23.1 `npx vitest run` 全部通过（174 passed, 6 skipped）
  - [x] 23.2 `npx eslint` 0 错误 0 警告
  - [x] 23.3 `npx vite build` 成功
- [ ] Task 24: 提交并推送
  - [ ] 24.1 git commit 描述本次改动
  - [ ] 24.2 git push origin master 触发 CF Pages 部署

# Task Dependencies

- Task 2 依赖 Task 1（前后端 Turnstile 同步）
- Task 5 依赖 Task 3 + Task 4（数据层 + 服务层）
- Task 6 依赖 Task 7（前端调用 store action）
- Task 11 依赖 Task 10（服务层）
- Task 12 + Task 13 依赖 Task 14（路由）+ Task 15（store）
- Task 18 依赖 Task 17（state + action）
- Task 20 + Task 21 依赖 Task 19（effectiveUser）
- Task 22 依赖 Task 18 + Task 19
- Task 23 依赖所有前置任务
- Task 24 依赖 Task 23

# Parallelizable Work

以下任务可并行执行：

- 阶段一（Task 1-2）与 阶段二（Task 3-8）独立
- 阶段三（Task 9-16）与 阶段四（Task 17-22）独立
- 后端任务（Task 3/4/5/9/10/11）与前端任务（Task 6/7/12/13/14/15）可并行
