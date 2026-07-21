# 六大核心问题修复 Spec

## Why

当前 Bangmio v4 存在 6 个影响用户体验与功能完整性的核心问题：小组功能完全不可用、豆瓣/萌娘百科内容展示不完整且含广告、番剧详情页无意义状态同步浪费资源、分类用语未按 subject type 差异化、账号体系完全耦合 Bangumi 无法独立运营。本 spec 系统性修复上述问题，恢复并增强核心功能可用性。

## What Changes

### 1. 小组功能异常修复

- 排查 `/api/v1/groups` 与 `/api/v1/groups/:id` 接口实际可用性（基于 Bangumi 网页抓取的多源重试已有，但需验证当前是否仍可用）
- 前端 `Groups.vue` / `GroupDetail.vue` 错误处理增强：区分"网络错误"/"接口异常"/"数据为空"三种状态
- 移除硬编码的"加载小组失败"，改为可读性更强的错误提示与重试入口
- 加载失败时提供"重试"按钮，而非仅显示静态错误文本
- 兜底数据：列表为空时展示Bangumi官方小组作为兜底（如「Anime」「日剧」等）

### 2. 豆瓣评分功能优化（iframe 嵌套 + 广告过滤）

- **BREAKING**：移除豆瓣评分 Tab 中基于 API 的短评/长评列表渲染
- 改为 iframe 嵌套豆瓣电影页面（`https://movie.douban.com/subject/:id/`）
- 通过服务端代理 + DOMPurify 过滤广告与冗余内容（豆瓣页面含大量推广位、推荐位、侧边栏）
- 实现服务端代理路由 `/api/v1/douban/page/:id`，抓取豆瓣页面并清洗后返回 HTML 片段
- 清洗规则：移除 `.top-nav-wrapper`、`.nav-wrapper`、`#dale_movie_subject_top_icon`、`.sidebar`、`#recommendations`、`.extra`、广告 iframe、script 标签
- iframe 内嵌展示清洗后的页面，保留评论完整内容

### 3. 萌娘百科功能优化（iframe 嵌套 + 广告过滤）

- **BREAKING**：移除萌娘百科 Tab 中基于 API 的摘要展示
- 改为 iframe 嵌套萌娘百科页面（`https://zh.moegirl.org.cn/番剧名`）
- 实现服务端代理路由 `/api/v1/moegirl/page/:name`，抓取萌娘页面并清洗后返回 HTML 片段
- 清洗规则：移除 `.header`、`.footer`、`#mw-navigation`、`.sidebar`、`.mw-editsection`、广告位、script 标签
- 保留正文 `.mw-parser-output` 内容
- iframe 内嵌展示清洗后的页面

### 4. 番剧详情页状态同步优化

- `CollectionButton.vue` 引入状态变更检测：缓存上次同步的状态值，仅在用户实际修改后才触发同步
- 详情页加载时仅读取状态，不自动同步
- 状态对比维度：`type`（在看/想过/看过等）+ `ep_status`（章节进度）+ `comment`（吐槽）+ `tags`（标签）+ `score`（评分）
- 任一维度变化才发起更新请求，否则不调用 `/api/v1/collection/:animeId`
- 防抖处理：用户连续修改时，500ms 内仅触发一次同步

### 5. 分类用语规范化

- 创建 `client/src/utils/subjectType.js` 集中管理分类用语映射
- Bangumi subject type 映射：
  - `1` 书籍 → 想读/在读/读过/搁置/抛弃
  - `2` 动画 → 想看/在看/看过/搁置/抛弃（含三次元 `6`）
  - `3` 音乐 → 想听/在听/听过/搁置/抛弃
  - `4` 游戏 → 想玩/在玩/玩过/搁置/抛弃
- 重构 `CollectionButton.vue`：状态选项动态生成，基于当前 subject type
- 重构 `Profile.vue`、`Watching.vue`、`Home.vue` 等页面中的状态用语，统一从映射表读取
- 全局 Grep 替换硬编码的"在看/想看/看过"等用语为函数调用

### 6. 账号体系重构

