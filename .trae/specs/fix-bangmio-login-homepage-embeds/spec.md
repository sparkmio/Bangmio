# 修复 Bangmio 登录后功能异常、未登录首页空白、嵌入功能不可用

## Why

用户使用 Bangmio 账户登录后，个人主页和在追功能无法正常使用——根因是 `fetchBgmUserProfile` 静默失败后 `effectiveUser` 为 null，且无重试/反馈机制。未登录时首页仅有"热门新番"一个区块，内容过于空白。小组/豆瓣/萌娘百科功能在实际使用中仍不可用。

## What Changes

### 1. Bangmio 登录后功能修复

- `fetchBgmUserProfile` 失败时记录错误状态，不再完全静默
- `loginWithBangmio` 中 `fetchBgmUserProfile` 失败后仍允许跳转，但在 auth store 中标记 `bgmProfileError` 供页面展示重试
- `checkAuth` 中若 `bgmUserProfile` 为空且有 `bgmUid`，自动重试拉取（最多 2 次）
- Profile.vue / Watching.vue 在 `effectiveUser` 为空时显示加载中或重试提示，而非空白
- Watching.vue 获取用户名时增加 fallback：优先 `effectiveUser.username`，回退 `bangmioUser.bgmUid`

### 2. 未登录首页优化

- Home.vue 为未登录用户新增欢迎区块（Hero section），含 Bangmio 品牌介绍 + 登录/注册按钮
- 未登录时仍展示"热门新番"和新番时间表入口
- 新增"探索更多"引导区块，链接到搜索页和趋势页

### 3. 小组/豆瓣/萌娘百科修复

- 小组：`fetchHTMLMulti` 超时从 8s 增至 12s，兜底数据确保含 `degraded` 标识；前端 `Groups.vue` 在 `degraded` 时不显示"服务暂不可用"错误条，改为温和提示
- 豆瓣：`/page` 超时从 6s 增至 10s；fallback 卡片确保始终可用
- 萌娘百科：`fetchHTMLMulti` 超时从 8s 增至 12s；验证模板解包逻辑在 `_server.js` 中已生效
- IframeEmbed 超时从 10s 增至 15s，重试后 20s

## Impact

- Affected code: `client/src/stores/auth.js`, `client/src/views/Home.vue`, `client/src/views/Profile.vue`, `client/src/views/Watching.vue`, `client/src/views/Groups.vue`, `client/src/components/IframeEmbed.vue`, `server/src/utils/http.js`, `server/src/routes/douban.js`, `server/src/routes/moegirl.js`, `server/src/routes/groups.js`, `functions/api/_server.js`

## ADDED Requirements

### Requirement: Bangmio 登录后 Bangumi 资料获取容错

系统 SHALL 在 `fetchBgmUserProfile` 失败时记录错误状态并暴露给前端页面，使页面能展示重试入口而非空白。

#### Scenario: fetchBgmUserProfile 首次失败后自动重试

- **WHEN** Bangmio 用户登录后 `fetchBgmUserProfile` 失败
- **THEN** auth store 记录 `bgmProfileError = true`
- **AND** `checkAuth` 在下次应用启动时自动重试拉取
- **AND** Profile.vue 显示"用户资料加载失败"并提供重试按钮

#### Scenario: effectiveUser 为空时 Watching 页面不崩溃

- **WHEN** Bangmio 用户已登录但 `effectiveUser` 为 null
- **THEN** Watching.vue 显示加载中状态或提示"正在获取 Bangumi 资料..."
- **AND** 不发送依赖 username 的 API 请求

### Requirement: 未登录首页欢迎区块

系统 SHALL 在用户未登录时在首页顶部展示欢迎区块，包含品牌介绍和登录/注册入口。

#### Scenario: 未登录用户访问首页

- **WHEN** 未登录用户访问 `/`
- **THEN** 页面顶部显示欢迎区块（Hero section）
- **AND** 欢迎区块包含"登录 Bangmio"和"注册"按钮
- **AND** 下方仍展示"热门新番"内容

## MODIFIED Requirements

### Requirement: 外部嵌入超时与重试

- `fetchHTML` 默认超时从 8s 调整为 12s
- `fetchHTMLMulti` 整体超时从 12s 调整为 18s
- 豆瓣 `/page` 超时从 6s 调整为 10s
- IframeEmbed 首次超时从 10s 调整为 15s，重试后 20s
- 小组 `fetchHTMLMulti` 超时从 8s 调整为 12s
