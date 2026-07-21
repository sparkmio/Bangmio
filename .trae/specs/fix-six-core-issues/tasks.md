# Tasks

> 说明：6 个问题分为 6 个维度，其中问题 1-5 可独立推进，问题 6（账号体系重构）为最大工程需独立批次。建议执行顺序：维度 1（小组）→ 维度 4（状态同步）→ 维度 5（分类用语）→ 维度 2-3（豆瓣/萌娘 iframe）→ 维度 6（账号体系）。

## 维度一：小组功能异常修复

- [x] Task 1: 排查小组接口实际可用性
  - [x] 本地启动 `npm run dev:all`，访问 `/api/v1/groups` 与 `/api/v1/groups/1`，记录响应
  - [x] 检查 `server/src/routes/groups.js` 多源重试逻辑是否触发兜底
  - [x] 若接口确实失败，定位失败原因（Bangumi 网页改版/WAF/镜像不可达）
- [x] Task 2: 增强 `client/src/views/Groups.vue` 错误处理
  - [x] 区分「网络错误」「接口异常」「数据为空」三种状态
  - [x] 移除硬编码「加载小组失败」，改为分类错误提示
  - [x] 加载失败时显示「重试」按钮，点击重新发起请求
  - [x] 数据为空时展示兜底小组列表（Bangumi 官方推荐小组）
- [x] Task 3: 增强 `client/src/views/GroupDetail.vue` 错误处理
  - [x] 同 Task 2 的错误分类与重试机制
  - [x] 小组不存在时返回 404 友好提示
- [x] Task 4: 后端 `groups.js` 兜底数据增强
  - [x] 列表接口在所有源失败时返回兜底小组列表（硬编码 Bangumi 官方小组）
  - [x] 详情接口在抓取失败时返回缓存的最近一次成功数据（若有）

## 维度二：豆瓣评分 iframe 嵌套 + 广告过滤

- [x] Task 5: 实现豆瓣页面代理路由 `/api/v1/douban/page/:id`
  - [x] 在 `server/src/routes/douban.js` 添加 GET 路由
  - [x] 使用 `utils/http.js` 的 fetchHTML 抓取 `https://movie.douban.com/subject/:id/`
  - [x] 使用 linkedom 解析 HTML，移除：`.top-nav-wrapper`、`.nav-wrapper`、`#dale_movie_subject_top_icon`、`.sidebar`、`#recommendations`、`.extra`、广告 iframe、`<script>`、`<style>` 中的非必要内容
  - [x] 保留评分区、短评区、长评区、评论详情
  - [x] 返回清洗后的 HTML 片段，content-type: `text/html; charset=utf-8`
  - [x] 失败时返回 502 错误
- [x] Task 6: 创建 `client/src/components/IframeEmbed.vue` 通用组件
  - [x] Props: `src`（API 代理 URL）、`title`、`loading-text`
  - [x] 使用 iframe `srcdoc` 属性嵌入服务端返回的 HTML（避免跨域）
  - [x] 加载中显示骨架屏
  - [x] 加载失败显示错误占位 + 重试按钮
  - [x] iframe 高度自适应（通过 postMessage 通信或 ResizeObserver）
- [x] Task 7: 重构 `client/src/views/Detail.vue` 豆瓣 Tab
  - [x] 保留豆瓣评分数字展示（来自现有 API）
  - [x] 评论区域替换为 IframeEmbed 组件，src 指向 `/api/v1/douban/page/:id`
  - [x] 移除原短评/长评列表组件
- [x] Task 8: 豆瓣页面代理测试
  - [x] 单元测试：mock fetchHTML 验证清洗规则
  - [x] 集成测试：实际请求豆瓣页面验证清洗后 HTML 不含广告

## 维度三：萌娘百科 iframe 嵌套 + 广告过滤

- [x] Task 9: 实现萌娘页面代理路由 `/api/v1/moegirl/page/:name`
  - [x] 在 `server/src/routes/moegirl.js` 添加 GET 路由
  - [x] 使用 fetchHTML 抓取 `https://zh.moegirl.org.cn/:name`
  - [x] 使用 linkedom 解析，仅保留 `.mw-parser-output` 内容
  - [x] 移除：`.header`、`.footer`、`#mw-navigation`、`.sidebar`、`.mw-editsection`、广告位、`<script>`
  - [x] 返回清洗后的 HTML 片段
