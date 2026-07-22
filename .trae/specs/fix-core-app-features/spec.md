# 应用核心功能修复 Spec

## Why

当前 Bangmio v4 用户反馈存在 5 个影响日常使用的功能问题：登录成功后仍残留失败提示、小组功能频繁提示“服务暂不可用”、豆瓣/萌娘百科嵌入加载超时、音乐 Tab 只有外链无法播放、移动端竖屏 UI 体验不佳。本 spec 在不回退 `fix-six-core-issues`、`embed-douban-moegirl-stable` 等已完成成果的前提下，对这些问题进行针对性修复与体验优化。

## What Changes

### 1. 登录功能修复

- 统一并提前清空登录错误状态：输入变化、Tab 切换、提交开始时、登录成功后均清空 `auth.error`。
- `Login.vue` 中 Bangmio/Bangumi Token/OAuth 三种登录入口共用错误清除逻辑，避免旧错误残留。
- 登录成功后的跳转逻辑不再被 catch 块中的错误提示覆盖。
- 对后端异常响应（无 token / 格式错误）给出明确提示，而不是笼统“登录失败”。

### 2. 小组功能修复

- 服务端 `groups.js` 增加顶层防御性异常处理，解析异常时立即返回本地兜底小组数据，避免 500。
- 优化 `fetchHTMLMulti` 的容错：单个候选源异常不影响后续候选，全部失败后返回兜底。
- 客户端 `Groups.vue` / `GroupDetail.vue` 区分“网络错误 / 服务异常 / 数据为空 / 占位数据”四种状态，避免一律显示“服务暂不可用”。
- 小组详情返回占位数据（`name === id`）时显示“小组信息暂不可用”并提供 Bangumi 原站链接。

### 3. 外部数据加载优化

- 改造 `http.js`：`fetchHTMLMulti` 支持整体超时 + 并发择优，单个源失败时支持一次重试，减少串行等待。
- `IframeEmbed.vue` 调整超时策略（首次 10s、重试 15s），超时后自动触发 `fallback` 事件。
- `douban.js` / `moegirl.js` 缩短反爬/超时场景的响应时间，优先返回带直达链接的降级 HTML。
- `ExternalEmbedFallback.vue` 对“加载超时”给出明确文案和重试入口。

### 4. 音乐卡片嵌入式播放改造

- 新增服务端 `/api/v1/music/search?q=` 路由，按名称搜索网易云音乐，返回候选曲目（id、名称、歌手、封面）。
- 新增 `MusicCard.vue` 组件：将音乐条目以卡片形式展示，点击后内嵌网易云播放器 iframe，支持播放/暂停。
- `Detail.vue` 音乐 Tab 由纯链接列表改为 `MusicCard` 卡片网格，保留网易云/B站搜索作为降级入口。
- 搜索失败或无结果时，组件降级为原有的搜索链接，不影响功能可用性。

### 5. 移动端竖屏 UI 更新

- 全局布局：小屏移除侧边栏空白，底部导航增加“小组”入口，增加 `env(safe-area-inset-bottom)` 适配刘海屏。
- `Home.vue`：在追列表与详情面板在竖屏下改为上下堆叠，增大列表项点击区域。
- `Watching.vue`：竖屏下收藏列表与详情面板上下堆叠，剧集按钮适配小屏宽度。
- `Profile.vue`：竖屏下主栏与侧边栏堆叠，统计卡片保持 2 列，收藏封面横向滚动适配。
- `Detail.vue`：竖屏下 Hero 区域垂直居中、Tab bar 横向滚动、音乐/评分/豆瓣卡片单列展示。
- 调整 `main.css` / `tailwind.config.js` 的 `anime-grid` 与间距 token，优化 xs 屏幕显示。

## Impact

- **Affected specs**:
  - `fix-six-core-issues/spec.md`（登录、小组、外部嵌入基础已在此完成，本 spec 在其上修复回归问题）
  - `embed-douban-moegirl-stable/spec.md`（外部数据超时优化与降级策略）
  - `project-wide-optimization/spec.md`（HTTP 工具与响应式布局）
  - `ui-detail-refinement/spec.md`（Detail 页 Tab 与音乐展示）
- **Affected code**:
  - 前端：`Login.vue`、`stores/auth.js`、`api/index.js`、`Groups.vue`、`GroupDetail.vue`、`IframeEmbed.vue`、`ExternalEmbedFallback.vue`、`Detail.vue`、新增 `MusicCard.vue`、`App.vue`、`Navbar.vue`、`Sidebar.vue`、`Home.vue`、`Watching.vue`、`Profile.vue`、`main.css`
  - 后端：`server/src/routes/groups.js`、`server/src/utils/http.js`、`server/src/routes/douban.js`、`server/src/routes/moegirl.js`、新增 `server/src/routes/music.js` 与 `server/src/services/music.js`

