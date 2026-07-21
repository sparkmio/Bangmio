# Checklist

## 维度一：小组功能异常修复

- [ ] Task 1 已执行：本地访问 `/api/v1/groups` 与 `/api/v1/groups/1` 验证接口可用性，记录失败原因
- [ ] `Groups.vue` 移除硬编码「加载小组失败」
- [ ] `Groups.vue` 实现「网络错误」「接口异常」「数据为空」三种错误分类提示
- [ ] `Groups.vue` 加载失败时显示「重试」按钮，点击重新发起请求
- [ ] `Groups.vue` 数据为空时展示兜底小组列表
- [ ] `GroupDetail.vue` 实现同上错误分类与重试机制
- [ ] `GroupDetail.vue` 小组不存在时返回 404 友好提示
- [ ] `server/src/routes/groups.js` 列表接口在所有源失败时返回兜底数据
- [ ] `server/src/routes/groups.js` 详情接口在抓取失败时返回缓存数据（若有）

## 维度二：豆瓣评分 iframe 嵌套 + 广告过滤

- [ ] `server/src/routes/douban.js` 新增 `/api/v1/douban/page/:id` 路由
- [ ] 路由抓取 `https://movie.douban.com/subject/:id/` 并使用 node-html-parser 解析
- [ ] 清洗规则移除：`.top-nav-wrapper`、`.nav-wrapper`、`#dale_movie_subject_top_icon`、`.sidebar`、`#recommendations`、`.extra`、广告 iframe、`<script>`
- [ ] 清洗后保留评分区、短评区、长评区
- [ ] 失败时返回 502 错误
- [ ] `client/src/components/IframeEmbed.vue` 通用组件已创建
- [ ] IframeEmbed 使用 `srcdoc` 嵌入 HTML 避免跨域
- [ ] IframeEmbed 加载中显示骨架屏
- [ ] IframeEmbed 加载失败显示错误占位 + 重试按钮
- [ ] IframeEmbed 高度自适应
- [ ] `Detail.vue` 豆瓣 Tab 保留评分数字展示
- [ ] `Detail.vue` 豆瓣 Tab 评论区域替换为 IframeEmbed
- [ ] `Detail.vue` 豆瓣 Tab 移除原短评/长评列表组件
- [ ] 豆瓣页面代理单元测试通过（mock fetchHTML 验证清洗规则）

## 维度三：萌娘百科 iframe 嵌套 + 广告过滤

- [ ] `server/src/routes/moegirl.js` 新增 `/api/v1/moegirl/page/:name` 路由
- [ ] 路由抓取 `https://zh.moegirl.org.cn/:name` 并解析
- [ ] 清洗规则仅保留 `.mw-parser-output` 内容
- [ ] 清洗规则移除：`.header`、`.footer`、`#mw-navigation`、`.sidebar`、`.mw-editsection`、广告位、`<script>`
- [ ] `Detail.vue` 萌娘 Tab 替换为 IframeEmbed 组件
- [ ] 页面名通过 `/api/v1/moegirl/search?q=番剧名` 获取
- [ ] `Detail.vue` 萌娘 Tab 移除原摘要展示组件
- [ ] 萌娘页面代理单元测试通过

## 维度四：番剧详情页状态同步优化

- [ ] `CollectionButton.vue` 引入 `lastSyncedState` ref
- [ ] `lastSyncedState` 记录 `{ type, ep_status, comment, tags, score }` 五个维度
- [ ] 详情页加载时仅读取状态，不调用更新接口
- [ ] 用户修改状态时对比当前状态与 `lastSyncedState`
- [ ] 任一维度变化才触发同步请求
- [ ] 同步请求 500ms 防抖
- [ ] 同步成功后更新 `lastSyncedState`
- [ ] 单元测试覆盖：未修改不触发、修改触发、连续修改防抖、同步成功后状态更新

## 维度五：分类用语规范化

- [ ] `client/src/utils/subjectType.js` 已创建
- [ ] 导出 `SUBJECT_TYPE_NAMES` 常量（1→书籍、2→动画、3→音乐、4→游戏、6→三次元）
- [ ] 导出 `getStatusLabels(subjectType)` 函数
- [ ] 导出 `getStatusOptions(subjectType)` 函数
- [ ] 未知 type 默认返回动画用语
- [ ] `CollectionButton.vue` 接收 `subjectType` prop
- [ ] `CollectionButton.vue` 状态选项从 `getStatusOptions(subjectType)` 动态生成
- [ ] `Profile.vue` 状态用语从映射表读取
- [ ] `Watching.vue` 状态用语从映射表读取
- [ ] `Home.vue` 状态用语从映射表读取
- [ ] 全局 Grep 搜索无硬编码的「在看/想看/看过/在玩/在读/在听」（除注释外）
- [ ] 分类用语单元测试通过（4 种 type + 未知 type）

## 维度六：账号体系重构

### 数据库与配置

- [ ] `wrangler.toml` 添加 D1 binding `DB`
- [ ] `server/db/schema.sql` 包含 users 表建表语句
- [ ] `.dev.vars.example` 添加 `JWT_SECRET`、`BGMIO_SALT`、`D1_DATABASE_ID`
- [ ] D1 数据库已通过 `npx wrangler d1 create bangmio-users` 创建（部署时）

### 后端工具层

