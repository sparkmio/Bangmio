# Checklist

## 维度一：登录人机验证

- [ ] `client/src/views/Login.vue` 的 Bangmio Tab 已嵌入 Turnstile widget
- [ ] Login.vue 提交时携带 `captchaToken`，错误后调用 `resetTurnstile()`
- [ ] Login.vue 未配置 `VITE_TURNSTILE_SITE_KEY` 时不渲染 widget，登录按钮可用
- [ ] `server/src/routes/auth.js` 的 `POST /login` 在 `TURNSTILE_SECRET_KEY` 已配置时强制校验
- [ ] 校验失败返回 400「人机验证失败，请重试」
- [ ] Login.vue Bangmio Tab 密码框下方有「忘记密码？」链接

## 维度二：修改密码

### 后端

- [ ] `server/src/db/users.js` 实现 `updateUserPassword(db, id, passwordHash, salt)`
- [ ] `server/src/services/auth.js` 实现 `changeUserPassword(db, env, userId, currentPassword, newPassword)`
- [ ] 原密码错误抛 400「原密码错误」
- [ ] 新密码 < 8 位抛 400「新密码至少 8 位」
- [ ] 成功流程：生成新 salt + hash → updateUserPassword
- [ ] `server/src/routes/auth.js` 新增 `POST /change-password`（jwtAuth）
- [ ] `server/src/app.js` 将 `/auth/change-password` 加入严格速率限制

### 前端

- [ ] `client/src/views/Settings.vue` 新增「账号安全」卡片
- [ ] 卡片仅 `auth.isBangmioUser` 为 true 时显示
- [ ] 表单含：原密码 / 新密码 / 确认新密码
- [ ] 前端校验：新密码 ≥ 8 位、两次一致
- [ ] 调用 `auth.changePassword(currentPassword, newPassword)`
- [ ] 成功提示「密码已更新」，清空表单
- [ ] `client/src/stores/auth.js` 新增 `changePassword` action

### 测试

- [ ] `server/src/services/auth.test.js` 新增 changeUserPassword 测试套件
- [ ] 测试用例：原密码错误抛 400
- [ ] 测试用例：新密码 < 8 抛 400
- [ ] 测试用例：正确流程成功且 updateUserPassword 被调用

## 维度三：忘记密码

### 后端

- [ ] `server/src/services/auth.js` 实现 `resetUserPassword(db, env, { email, code, newPassword })`
- [ ] 验证码错误抛 400「验证码错误或已过期」
- [ ] 新密码 < 8 位抛 400
- [ ] 成功流程：verifyCode → 生成新 salt + hash → updateUserPassword
- [ ] `server/src/routes/auth.js` 新增 `POST /forgot-password`
- [ ] Turnstile 校验（未配置时跳过）
- [ ] 邮箱不存在时静默返回 200（防探测）
- [ ] `server/src/routes/auth.js` 新增 `POST /reset-password`
- [ ] `server/src/app.js` 将 `/auth/forgot-password` 加入严格速率限制

### 前端

- [ ] `client/src/views/ForgotPassword.vue` 已创建
- [ ] 表单：邮箱 + Turnstile + 发送验证码按钮（60 秒倒计时）
- [ ] 发送成功后跳转 `/reset-password?email=xxx`
- [ ] 提示「如果该邮箱已注册，验证码已发送」
- [ ] `client/src/views/ResetPassword.vue` 已创建
- [ ] 从 query 读取 email
- [ ] 表单：验证码 + 新密码 + 确认密码
- [ ] 成功后跳转 `/login` 并提示「密码已重置，请登录」
- [ ] `client/src/router/index.js` 新增 `/forgot-password` 和 `/reset-password` 路由
- [ ] `client/src/stores/auth.js` 新增 `forgotPassword` / `resetPassword` actions

### 测试

- [ ] `server/src/services/auth.test.js` 新增 resetUserPassword 测试套件
- [ ] 测试用例：验证码错误抛 400
- [ ] 测试用例：新密码 < 8 抛 400
- [ ] 测试用例：正确流程成功且 updateUserPassword 被调用

## 维度四：账号绑定与个人页故障修复

### auth store 增强

- [ ] `client/src/stores/auth.js` 新增 `bgmUserProfile` state（localStorage 持久化）
- [ ] 新增 `fetchBgmUserProfile()` action（调用 `/api/v1/user/me`）
- [ ] `bindBangumi(token)` 成功后调用 `fetchBgmUserProfile()`
- [ ] `oauthBindBangumi(code, state)` 成功后调用 `fetchBgmUserProfile()`
- [ ] `checkAuth()` 检测已绑定但 `bgmUserProfile` 为空时自动拉取
- [ ] 新增 `effectiveUser` computed（Bangmio→bgmUserProfile，直登→user）
- [ ] 解绑时清空 `bgmUserProfile`

### 页面修复

- [ ] `client/src/views/Profile.vue` 的 `currentUsername` 改用 `auth.effectiveUser?.username`
- [ ] Profile.vue 的 `loadProfile()` 中 `profileUser.value = auth.user` 改为 `auth.effectiveUser`
- [ ] 全局搜索 `auth.user` 用法，番剧功能页面（Watching.vue / Home.vue / Detail.vue 等）相关位置改为 `auth.effectiveUser`

### 集成测试

- [ ] `server/src/services/auth.integration.test.js` 新增场景：Bangmio 注册 → 绑定 → 验证 effectiveUser 流程
- [ ] 验证 fetchBgmUserProfile 在绑定后被调用

## 维度五：最终验证

- [ ] `npx vitest run` 全部通过（含新增测试）
- [ ] `npx eslint "client/src/**/*.{js,vue}" "server/src/**/*.js"` 0 错误 0 警告
- [ ] `npx vite build` 成功
- [ ] git commit 描述完整
- [ ] git push origin master 成功，CF Pages 自动部署

## 部署后用户验证（线上）

- [ ] 访问 `/login`，Bangmio Tab 显示 Turnstile widget
- [ ] 未完成 Turnstile 时登录按钮禁用
- [ ] 访问 `/forgot-password` 输入已注册邮箱能收到验证码邮件
- [ ] `/reset-password` 输入正确验证码 + 新密码能重置成功
- [ ] 重置后用新密码能登录
- [ ] Bangmio 用户登录并绑定 Bangumi 后，访问 `/profile` 用户卡正常显示
- [ ] 访问 `/watching` 追番页正常加载
- [ ] 在 `/settings` 看到「账号安全」卡片，能修改密码