## ADDED Requirements

### Requirement: 登录成功后不显示失败提示

系统 SHALL 保证登录成功后前端不再展示之前的失败提示。

#### Scenario: Bangmio 账号登录成功

- **WHEN** 用户输入正确邮箱密码并提交
- **THEN** 提交开始时清空错误提示，登录成功后跳转首页，页面不再显示任何失败提示

#### Scenario: 登录失败后再次成功

- **WHEN** 用户首次输入错误密码，然后修正并再次提交
- **THEN** 首次显示错误提示，第二次提交时清除旧提示，成功后不再显示错误

#### Scenario: Bangumi Token 登录成功

- **WHEN** 用户在 Bangumi 直登 Tab 输入有效 Access Token 并提交
- **THEN** 提交开始时清空错误提示，验证成功后跳转首页，无失败提示残留

### Requirement: 小组功能可用且提示明确

系统 SHALL 在 Bangumi 上游不可用时仍能展示兜底小组数据，并对不可用状态给出明确说明。

#### Scenario: 小组列表加载失败

- **WHEN** `/api/v1/groups` 上游抓取全部失败
- **THEN** 后端返回兜底小组列表，前端正常展示；若后端返回占位数据，前端显示“小组信息暂不可用”并提供 Bangumi 原站链接

#### Scenario: 小组详情加载失败

- **WHEN** `/api/v1/groups/:id` 上游抓取失败且无缓存
- **THEN** 后端返回兜底小组基本数据，前端展示兜底信息并提供“前往 Bangumi 查看”入口

### Requirement: 外部数据加载超时优化

系统 SHALL 优化豆瓣/萌娘百科加载策略，减少“加载超时，请重试”出现概率，超时后提供降级内容。

#### Scenario: 豆瓣页面加载慢

- **WHEN** 用户进入豆瓣 Tab 且网络较慢
- **THEN** 整体等待时间不超过 12s，超时或反爬时自动展示含直达链接的降级卡片

#### Scenario: 萌娘百科候选源超时

- **WHEN** 萌娘百科国内源超时
- **THEN** 自动尝试海外源，全部失败后在 15s 内展示降级卡片

#### Scenario: 连续失败触发 fallback

- **WHEN** 同一嵌入组件连续 2 次加载失败/超时
- **THEN** 自动触发 `fallback` 事件，展示结构化摘要或直达链接

### Requirement: 音乐嵌入式播放

系统 SHALL 在番剧详情页音乐 Tab 提供可播放的嵌入式音乐卡片。

#### Scenario: 搜索到网易云音乐

- **WHEN** 音乐 Tab 中某条目点击播放
- **THEN** 组件调用 `/api/v1/music/search?q=曲目名`，选取最佳匹配并嵌入网易云播放器 iframe，用户可播放/暂停

#### Scenario: 无搜索结果

- **WHEN** 搜索无匹配曲目
- **THEN** 卡片保留网易云/B站搜索链接，用户可跳转查找

### Requirement: 移动端竖屏优化

系统 SHALL 保证各核心页面在竖屏手机下布局合理、操作可用、无横向溢出。

#### Scenario: 首页竖屏浏览

- **WHEN** 用户在手机竖屏打开首页
- **THEN** 在追列表与详情面板上下堆叠，热门新番网格适配屏幕宽度，底部导航可见且点击区域不小于 44px

#### Scenario: 详情页竖屏浏览

- **WHEN** 用户在手机竖屏打开番剧详情
- **THEN** Hero 海报与信息垂直居中，Tab bar 可横向滑动，音乐/评分/豆瓣卡片单列展示

#### Scenario: 个人主页竖屏浏览

- **WHEN** 用户在手机竖屏打开个人主页
- **THEN** 主栏与侧边栏上下堆叠，统计卡片 2 列，收藏封面横向滚动不溢出

## MODIFIED Requirements

### Requirement: 登录页错误展示行为

原登录页错误提示在部分成功路径下未及时清空，MODIFIED 为：任何登录入口在提交开始时即清空错误，成功后确保不再显示。

### Requirement: 小组错误提示

原“服务暂不可用，请稍后再试”提示过于笼统，MODIFIED 为区分网络错误、服务异常、数据为空、占位数据四种状态，并始终提供重试与原站入口。

### Requirement: 豆瓣/萌娘百科加载策略

原串行候选源超时时间较长，MODIFIED 为整体超时 + 并发择优 + 超时降级，提升加载成功率。

### Requirement: 音乐 Tab 展示形式

原音乐 Tab 仅展示外链列表，MODIFIED 为嵌入式播放卡片网格，外链作为降级入口。

### Requirement: 移动端响应式布局

原部分页面在竖屏下存在布局紧凑、点击区域过小问题，MODIFIED 为针对 xs/sm 断点重新调整间距、堆叠顺序与导航入口。

## REMOVED Requirements

无。