- [ ] `server/src/utils/crypto.js` 已创建
- [ ] 实现 `hashPassword(password, salt)` 使用 PBKDF2-SHA256
- [ ] 实现 `verifyPassword(password, salt, hash)`
- [ ] 实现 `generateSalt()` 生成 16 字节随机 salt
- [ ] 实现 `encryptToken(token, key)` 使用 AES-GCM
- [ ] 实现 `decryptToken(encrypted, key)`
- [ ] `server/src/utils/jwt.js` 已创建
- [ ] 实现 `signJwt(payload, secret, expiresIn)` 使用 HS256
- [ ] 实现 `verifyJwt(token, secret)`
- [ ] payload 包含 `userId`、`email`、`bgmUid?`、`iat`、`exp`

### 后端服务与路由

- [ ] `server/src/db/users.js` 已创建
- [ ] 实现 `createUser`、`getUserByEmail`、`getUserById`、`updateUserBgmBinding`、`getUserBgmToken`
- [ ] `server/src/services/auth.js` 已创建
- [ ] 实现 `registerUser`、`loginUser`、`bindBangumi`、`refreshJwt`
- [ ] `server/src/middleware/jwtAuth.js` 已创建
- [ ] JWT 中间件从 Authorization 头提取 token
- [ ] JWT 中间件验证签名与有效期
- [ ] JWT 中间件将 user 信息注入 context
- [ ] JWT 中间件未携带/无效 token 返回 401
- [ ] `server/src/routes/auth.js` 已创建
- [ ] `POST /api/v1/auth/register` 实现注册（email + password）
- [ ] `POST /api/v1/auth/login` 实现登录
- [ ] `POST /api/v1/auth/refresh` 实现 token 刷新
- [ ] `POST /api/v1/auth/bind-bangumi` 实现 Bangumi 绑定（需 JWT）
- [ ] `GET /api/v1/auth/me` 返回当前用户信息（含绑定状态）
- [ ] `DELETE /api/v1/auth/bind-bangumi` 实现解绑
- [ ] 输入校验：email 格式、password ≥ 8 字符
- [ ] `app.js` 集成 `app.route('/api/v1/auth', authRoutes)`
- [ ] 注册/登录接口速率限制 5 次/分钟

### 前端账号改造

- [ ] `client/src/stores/auth.js` 支持 `bangmioToken` 与 `bangumiToken` 双 token
- [ ] 实现 `loginWithBangmio(email, password)`
- [ ] 实现 `loginWithBangumi(token)`
- [ ] 实现 `bindBangumi(bgmToken)`
- [ ] 实现 `isBangmioUser()` / `isBangumiDirectUser()` / `isBound()` 计算属性
- [ ] `client/src/api/index.js` 拦截器优先使用 `bangumiToken`
- [ ] Bangmio 用户调用番剧功能时从 store 读取绑定的 bgmToken
- [ ] 401 响应自动 refresh JWT
- [ ] `client/src/views/Register.vue` 已创建
- [ ] 注册页表单：邮箱 + 密码 + 确认密码
- [ ] 注册成功自动登录并跳转首页
- [ ] `client/src/views/Login.vue` 改造为双 Tab
- [ ] Tab 1：Bangmio 账号（邮箱 + 密码）默认展示
- [ ] Tab 2：Bangumi 直登（OAuth + Token）折叠
- [ ] 底部「立即注册」链接跳转 `/register`
- [ ] `client/src/components/BindBangumiModal.vue` 已创建
- [ ] 弹窗触发条件：Bangmio 用户未绑定尝试调用番剧功能
- [ ] 提供「立即绑定」与「切换为 Bangumi 直登」两个选项
- [ ] `client/src/router/index.js` 添加 `/register` 路由
- [ ] 番剧功能页守卫：Bangmio 用户未绑定时弹窗

### 测试

- [ ] `crypto.test.js` 覆盖 hashPassword/verifyPassword、encryptToken/decryptToken
- [ ] `jwt.test.js` 覆盖 signJwt/verifyJwt、过期 token、无效签名
- [ ] `auth.test.js` 覆盖 registerUser/loginUser/bindBangumi 完整流程
- [ ] 集成测试：Bangmio 注册 → 登录 → 绑定 Bangumi → 调用番剧功能
- [ ] 集成测试：Bangumi 直登 → 直接调用番剧功能
- [ ] 集成测试：未绑定 Bangmio 用户调用番剧功能 → 403 + 引导绑定

## 维度七：最终验证

- [ ] `npm run lint` 无错误
- [ ] `npm test` 全部通过（含新增测试）
- [ ] `npm run build` 成功
- [ ] bundle 体积较优化前未显著增长（< +50KB）
- [ ] git push 触发 CF Pages 自动部署成功
- [ ] 线上 `/api/v1/auth/register` 与 `/api/v1/auth/login` 可用
- [ ] 线上 `/api/v1/douban/page/:id` 返回清洗后 HTML
- [ ] 线上 `/api/v1/moegirl/page/:name` 返回清洗后 HTML
- [ ] 线上小组列表可加载（或显示兜底数据）
- [ ] D1 数据库可读写（通过 `/api/v1/auth/me` 验证）
- [ ] iframe 嵌套页面无广告残留
- [ ] 分类用语在 4 种 subject type 下均正确显示
- [ ] 番剧详情页未修改状态时不发起同步请求