- **BREAKING**：账号体系从「纯 Bangumi 登录」改为「Bangmio 独立账号 + Bangumi 绑定」双模式
- **新增 Bangmio 账号注册/登录系统**：
  - 数据存储：Cloudflare D1（SQLite）作为用户数据库
  - 密码加密：使用 Web Crypto API 实现 PBKDF2 或 scrypt（CF Workers 兼容）
  - Token 机制：JWT（HS256），包含 `userId`、`email`、`bgmUid?`（绑定的 Bangumi UID）
  - 注册接口：`POST /api/v1/auth/register`（email + password）
  - 登录接口：`POST /api/v1/auth/login`（email + password）
  - 绑定 Bangumi：`POST /api/v1/auth/bind-bangumi`（bangmioToken + bangumiToken）
- **保留 Bangumi 直登**：
  - 现有 `/api/v1/user/oauth-callback` 与 Token 登录保留
  - Bangumi 直登用户不创建 Bangmio 账号，无 D1 记录
  - Bangumi 直登用户的 token 仍为 Bangumi access_token
- **番剧功能强制要求 Bangumi 绑定**：
  - Bangmio 账号用户首次使用番剧功能（收藏/进度/吐槽）前必须绑定 Bangumi 账号
  - 未绑定时弹窗引导，提供"绑定 Bangumi"或"切换为 Bangumi 直登"两个选项
  - 番剧进度同步等仍使用 Bangumi access_token
- **登录页改造**：
  - 默认展示 Bangmio 邮箱登录
  - Tab 切换：「Bangmio 账号」/「Bangumi 直登」
  - 注册入口：邮箱 + 密码 + 确认密码
- **D1 Schema**：
  ```sql
  CREATE TABLE users (
    id TEXT PRIMARY KEY,          -- UUID
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- PBKDF2 hash
    salt TEXT NOT NULL,
    bgm_uid TEXT,                 -- 绑定的 Bangumi UID（可空）
    bgm_token TEXT,               -- 绑定的 Bangumi access_token（加密存储，可空）
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  ```
- **配置**：
  - `wrangler.toml` 添加 D1 binding：`DB`
  - JWT secret 通过 `.dev.vars` 与 CF Pages 环境变量配置：`JWT_SECRET`、`BGMIO_SALT`
  - D1 数据库初始化 SQL：`server/db/schema.sql`
- **安全**：
  - 密码使用 PBKDF2-SHA256，迭代 100000 次，salt 16 字节
  - Bangumi access_token 在 D1 中使用 AES-GCM 加密存储（key 来自 JWT_SECRET 派生）
  - JWT 有效期 7 天，支持 refresh
  - 所有 `/api/v1/auth/*` 路由强制 HTTPS（CF Pages 默认）

## Impact

- **Affected specs**:
  - `fix-groups/spec.md`（已完成的 spec，本 spec 在其基础上进一步加固错误处理）
  - `project-wide-optimization/spec.md`（安全加固相关，本 spec 新增密码与 token 安全）
  - `ui-detail-refinement/spec.md`（Tab 展示相关，本 spec 修改豆瓣/萌娘 Tab）
- **Affected code**:
  - 前端：`client/src/views/Groups.vue`、`GroupDetail.vue`、`Detail.vue`、`Login.vue`、`Profile.vue`、`Watching.vue`、`Home.vue`
  - 前端组件：`client/src/components/CollectionButton.vue`、`CommentSection.vue`
  - 前端工具：`client/src/api/index.js`、`client/src/api/endpoints.js`、`client/src/stores/auth.js`、`client/src/router/index.js`
  - 前端新增：`client/src/utils/subjectType.js`、`client/src/components/IframeEmbed.vue`、`client/src/views/Register.vue`
  - 后端路由：`server/src/routes/groups.js`、`douban.js`、`moegirl.js`、`collection.js`、`user.js`
  - 后端新增：`server/src/routes/auth.js`、`server/src/services/auth.js`、`server/src/utils/crypto.js`、`server/src/db/schema.sql`
  - 后端中间件：新增 `server/src/middleware/jwtAuth.js`
  - 配置：`wrangler.toml`（D1 binding）、`.dev.vars.example`（JWT_SECRET 等）
- **数据库**：新增 Cloudflare D1 数据库 `bangmio-users`
- **环境变量**：新增 `JWT_SECRET`、`BGMIO_SALT`、`D1_DATABASE_ID`

## ADDED Requirements

### Requirement: Bangmio 独立账号注册与登录系统

