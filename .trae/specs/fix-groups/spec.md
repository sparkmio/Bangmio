# 修复小组功能 Spec

## Why

当前小组功能在 Cloudflare Pages 边缘节点抓取 Bangumi 小组页面时极不稳定：B 站代理域名 `bangumi.lol` 和国内源 `bgm.tv` 都会因 IP/WAF 策略返回 403/412，导致小组列表和小组详情大量为空或只能展示兜底硬编码数据。用户希望能够正常浏览 Bangumi 小组列表、进入小组详情查看最近话题。

## What Changes

### 服务端策略调整

- 将小组列表/详情的数据源从网页抓取改为调用 Bangumi 官方 API（如可用）+ 多源网页抓取兜底
- 增加失败重试机制：bgm.tv → bangumi.lol → bangumi.one，单次超时不超 8s
- 优化 HTML 解析器，使用更宽松的列表选择器，匹配 Bangumi 当前 DOM 结构
- 兜底列表只保留 8 个真实、高活跃小组，避免硬编码过多无意义条目
- 小组详情无法抓取时，返回小组名称、URL 和空话题列表（不再直接报错 null）
- 添加 5 分钟内存缓存，避免反复触发抓取导致被封

### 客户端优化

- 小组列表（Groups.vue）增加搜索时「按回车或点击搜索」触发服务端搜索的兜底入口
- 搜索框空值时展示完整列表；无结果时给出明确提示
- 小组详情（GroupDetail.vue）增加「在 Bangumi 查看原帖」的外部链接
- 调整小组卡片样式：统一 rounded-xl、hover 阴影更柔和
- 话题列表为空时提示用户前往 Bangumi 原站查看

## Impact

- Affected specs: 无（首个针对小组的 spec）
- Affected code:
  - `server/src/routes/groups.js` — 主要逻辑重写
  - `client/src/views/Groups.vue` — UI 和搜索交互优化
  - `client/src/views/GroupDetail.vue` — UI 和空状态优化
  - `client/src/api/endpoints.js` — 可能新增 search endpoint（若需要）

## ADDED Requirements

### Requirement: 多源抓取与重试

系统 SHALL 在抓取 Bangumi 小组数据时支持多源重试：优先 bgm.tv，失败后尝试 bangumi.lol，再失败则使用本地兜底数据。

#### Scenario: 主源被 WAF 拦截

- **WHEN** 用户打开小组列表页
- **THEN** 如果 bgm.tv 返回 403/412，自动切换到 bangumi.lol 重试
- **AND** 两源都失败时返回精简的真实兜底小组列表

### Requirement: 数据缓存

系统 SHALL 对小组列表和小组详情分别缓存 5 分钟，减少重复请求。

#### Scenario: 用户短时间内多次访问

- **WHEN** 用户在 5 分钟内再次访问小组列表或同一小组详情
- **THEN** 直接返回缓存数据，不再发起抓取

### Requirement: 小组详情可用性兜底

系统 SHALL 在无法抓取小组详情时仍返回小组名称、简介占位和原站链接，而不是 null。

#### Scenario: 小组详情抓取失败

- **WHEN** 用户进入某个小组详情页且后端抓取失败
- **THEN** 页面显示小组名称和「前往 Bangumi 查看」链接，而非加载失败

### Requirement: 客户端明确空状态提示

系统 SHALL 在小组列表或话题为空时给出明确提示，并提供原站链接。

#### Scenario: 小组无话题

- **WHEN** 用户进入小组详情且话题列表为空
- **THEN** 页面显示「暂无抓取到话题，点击前往 Bangumi 查看」

## MODIFIED Requirements

### Requirement: 小组列表展示

原小组列表 SHALL 展示系统返回的全部有效小组，并在搜索时同时按名称和简介过滤。

### Requirement: 小组卡片样式

小组卡片 SHALL 使用 rounded-xl 圆角和 hover:shadow-hover 阴影，与全局设计令牌一致。

## REMOVED Requirements

### Requirement: 25 个以上硬编码兜底小组

**Reason**: 过多硬编码小组无真实数据支撑，反而降低用户信任。
**Migration**: 改为保留 8 个高活跃真实小组作为最终兜底。