- [x] Task 10: 重构 `client/src/views/Detail.vue` 萌娘 Tab
  - [x] 替换为 IframeEmbed 组件，src 指向 `/api/v1/moegirl/page/:name`
  - [x] 页面名通过现有搜索接口 `/api/v1/moegirl/search?q=番剧名` 获取
  - [x] 移除原摘要展示组件
- [x] Task 11: 萌娘页面代理测试
  - [x] 单元测试：mock fetchHTML 验证清洗规则
  - [x] 集成测试：实际请求萌娘页面验证清洗后 HTML 仅含正文

## 维度四：番剧详情页状态同步优化

- [x] Task 12: `CollectionButton.vue` 状态变更检测
  - [x] 引入 `lastSyncedState` ref，记录上次同步的 `{ type, ep_status, comment, tags, score }`
  - [x] 详情页加载时仅读取状态，不调用更新接口
  - [x] 用户修改状态时，对比当前状态与 `lastSyncedState`
  - [x] 任一维度变化才触发同步，500ms 防抖
  - [x] 同步成功后更新 `lastSyncedState`
- [x] Task 13: 状态同步逻辑测试
  - [x] 单元测试：未修改时不触发请求
  - [x] 单元测试：修改 type 触发请求
  - [x] 单元测试：连续修改 500ms 内仅触发一次
  - [x] 单元测试：同步成功后 lastSyncedState 更新

## 维度五：分类用语规范化

- [x] Task 14: 创建 `client/src/utils/subjectType.js` 映射工具
  - [x] 导出 `SUBJECT_TYPE_NAMES` 常量映射（1→书籍、2→动画、3→音乐、4→游戏、6→三次元）
  - [x] 导出 `getStatusLabels(subjectType)` 函数，返回 `{ wish: '想读', collect: '在读', do: '读过', on_hold: '搁置', dropped: '抛弃' }`
  - [x] 导出 `getStatusOptions(subjectType)` 函数，返回状态选项数组
  - [x] 未知 type 默认返回动画用语
- [x] Task 15: 重构 `CollectionButton.vue` 使用映射表
  - [x] 接收 `subjectType` prop
  - [x] 状态选项从 `getStatusOptions(subjectType)` 动态生成
  - [x] 状态标签从 `getStatusLabels(subjectType)` 读取
- [x] Task 16: 重构其他页面状态用语
  - [x] `Profile.vue`：用户收藏列表的分类标签与状态用语
  - [x] `Watching.vue`：在追列表的标题与状态用语
  - [x] `Home.vue`：首页在追列表标题
  - [x] 全局 Grep 搜索「在看/想看/看过/在玩/在读/在听」硬编码，替换为函数调用
- [x] Task 17: 分类用语测试
  - [x] 单元测试：4 种 subject type 返回正确用语
  - [x] 单元测试：未知 type 返回默认动画用语

## 维度六：账号体系重构

- [x] Task 18: 配置 Cloudflare D1 数据库
  - [x] 在 `wrangler.toml` 添加 D1 binding `DB`
  - [x] 创建 `server/db/schema.sql` 包含 users 表建表语句
  - [x] 创建 `server/db/seed.sql`（可选，初始化管理员账号）
  - [x] 文档记录 D1 创建命令：`npx wrangler d1 create bangmio-users`
- [x] Task 19: 实现密码加密工具 `server/src/utils/crypto.js`
  - [x] 使用 Web Crypto API 实现 PBKDF2-SHA256 密码哈希
  - [x] 导出 `hashPassword(password, salt)` 与 `verifyPassword(password, salt, hash)`
  - [x] 导出 `generateSalt()` 生成 16 字节随机 salt
  - [x] 导出 `encryptToken(token, key)` 与 `decryptToken(encrypted, key)` 使用 AES-GCM
  - [x] 派生密钥从 JWT_SECRET 通过 HKDF
- [x] Task 20: 实现 JWT 工具 `server/src/utils/jwt.js`
  - [x] 使用 Web Crypto API 实现 HS256 JWT 签发与验证
  - [x] 导出 `signJwt(payload, secret, expiresIn)` 与 `verifyJwt(token, secret)`
  - [x] payload 包含 `userId`、`email`、`bgmUid?`、`iat`、`exp`
