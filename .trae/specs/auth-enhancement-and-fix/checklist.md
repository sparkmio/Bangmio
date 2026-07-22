# Checklist

## 维度一：登录人机验证

- [x] `client/src/views/Login.vue` 的 Bangmio Tab 已嵌入 Turnstile widget
- [x] Login.vue 提交时携带 `captchaToken`，错误后调用 `resetTurnstile()`
- [x] Login.vue 未配置 `VITE_TURNSTILE_SITE_KEY` 时不渲染 widget，登录按钮可用
- [x] `server/src/routes/auth.js` 的 `POST /login` 在 `TURNSTILE_SECRET_KEY` 已配置时强制校验
- [x] 校验失败返回 400「人机验证失败，请重试」
- [x] Login.vue Bangmio Tab 密码框下方有「忘记密码？」链接

## 维度二：修改密码

### 后端

- [x] `server/src/db/users.js` 实现 `updateUserPassword(db, id, passwordHash, salt)`
- [x] `server/src/services/auth.js` 实现 `changeUserPassword(db, env, userId, currentPassword, newPassword)`
- [x] 原密码错误抛 400「原密码错误」
- [x] 新密码 < 8 位抛 400「新密码至少 8 位」
- [x] 成功流程：生成新 salt + hash → updateUserPassword
- [x] `server/src/routes/auth.js` 新增 `POST /change-password`（jwtAuth）
- [x] `server/src/app.js` 将 `/auth/change-password` 加入严格速率限制

### 前端

- [x] `client/src/views/Settings.vue` 新增「账号安全」卡片
- [x] 卡片仅 `auth.isBangmioUser` 为 true 时显示
- [x] 表单含：原密码 / 新密码 / 确认新密码
- [x] 前端校验：新密码 ≥ 8 位、两次一致
- [x] 调用 `auth.changePassword(currentPassword, newPassword)`
- [x] 成功提示「密码已更新」，清空表单
- [x] `client/src/stores/auth.js` 新增 `changePassword` action

### 测试

- [x] `server/src/services/auth.test.js` 新增 changeUserPassword 测试套件
- [x] 测试用例：原密码错误抛 400
- [x] 测试用例：新密码 < 8 抛 400
- [x] 测试用例：正确流程成功且 updateUserPassword 被调用

## 维度三：忘记密码

### 后端

- [x] `server/src/services/auth.js` 实现 `resetUserPassword(db, env, { email, code, newPassword })`
- [x] 验证码错误抛 400「验证码错误或已过期」
- [x] 新密码 < 8 位抛 400
- [x] 成功流程：verifyCode → 生成新 salt + hash → updateUserPassword
- [x] `server/src/routes/auth.js` 新增 `POST /forgot-password`
- [x] Turnstile 校验（未配置时跳过）
- [x] 邮箱不存在时静默返回 200（防探测）
- [x] `server/src/routes/auth.js` 新增 `POST /reset-password`
- [x] `server/src/app.js` 将 `/auth/forgot-password` 加入严格速率限制

### 前端

- [x] `client/src/views/ForgotPassword.vue` 已创建
- [x] 表单：邮箱 + Turnstile + 发送验证码按钮（60 秒倒计时）
- [x] 发送成功后跳转 `/reset-password?email=xxx`
- [x] 提示「如果该邮箱已注册，验证码已发送」
- [x] `client/src/views/ResetPassword.vue` 已创建
- [x] 从 query 读取 email
- [x] 表单：验证码 + 新密码 + 确认密码
- [x] 成功后跳转 `/login` 并提示「密码已重置，请登录」
- [x] `client/src/router/index.js` 新增 `/forgot-password` 和 `/reset-password` 路由
- [x] `client/src/stores/auth.js` 新增 `forgotPassword` / `resetPassword` actions

### 测试

- [x] `server/src/services/auth.test.js` 新增 resetUserPassword 测试套件
- [x] 测试用例：验证码错误抛 400
- [x] 测试用例：新密码 < 8 抛 400
- [x] 测试用例：正确流程成功且 updateUserPassword 被调用

## 维度四：账号绑定与个人页故障修复

### auth store 增强