系统 SHALL 提供 Bangmio 独立账号注册与登录功能，用户使用邮箱 + 密码创建账号并登录。

#### Scenario: 用户注册 Bangmio 账号

- **WHEN** 用户在注册页填写有效邮箱与密码（≥8 字符）
- **THEN** 系统创建 Bangmio 账号，返回 JWT，用户进入已登录状态

#### Scenario: 重复邮箱注册

- **WHEN** 用户使用已注册的邮箱再次注册
- **THEN** 系统返回 409 错误「邮箱已注册」

#### Scenario: 用户登录

- **WHEN** 用户在登录页输入正确邮箱与密码
- **THEN** 系统验证密码哈希，返回 JWT（有效期 7 天）

#### Scenario: 错误密码

- **WHEN** 用户输入错误密码
- **THEN** 系统返回 401 错误「邮箱或密码错误」，不泄露具体是哪个错误

### Requirement: Bangmio 账号绑定 Bangumi 账号

系统 SHALL 允许 Bangmio 账号用户绑定一个 Bangumi 账号，绑定后番剧功能使用 Bangumi access_token 操作。

#### Scenario: Bangmio 用户首次使用番剧功能

- **WHEN** 未绑定 Bangumi 的 Bangmio 用户尝试收藏/标记进度
- **THEN** 弹窗提示「需要绑定 Bangumi 账号才能使用番剧功能」，提供「立即绑定」与「切换为 Bangumi 直登」两个选项

#### Scenario: 绑定 Bangumi

- **WHEN** 用户在绑定弹窗中输入 Bangumi access_token
- **THEN** 系统验证 token 有效性，将 bgm_uid 与加密后的 bgm_token 存入 D1，绑定完成

#### Scenario: 番剧功能调用

- **WHEN** 已绑定的 Bangmio 用户调用番剧功能
- **THEN** 系统从 D1 读取加密的 bgm_token，解密后作为 Authorization 头转发给 Bangumi API

### Requirement: Bangumi 直登保留

系统 SHALL 保留 Bangumi 直登方式，用户无需注册 Bangmio 账号即可使用全部功能。

#### Scenario: Bangumi 直登

- **WHEN** 用户在登录页选择「Bangumi 直登」Tab 并完成 OAuth 或 Token 登录
- **THEN** 系统返回 Bangumi access_token，前端存入 localStorage，不创建 D1 记录

#### Scenario: Bangumi 直登用户使用番剧功能

- **WHEN** Bangumi 直登用户调用番剧功能
- **THEN** 直接使用 localStorage 中的 Bangumi access_token，无需 D1 查询

### Requirement: 服务端页面代理与广告过滤

系统 SHALL 提供服务端页面代理路由，抓取豆瓣与萌娘百科页面并清洗广告/冗余内容后返回 HTML 片段，供前端 iframe 嵌套展示。

#### Scenario: 获取豆瓣页面

- **WHEN** 前端请求 `/api/v1/douban/page/:id`
- **THEN** 系统抓取 `https://movie.douban.com/subject/:id/`，移除导航、侧边栏、推荐位、广告 iframe、script 标签，返回清洗后的 HTML

#### Scenario: 获取萌娘百科页面

- **WHEN** 前端请求 `/api/v1/moegirl/page/:name`
- **THEN** 系统抓取 `https://zh.moegirl.org.cn/:name`，仅保留 `.mw-parser-output` 内容，移除导航、编辑按钮、广告、script 标签，返回清洗后的 HTML

#### Scenario: 上游抓取失败

- **WHEN** 豆瓣/萌娘抓取超时或返回非 200
- **THEN** 系统返回 502 错误「上游服务暂不可用」，前端 iframe 显示错误占位与重试按钮

### Requirement: 状态变更检测

系统 SHALL 在前端 CollectionButton 组件中实现状态变更检测，仅在用户实际修改状态时才触发同步请求。

#### Scenario: 用户未修改状态

- **WHEN** 用户打开详情页，状态按钮显示当前状态，用户未点击任何状态选项
- **THEN** 不发起任何同步请求

#### Scenario: 用户修改状态

- **WHEN** 用户从「想看」切换为「在看」
- **THEN** 500ms 防抖后，发起一次 `/api/v1/collection/:animeId` 更新请求

#### Scenario: 用户连续修改