- [x] Task 21: 实现 D1 数据访问层 `server/src/db/users.js`
  - [x] 导出 `createUser({ id, email, passwordHash, salt, createdAt, updatedAt })`
  - [x] 导出 `getUserByEmail(email)`、`getUserById(id)`
  - [x] 导出 `updateUserBgmBinding(id, bgmUid, bgmTokenEncrypted)`
  - [x] 导出 `getUserBgmToken(id)`（返回解密后的 token）
  - [x] 所有函数接收 D1 binding 作为第一个参数
- [x] Task 22: 实现认证服务 `server/src/services/auth.js`
  - [x] `registerUser(db, env, { email, password })` → 创建用户 + 返回 JWT
  - [x] `loginUser(db, env, { email, password })` → 验证密码 + 返回 JWT
  - [x] `bindBangumi(db, env, userId, bangumiToken)` → 验证 token + 加密存储 + 更新用户
  - [x] `refreshJwt(db, env, oldToken)` → 验证旧 token + 签发新 token
- [x] Task 23: 实现 JWT 认证中间件 `server/src/middleware/jwtAuth.js`
  - [x] 从 `Authorization: Bearer <token>` 提取 JWT
  - [x] 验证签名与有效期
  - [x] 将 `userId`、`email`、`bgmUid` 注入 `c.set('user', ...)`
  - [x] 未携带 token 或无效时返回 401
- [x] Task 24: 实现认证路由 `server/src/routes/auth.js`
  - [x] `POST /api/v1/auth/register` → 调用 `registerUser`
  - [x] `POST /api/v1/auth/login` → 调用 `loginUser`
  - [x] `POST /api/v1/auth/refresh` → 调用 `refreshJwt`
  - [x] `POST /api/v1/auth/bind-bangumi` → jwtAuth + 调用 `bindBangumi`
  - [x] `GET /api/v1/auth/me` → jwtAuth + 返回当前用户信息（含绑定状态）
  - [x] `DELETE /api/v1/auth/bind-bangumi` → jwtAuth + 解绑
  - [x] 输入校验：email 格式、password ≥ 8 字符
- [x] Task 25: 集成认证路由到 `app.js`
  - [x] `app.route('/api/v1/auth', authRoutes)`
  - [x] 速率限制：注册/登录接口 5 次/分钟（覆盖默认 10 次/分钟）
- [x] Task 26: 改造前端 `client/src/stores/auth.js`
  - [x] 支持 `bangmioToken`（JWT）与 `bangumiToken` 双 token 存储
  - [x] `loginWithBangmio(email, password)` → 调用 `/auth/login`，存 `bangmioToken`
  - [x] `loginWithBangumi(token)` → 存 `bangumiToken`（不调 D1）
  - [x] `bindBangumi(bgmToken)` → 调用 `/auth/bind-bangumi`，更新 `bangmioToken` 中的 bgmUid
  - [x] `isBangmioUser()` / `isBangumiDirectUser()` / `isBound()` 计算属性
  - [x] `logout()` 清空两个 token
- [x] Task 27: 改造前端 `client/src/api/index.js` 拦截器
  - [x] 请求拦截器：优先使用 `bangumiToken`（番剧功能），其次 `bangmioToken`（账号功能）
  - [x] Bangmio 用户调用番剧功能时，从 store 读取绑定的 bgmToken（已在前端缓存）
  - [x] 响应拦截器：401 时自动 refresh JWT，refresh 失败则跳转登录
- [x] Task 28: 创建 `client/src/views/Register.vue` 注册页
  - [x] 表单：邮箱 + 密码 + 确认密码
  - [x] 调用 `registerWithBangmio` → 自动登录 → 跳转首页
  - [x] 注册成功后引导绑定 Bangumi（可选，跳过则首次使用番剧功能时弹窗）
- [x] Task 29: 改造 `client/src/views/Login.vue` 双 Tab 登录
  - [x] Tab 1：Bangmio 账号（邮箱 + 密码）→ 默认展示
  - [x] Tab 2：Bangumi 直登（OAuth + Token）→ 折叠
  - [x] 底部「还没账号？立即注册」链接 → 跳转 `/register`