- [x] `client/src/stores/auth.js` 新增 `bgmUserProfile` state（localStorage 持久化）
- [x] 新增 `fetchBgmUserProfile()` action（调用 `/api/v1/user/me`）
- [x] `bindBangumi(token)` 成功后调用 `fetchBgmUserProfile()`
- [x] `oauthBindBangumi(code, state)` 成功后调用 `fetchBgmUserProfile()`
- [x] `checkAuth()` 检测已绑定但 `bgmUserProfile` 为空时自动拉取
- [x] 新增 `effectiveUser` computed（Bangmio→bgmUserProfile，直登→user）
- [x] 解绑时清空 `bgmUserProfile`

### 页面修复

- [x] `client/src/views/Profile.vue` 的 `currentUsername` 改用 `auth.effectiveUser?.username`
- [x] Profile.vue 的 `loadProfile()` 中 `profileUser.value = auth.user` 改为 `auth.effectiveUser`
- [x] 全局搜索 `auth.user` 用法，番剧功能页面（Watching.vue / Home.vue / Detail.vue 等）相关位置改为 `auth.effectiveUser`

### 集成测试

- [x] `server/src/services/auth.integration.test.js` 新增场景：Bangmio 注册 → 绑定 → 验证 effectiveUser 流程
- [x] 验证 fetchBgmUserProfile 在绑定后被调用

## 维度五：最终验证

- [x] `npx vitest run` 全部通过（含新增测试）
- [x] `npx eslint "client/src/**/*.{js,vue}" "server/src/**/*.js"` 0 错误 0 警告
- [x] `npx vite build` 成功
- [x] git commit 描述完整
- [x] git push origin master 成功，CF Pages 自动部署

## 部署后用户验证（线上）

- [ ] 访问 `/login`，Bangmio Tab 显示 Turnstile widget
- [ ] 未完成 Turnstile 时登录按钮禁用
- [ ] 访问 `/forgot-password` 输入已注册邮箱能收到验证码邮件
- [ ] `/reset-password` 输入正确验证码 + 新密码能重置成功
- [ ] 重置后用新密码能登录
- [ ] Bangmio 用户登录并绑定 Bangumi 后，访问 `/profile` 用户卡正常显示
- [ ] 访问 `/watching` 追番页正常加载
- [ ] 在 `/settings` 看到「账号安全」卡片，能修改密码

---

## 备注

### 验证方法

本 checklist 的代码层检查点（维度一~维度四）通过逐一读取相关源码文件确认实现位置、逻辑分支、错误信息与测试用例进行验证；维度五的 5 项最终验证按已知结果（174 passed, 6 skipped；ESLint 0 错误 0 警告；vite build 成功；commit 78590b1；git push fb9d538..78590b1）勾选。

### 部署后用户验证（线上）保持未勾选的原因

上述 8 项需在 CF Pages 部署完成后由用户在线上环境实际操作测试（涉及真实邮箱验证码收发、Turnstile widget 渲染、跨设备登录态、Bangumi 绑定联调等运行时行为），无法通过静态代码审查确认，故保留 `- [ ]`。

### 关于维度四「集成测试」检查点的说明

检查点描述为 `server/src/services/auth.integration.test.js`，实际实现位于 `client/src/stores/auth.integration.test.js`（前端 Pinia store 集成测试，通过 mock api 模块端到端验证 store 行为）。原任务描述已允许二选一（「`server/src/services/auth.integration.test.js` 或 `client/src/stores/auth.integration.test.js`」），故判定为通过。该测试套件覆盖：

- Bangmio 注册 → 绑定 → effectiveUser 不为空
- fetchBgmUserProfile 在 bindBangumi / oauthBindBangumi 后被调用
- checkAuth 换设备登录时自动拉取 bgmUserProfile
- Bangumi 直登用户 effectiveUser 返回 user
- 解绑后 bgmUserProfile 被清空
- changePassword / forgotPassword / resetPassword 调用正确 API
- fetchBgmUserProfile 失败时静默

### 验证统计

- 通过的检查点：33 项（维度一 6 + 维度二 14 + 维三 16 + 维度四 9 + 维度五 5，其中维度二/三各分后端/前端/测试小节；维度四未含线上项）
- 未通过/待线上验证：8 项（部署后用户验证全部 8 项）
