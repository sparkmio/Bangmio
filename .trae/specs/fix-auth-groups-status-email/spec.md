# 认证/小组/状态/邮件 综合修复 Spec

## Why

线上反馈五类问题仍未彻底解决或为新需求：登录人机验证持续报错、小组功能仍不可用、收藏状态被擅自篡改、邮件易被判垃圾、忘记密码入口缺失/不可达。本 spec 统一修复并补齐新功能，确保线上可用。

## What Changes

- **登录人机验证修复**：增强 Turnstile 错误诊断与降级策略，前端展示具体失败原因；后端在 siteverify 网络异常时降级放行而非一刀切拒绝；确认 widget 域名配置覆盖所有线上域名。
- **小组功能修复**：排查并修复线上 `functions/api/_server.js` 未同步最新兜底逻辑的问题；后端在 `fetchHTMLMulti` 全部失败时返回明确降级标识；前端对降级数据给出清晰提示而非笼统"服务暂不可用"。
- **收藏状态自动修改 bug 修复**：用户仅更新评分/评论时，若当前无收藏记录（404），不再自动创建默认状态（type=3）；仅在用户显式提供 status 时才写入 status。
- **忘记密码功能**：确认 `/forgot-password` 与 `/reset-password` 路由已注册且线上可达；Login.vue 已有入口链接；补齐端到端可用性。
- **邮件发送者与主题改造**：`RESEND_FROM` 改为 `Bangmio <signup@bangmio.site>`；邮件主题改为 `Bangmio验证码是{code}`（验证码内联主题，降低垃圾邮件概率）。
- **注册页说明**：Register.vue 顶部新增提示条："Bangmio 账户处在测试阶段，推荐使用 Bangumi 直登"。

## Impact

- Affected specs: fix-core-app-features, auth-enhancement-and-fix, fix-groups
- Affected code:
  - `server/src/routes/auth.js` — Turnstile 降级逻辑
  - `server/src/utils/turnstile.js` — siteverify 网络异常降级
  - `server/src/routes/collection.js` — 状态自动修改 bug
  - `server/src/services/auth.js` — 邮件主题
  - `server/src/utils/email.js` — 默认发件人
  - `wrangler.toml` — RESEND_FROM 配置
  - `client/src/views/Login.vue` — Turnstile 错误展示
  - `client/src/views/Register.vue` — 测试阶段说明
  - `client/src/views/Groups.vue` — 降级数据提示
  - `client/src/router/index.js` — 确认忘记密码路由
  - `functions/api/_server.js` — 同步最新后端逻辑（构建产物）

## ADDED Requirements

### Requirement: 注册页测试阶段说明

Register.vue SHALL 在表单顶部显示提示："Bangmio 账户处在测试阶段，推荐使用 Bangumi 直登"，并提供跳转 Bangumi 直登的入口。

#### Scenario: 用户访问注册页

- **WHEN** 用户进入 /register
- **THEN** 顶部显示测试阶段提示条，含"使用 Bangumi 直登"链接跳转 /login（Bangumi Tab）

### Requirement: 邮件发送者与主题

系统发送验证码邮件时 SHALL 使用 `Bangmio <signup@bangmio.site>` 作为发件人，主题为 `Bangmio验证码是{code}`（{code} 为 6 位验证码）。

#### Scenario: 发送注册验证码

- **WHEN** 用户请求发送验证码
- **THEN** 邮件发件人为 `Bangmio <signup@bangmio.site>`，主题为 `Bangmio验证码是123456`（示例）

### Requirement: 忘记密码端到端

系统 SHALL 提供 /forgot-password 与 /reset-password 页面，用户通过邮箱验证码重置密码后可使用新密码登录。

#### Scenario: 忘记密码完整流程

- **WHEN** 用户在登录页点击"忘记密码？"→ 输入邮箱 → 收到验证码 → 输入验证码与新密码 → 重置成功
- **THEN** 跳转登录页，用新密码可登录成功

## MODIFIED Requirements

### Requirement: 登录人机验证

Turnstile 验证失败时，前端 SHALL 展示具体失败原因（过期/网络错误/域名不匹配）；后端在 siteverify 接口网络异常时 SHALL 降级放行并记录日志，仅在明确返回 `success: false` 时拒绝。

### Requirement: 小组功能可用性

小组列表/详情在 Bangumi 上游不可用时 SHALL 返回降级数据并附带 `degraded: true` 标识；前端 SHALL 根据 `degraded` 标识显示"部分数据为兜底展示"提示，而非"服务暂不可用"。

### Requirement: 收藏状态更新

用户更新收藏时，若未显式提供 `status` 字段，系统 SHALL NOT 自动设置默认状态；仅当用户显式提供 `status` 时才写入 `type` 字段。更新评分/评论时若当前无收藏记录，SHALL 返回提示"请先选择收藏状态"而非自动创建。

#### Scenario: 仅更新评分（已有收藏）

- **WHEN** 用户对已收藏的番剧仅提交 rating=8（不传 status）
- **THEN** 评分更新成功，状态保持原值不变

#### Scenario: 仅更新评分（未收藏）

- **WHEN** 用户对未收藏的番剧仅提交 rating=8（不传 status）
- **THEN** 返回 400 提示"请先选择收藏状态"，不自动创建默认状态
