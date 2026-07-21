# 账号体系增强与故障修复 Spec

## Why

前期账号体系已上线注册（Turnstile + 邮箱验证码）、登录、强制绑定、OAuth 绑定等能力，但存在三类遗留问题：

1. **登录缺少人机验证**：注册流程已加 Turnstile，但登录入口仍未接入，存在撞库/暴破风险
2. **缺少密码管理能力**：用户无法修改密码，也无法在忘记密码时自助重置，运营成本高
3. **Bangmio 用户绑定 Bangumi 后功能异常**：Profile.vue 与番剧功能页都依赖 `auth.user`（仅 Bangumi 直登用户有值），导致 Bangmio 用户登录并绑定后个人页空白、追番页失效

本 spec 系统性修复上述问题，使账号体系完整可用。

## What Changes

### 1. 登录功能增强：Turnstile 人机验证

- 前端 [Login.vue](file:///d:/Bangmio%20v4/client/src/views/Login.vue) 的 Bangmio 账号 Tab 嵌入 Turnstile widget（复用 Register.vue 已有的动态加载逻辑）
- 提交登录时携带 `captchaToken`
- 后端 `POST /api/v1/auth/login` 增加 Turnstile 校验（仅在 `TURNSTILE_SECRET_KEY` 已配置时强制）
- 未配置 Turnstile 时双方优雅降级

### 2. 密码管理功能扩展

#### 2a. 修改密码

- 新增后端端点 `POST /api/v1/auth/change-password`（JWT 鉴权）
  - Body: `{ currentPassword, newPassword }`
  - 流程：验证原密码 → 生成新 salt + hash → 更新 D1
  - 错误：原密码错误返回 400；新密码 < 8 位返回 400
- 新增 `db/users.js` 中的 `updateUserPassword(db, id, passwordHash, salt)`
- 新增 `services/auth.js` 中的 `changeUserPassword(db, env, userId, currentPassword, newPassword)`
- 前端 [Settings.vue](file:///d:/Bangmio%20v4/client/src/views/Settings.vue) 新增「账号安全」卡片，含修改密码表单（原密码 / 新密码 / 确认新密码）
- 仅 Bangmio 用户显示此卡片（Bangumi 直登用户无 Bangmio 密码）

#### 2b. 忘记密码

- 复用 `email_codes` 表，新增 `purpose='reset'` 用途
- 新增后端端点 `POST /api/v1/auth/forgot-password`
  - Body: `{ email, captchaToken }`
  - 流程：Turnstile 校验 → 检查邮箱是否存在（不存在静默返回成功以防探测） → 发送验证码 purpose='reset'
- 新增后端端点 `POST /api/v1/auth/reset-password`
  - Body: `{ email, code, newPassword }`
  - 流程：校验验证码 → 生成新 salt + hash → 更新 D1
- 新增前端页面 `ForgotPassword.vue` 与 `ResetPassword.vue`
  - `/forgot-password`：输入邮箱 + Turnstile + 发送验证码
  - `/reset-password?email=xxx`：输入验证码 + 新密码 + 确认密码
- [Login.vue](file:///d:/Bangmio%20v4/client/src/views/Login.vue) 在 Bangmio Tab 密码输入框下方加「忘记密码？」链接

### 3. 账号绑定与个人页显示故障修复

#### 3a. 个人页不显示修复

- **根因**：Profile.vue 的 `currentUsername` 用 `auth.user?.username`，Bangmio 用户 `auth.user` 为 null
- **修复方案**：
  1. `auth.js` store 新增 `bgmUserProfile` state（缓存 Bangumi 用户资料：username/avatar/sign 等）
  2. 新增 `fetchBgmUserProfile()` action，调用 `/api/v1/user/me` 获取 Bangumi 用户资料
  3. 在 `bindBangumi`、`oauthBindBangumi`、`fetchBgmToken` 成功后自动调用 `fetchBgmUserProfile()`
  4. `checkAuth` 中检测已绑定但无 `bgmUserProfile` 时自动拉取
  5. 新增 `effectiveUser` computed：Bangmio 用户返回 `bgmUserProfile`，否则返回 `user`
  6. Profile.vue 的 `currentUsername` 改用 `auth.effectiveUser?.username`
  7. Profile.vue 的 `profileUser` 默认值改用 `auth.effectiveUser` 而非 `auth.user`

#### 3b. 追番功能失效修复

- **根因**：与 3a 相同，Watching.vue / Home.vue 等页面读取 `auth.user` 判断登录态
- **修复方案**：全局搜索所有使用 `auth.user` 的番剧功能页面，改为使用 `auth.effectiveUser`
- 关键文件：Watching.vue、Home.vue、Detail.vue 等使用 `auth.user?.username` 的位置

## Impact

### Affected specs

- `fix-six-core-issues`（账号体系部分）：本 spec 为其延续与修复

### Affected code

**后端**：

- [server/src/routes/auth.js](file:///d:/Bangmio%20v4/server/src/routes/auth.js) — 新增 4 个端点：change-password / forgot-password / reset-password / login 加 Turnstile
- [server/src/services/auth.js](file:///d:/Bangmio%20v4/server/src/services/auth.js) — 新增 changeUserPassword / resetUserPassword
- [server/src/db/users.js](file:///d:/Bangmio%20v4/server/src/db/users.js) — 新增 updateUserPassword
- [server/src/app.js](file:///d:/Bangmio%20v4/server/src/app.js) — 将 `/auth/forgot-password` 加入严格速率限制

**前端**：

- [client/src/views/Login.vue](file:///d:/Bangmio%20v4/client/src/views/Login.vue) — Bangmio Tab 加 Turnstile + 忘记密码链接
- [client/src/views/Settings.vue](file:///d:/Bangmio%20v4/client/src/views/Settings.vue) — 新增「账号安全」卡片
- `client/src/views/ForgotPassword.vue` — 新建
- `client/src/views/ResetPassword.vue` — 新建
- [client/src/stores/auth.js](file:///d:/Bangmio%20v4/client/src/stores/auth.js) — 新增 bgmUserProfile / fetchBgmUserProfile / effectiveUser / changePassword / forgotPassword / resetPassword
- [client/src/router/index.js](file:///d:/Bangmio%20v4/client/src/router/index.js) — 新增 /forgot-password 和 /reset-password 路由
- [client/src/views/Profile.vue](file:///d:/Bangmio%20v4/client/src/views/Profile.vue) — 改用 effectiveUser
- [client/src/views/Watching.vue](file:///d:/Bangmio%20v4/client/src/views/Watching.vue) — 改用 effectiveUser（如使用 auth.user）

**测试**：

- `server/src/services/auth.test.js` — 新增 changeUserPassword / resetUserPassword 测试
- `server/src/services/auth.integration.test.js` — 新增 Bangmio 绑定后 effectiveUser 流程测试

## ADDED Requirements

### Requirement: 登录人机验证

系统 SHALL 在用户通过 Bangmio 账号登录时要求完成 Turnstile 人机验证，验证失败时阻止登录并返回 400 错误。当后端未配置 `TURNSTILE_SECRET_KEY` 时，前端不渲染 widget，后端跳过校验。

#### Scenario: Turnstile 已配置 - 验证通过

- **WHEN** 用户在 Login 页 Bangmio Tab 完成 Turnstile 并提交登录
- **THEN** 后端校验 captchaToken 通过，正常签发 JWT

#### Scenario: Turnstile 已配置 - 未完成验证

- **WHEN** 用户未完成 Turnstile 直接提交登录
- **THEN** 前端禁用提交按钮；若绕过前端提交，后端返回 400「人机验证失败」

#### Scenario: Turnstile 未配置

- **WHEN** 后端未配置 `TURNSTILE_SECRET_KEY`
- **THEN** 前端不渲染 widget，后端跳过校验，登录流程正常进行

### Requirement: 修改密码

系统 SHALL 提供已登录 Bangmio 用户修改密码的能力，需验证原密码后用新密码（PBKDF2 + 新 salt）替换旧哈希。

#### Scenario: 原密码正确

- **WHEN** 用户提交 `{ currentPassword: '正确密码', newPassword: '新密码至少8位' }`
- **THEN** 后端验证原密码通过，生成新 salt + hash，更新 D1，返回 200

#### Scenario: 原密码错误

- **WHEN** 用户提交的 currentPassword 与库中 hash 不匹配
- **THEN** 后端返回 400「原密码错误」，不更新密码

#### Scenario: 新密码过短

- **WHEN** newPassword 长度 < 8
- **THEN** 后端返回 400「新密码至少 8 位」

### Requirement: 忘记密码

系统 SHALL 提供未登录用户通过邮箱验证码重置密码的能力，验证码 10 分钟内有效，一次性消费。

#### Scenario: 邮箱已注册 - 发送验证码

- **WHEN** 用户提交 `{ email: '已注册邮箱', captchaToken: '有效' }` 到 `/auth/forgot-password`
- **THEN** 后端 Turnstile 校验通过，发送 purpose='reset' 验证码邮件，返回 200

#### Scenario: 邮箱未注册

- **WHEN** 用户提交未注册的邮箱
- **THEN** 后端静默返回 200（防探测），不发送邮件

#### Scenario: 重置密码成功

- **WHEN** 用户提交 `{ email, code: '正确验证码', newPassword: '新密码' }` 到 `/auth/reset-password`
- **THEN** 后端校验验证码通过，生成新 salt + hash 更新 D1，返回 200

#### Scenario: 验证码错误

- **WHEN** code 与 D1 中最新一条 purpose='reset' 记录不匹配
- **THEN** 后端返回 400「验证码错误或已过期」

### Requirement: Bangmio 用户绑定后获取 Bangumi 资料

系统 SHALL 在 Bangmio 用户绑定 Bangumi 成功后自动拉取并缓存 Bangumi 用户资料（username/avatar/sign 等），使个人页与番剧功能页能正常显示。

#### Scenario: 绑定后立即拉取

- **WHEN** 用户通过 `/auth/bind-bangumi` 或 OAuth 完成绑定
- **THEN** 前端 store 自动调用 `/api/v1/user/me`，将 Bangumi 用户资料缓存到 `bgmUserProfile`

#### Scenario: 换设备登录

- **WHEN** 已绑定用户在新设备登录，本地无 `bgmUserProfile`
- **THEN** `checkAuth` 检测到 `bgmUid` 存在但 `bgmUserProfile` 为空，自动拉取

### Requirement: effectiveUser 统一用户对象

auth store SHALL 提供 `effectiveUser` computed getter，屏蔽 Bangmio/Bangumi 直登的差异：

- Bangmio 用户：返回 `bgmUserProfile`（含 username/avatar 等 Bangumi 资料）
- Bangumi 直登用户：返回 `user`

#### Scenario: Bangmio 已绑定用户访问 Profile

- **WHEN** 用户登录 Bangmio 账号并绑定 Bangumi
- **THEN** `auth.effectiveUser` 返回 Bangumi 用户资料，Profile.vue 正常显示用户卡

#### Scenario: Bangumi 直登用户访问 Profile

- **WHEN** 用户通过 Bangumi access_token 直登
- **THEN** `auth.effectiveUser` 返回 `user`，Profile.vue 正常显示用户卡

## MODIFIED Requirements

### Requirement: 登录接口

原 `POST /api/v1/auth/login` 仅校验邮箱密码；现增加 Turnstile 校验步骤（仅在 `TURNSTILE_SECRET_KEY` 已配置时强制）。Body 由 `{ email, password }` 改为 `{ email, password, captchaToken? }`。

### Requirement: auth store 用户对象

原 store 仅暴露 `user`（Bangumi 直登用户）。现新增 `bgmUserProfile`（Bangmio 用户绑定后的 Bangumi 资料）与 `effectiveUser` computed。所有依赖 `auth.user` 的页面 SHOULD 改用 `auth.effectiveUser` 以兼容双流程。