- [x] Task 30: 创建「绑定 Bangumi」弹窗组件 `client/src/components/BindBangumiModal.vue`
  - [x] 触发条件：Bangmio 用户未绑定，尝试调用番剧功能
  - [x] 提供「立即绑定」（输入 Bangumi access_token）与「切换为 Bangumi 直登」两个选项
  - [x] 绑定成功后关闭弹窗，继续原操作
- [x] Task 31: 改造 `client/src/router/index.js` 添加路由守卫
  - [x] 添加 `/register` 路由
  - [x] 番剧功能页（如 `/watching`、`/profile`）守卫：Bangmio 用户未绑定时弹窗，Bangumi 直登用户直接放行
- [x] Task 32: 更新环境变量模板
  - [x] `.dev.vars.example` 添加 `JWT_SECRET`、`BGMIO_SALT`、`D1_DATABASE_ID`
  - [x] `client/.env.example` 无需新增（前端只用 localStorage）
- [x] Task 33: 认证系统单元测试
  - [x] `crypto.test.js`：hashPassword/verifyPassword、encryptToken/decryptToken
  - [x] `jwt.test.js`：signJwt/verifyJwt、过期 token、无效签名
  - [x] `auth.test.js`：registerUser/loginUser/bindBangumi 完整流程（mock D1）
- [x] Task 34: 账号体系集成测试
  - [x] Bangmio 注册 → 登录 → 绑定 Bangumi → 调用番剧功能（mock）
  - [x] Bangumi 直登 → 直接调用番剧功能
  - [x] 未绑定 Bangmio 用户调用番剧功能 → 403 + 引导绑定

## 维度七：最终验证

- [x] Task 35: 全量测试与构建
  - [x] `npm run lint` 无错误
  - [x] `npm test` 全部通过（含新增测试）
  - [x] `npm run build` 成功
  - [x] bundle 体积较优化前未显著增长（< +50KB）
- [ ] Task 36: 部署验证
  - [ ] git push 触发 CF Pages 自动部署
  - [ ] 线上 `/api/v1/auth/register` 与 `/api/v1/auth/login` 可用
  - [ ] 线上 `/api/v1/douban/page/:id` 返回清洗后 HTML
  - [ ] 线上 `/api/v1/moegirl/page/:name` 返回清洗后 HTML
  - [ ] 线上小组列表可加载（或显示兜底数据）
  - [ ] D1 数据库可读写（通过 `/api/v1/auth/me` 验证）

# Task Dependencies

## 串行依赖

- Task 6（IframeEmbed 组件）依赖 Task 5/9（页面代理路由先行，便于测试）
- Task 7（豆瓣 Tab 重构）依赖 Task 5、Task 6
- Task 10（萌娘 Tab 重构）依赖 Task 9、Task 6
- Task 13（状态同步测试）依赖 Task 12
- Task 15（CollectionButton 重构）依赖 Task 14
- Task 16（其他页面重构）依赖 Task 14
- Task 17（分类用语测试）依赖 Task 14
- Task 21（D1 数据访问层）依赖 Task 18（D1 配置）
- Task 22（认证服务）依赖 Task 19、20、21
- Task 23（JWT 中间件）依赖 Task 20
- Task 24（认证路由）依赖 Task 22、23
- Task 25（app.js 集成）依赖 Task 24
- Task 26（前端 auth store）依赖 Task 24
- Task 27（API 拦截器）依赖 Task 26
- Task 28-31（前端页面改造）依赖 Task 26、27
- Task 33（单元测试）依赖 Task 19-22
- Task 34（集成测试）依赖 Task 25、26
- Task 35-36（最终验证）依赖所有前置任务

## 可并行启动（无依赖）

- Task 1（小组排查）+ Task 12（状态同步）+ Task 14（分类用语映射）+ Task 18（D1 配置）+ Task 19（crypto 工具）+ Task 20（jwt 工具）+ Task 5（豆瓣代理）+ Task 9（萌娘代理）

## 建议执行批次

1. **第一批（独立工具层）**：Task 1, 12, 14, 18, 19, 20, 5, 9 并行
2. **第二批（组件与服务层）**：Task 2-4, 6, 7, 10, 13, 15, 16, 17, 21 并行
3. **第三批（账号体系核心）**：Task 22, 23, 24, 25 串行
4. **第四批（前端账号改造）**：Task 26, 27, 28, 29, 30, 31 并行
5. **第五批（测试与验证）**：Task 8, 11, 32, 33, 34, 35, 36