- **WHEN** 用户在 500ms 内连续切换多个状态
- **THEN** 仅在最后一次修改后 500ms 发起一次请求

### Requirement: 分类用语映射表

系统 SHALL 提供分类用语映射工具，基于 Bangumi subject type 返回对应的状态用语。

#### Scenario: 动画分类用语

- **WHEN** subject type 为 2（动画）或 6（三次元）
- **THEN** 返回 ['想看', '在看', '看过', '搁置', '抛弃']

#### Scenario: 书籍分类用语

- **WHEN** subject type 为 1（书籍）
- **THEN** 返回 ['想读', '在读', '读过', '搁置', '抛弃']

#### Scenario: 音乐分类用语

- **WHEN** subject type 为 3（音乐）
- **THEN** 返回 ['想听', '在听', '听过', '搁置', '抛弃']

#### Scenario: 游戏分类用语

- **WHEN** subject type 为 4（游戏）
- **THEN** 返回 ['想玩', '在玩', '玩过', '搁置', '抛弃']

#### Scenario: 未知分类

- **WHEN** subject type 不在映射表中
- **THEN** 默认返回动画用语 ['想看', '在看', '看过', '搁置', '抛弃']

### Requirement: 小组功能错误处理增强

系统 SHALL 在小组功能中提供明确的错误分类与重试入口。

#### Scenario: 网络错误

- **WHEN** 小组列表请求超时或网络断开
- **THEN** 显示「网络连接失败，请检查网络」+「重试」按钮

#### Scenario: 接口异常

- **WHEN** 后端返回 500 或非预期格式
- **THEN** 显示「服务暂不可用，请稍后再试」+「重试」按钮

#### Scenario: 数据为空

- **WHEN** 后端返回空数组
- **THEN** 显示「暂无小组数据」+ 推荐小组入口（兜底数据）

## MODIFIED Requirements

### Requirement: 豆瓣评分 Tab 展示

原基于 API 的短评/长评列表展示 MODIFIED 为 iframe 嵌套清洗后的豆瓣页面，保留评分数字（来自现有 API），评论内容来自 iframe。

### Requirement: 萌娘百科 Tab 展示

原基于 API 摘要的萌娘百科展示 MODIFIED 为 iframe 嵌套清洗后的萌娘百科页面，完整展示百科正文。

### Requirement: CollectionButton 状态同步

原无变更检测的状态同步 MODIFIED 为基于状态对比 + 防抖的智能同步，避免无意义请求。

### Requirement: 状态用语展示

原所有分类统一使用「在看/想看/看过」MODIFIED 为基于 subject type 的差异化用语。

### Requirement: 小组列表/详情错误提示

原硬编码「加载小组失败」MODIFIED 为分类错误提示 + 重试按钮 + 兜底数据。

### Requirement: 登录页

原单一 Bangumi 登录页 MODIFIED 为双 Tab 登录页（Bangmio 账号 / Bangumi 直登），默认展示 Bangmio 账号登录。

## REMOVED Requirements

### Requirement: 豆瓣短评/长评 API 列表展示

**Reason**: 豆瓣 API 返回的评论数据不完整且无广告过滤，改为 iframe 嵌套完整页面后，API 列表展示方式不再需要。
**Migration**: 前端 Detail.vue 豆瓣 Tab 移除评论列表组件，替换为 IframeEmbed 组件；后端 `server/src/routes/douban.js` 保留评分接口，移除短评/长评接口（或保留作为备用）。

### Requirement: 萌娘百科 API 摘要展示

**Reason**: API 摘要展示内容不完整，改为 iframe 嵌套完整页面后，摘要方式不再需要。
**Migration**: 前端 Detail.vue 萌娘 Tab 移除摘要组件，替换为 IframeEmbed 组件；后端 `server/src/routes/moegirl.js` 保留搜索接口（用于定位页面名），移除摘要接口。

### Requirement: 纯 Bangumi 登录模式（部分移除）

**Reason**: 引入 Bangmio 独立账号体系后，纯 Bangumi 登录不再作为唯一登录方式。
**Migration**: 保留 Bangumi 直登作为可选方式；新增 Bangmio 账号注册/登录作为默认推荐方式；现有用户数据（localStorage 中的 bangumi_token）不受影响，继续可用。
