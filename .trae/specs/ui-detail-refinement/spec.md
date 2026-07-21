# UI 细节优化 Spec

## Why

当前 UI 已还原到旧版布局，整体功能正常但视觉细节偏粗糙：圆角不统一、卡片间距偏紧、hover 动效生硬、loading 状态简陋。需要在不改变布局的前提下，通过卡片尺寸、动效、圆角等细节打磨，让整体观感更加现代化、整洁简约。

## What Changes

### 全局设计令牌

- 在 `tailwind.config.js` 中新增统一的圆角令牌（`rounded-card`、`rounded-pill`）和阴影令牌（`shadow-card`、`shadow-hover`）
- 在 `main.css` 中统一 `anime-grid` 间距，从 `1.25rem` 调整为 `1.5rem`（桌面）/ `1rem`（移动端）
- 优化全局滚动条样式，使其更细更柔和

### AnimeCard 组件

- 圆角从 `rounded-lg` 统一为 `rounded-xl`（12px），视觉更柔和
- hover 动效从 `group-hover:-translate-y-1.5` 调整为 `group-hover:-translate-y-1`，更克制
- hover 阴影从 `shadow-lg` 调整为自定义 `shadow-hover`（更柔和的扩散）
- 海报渐变遮罩从 `from-black/50` 调整为 `from-black/60`，提升文字可读性
- 评分 badge 从 `bg-black/70` 调整为 `bg-black/60 backdrop-blur-sm`，更通透
- 入场动画从 `gsap.fromTo` 改为 CSS `@keyframes` + `animation`，减少 JS 依赖，更流畅
- 图片加载时增加骨架占位背景色

### 按钮与 Tab 组件

- 各页面 Tab 按钮从 `rounded-md` 统一为 `rounded-full`（胶囊式），更现代
- 选中态从 `bg-primary text-white` 调整为 `bg-primary text-primary-content shadow-sm`
- 未选中态增加 `hover:bg-base-200/80` 过渡，更柔和

### Detail.vue

- Hero 区域海报圆角从 `rounded-xl` 调整为 `rounded-2xl`
- 评分卡片圆角统一为 `rounded-xl`
- Tab 栏底部边框从 `border-base-300/30` 调整为 `border-base-300/50`，更清晰
- 章节列表项圆角从 `rounded-lg` 调整为 `rounded-xl`
- 角色头像 hover 从 `ring-primary` 调整为 `ring-primary/40`，更柔和

### Home.vue

- 在追列表项的选中态边框从 `border-l-2` 调整为 `border-l-2 border-primary` + 左侧内边距微调
- 集数按钮从 `w-8 h-7 rounded` 调整为 `w-9 h-8 rounded-lg`，更易点击
- 弹窗圆角从 `rounded-xl` 调整为 `rounded-2xl`，阴影更柔和

### LoadingState 组件

- 增加骨架屏模式（skeleton），在 AnimeCard 网格加载时显示灰色占位卡片
- spinner 颜色从 `text-primary` 调整为 `text-primary/60`，更柔和

### 页面转场动效

- App.vue 路由转场从 GSAP `y: 12` 调整为 `y: 8`，更克制
- 转场时长从 `0.3s` 调整为 `0.25s`，更利落
- AnimeCard 入场动画使用 CSS stagger 延迟，替代 GSAP 逐个触发

## Impact

- Affected specs: 无（首个 spec）
- Affected code:
  - `client/tailwind.config.js` — 新增设计令牌
  - `client/src/assets/main.css` — 全局样式、动画 keyframes
  - `client/src/components/AnimeCard.vue` — 卡片圆角、动效、骨架
  - `client/src/components/LoadingState.vue` — 骨架屏模式
  - `client/src/views/Detail.vue` — 圆角、边框统一
  - `client/src/views/Home.vue` — Tab、集数按钮、弹窗细节
  - `client/src/views/Browse.vue` — Tab 按钮样式
  - `client/src/views/Trending.vue` — Tab 按钮样式
  - `client/src/App.vue` — 转场动效微调

## ADDED Requirements

### Requirement: 统一圆角系统

系统 SHALL 使用统一的圆角令牌：卡片使用 12px（`rounded-xl`），弹窗使用 16px（`rounded-2xl`），按钮/Tab 使用全圆角（`rounded-full`）。

#### Scenario: 卡片圆角一致

- **WHEN** 用户浏览首页或搜索页
- **THEN** 所有 AnimeCard 海报外框圆角为 12px，视觉统一

### Requirement: 卡片 hover 动效

系统 SHALL 在 AnimeCard hover 时展示克制而流畅的动效：轻微上浮（4px）、柔和阴影扩散、海报内缩放（1.03），过渡时长 300ms。

#### Scenario: hover 卡片

- **WHEN** 用户鼠标悬停在番剧卡片上
- **THEN** 卡片轻微上浮，阴影柔和扩散，海报轻微放大

### Requirement: 骨架屏加载

系统 SHALL 在数据加载期间展示骨架屏占位，而非仅显示 spinner。

#### Scenario: 加载番剧列表

- **WHEN** 番剧列表正在加载
- **THEN** 显示与卡片布局一致的灰色骨架占位卡片

### Requirement: 统一 Tab 按钮样式

系统 SHALL 将所有页面中的 Tab/筛选按钮统一为胶囊式（`rounded-full`），选中态带轻微阴影。

#### Scenario: 切换筛选

- **WHEN** 用户在搜索页或首页切换类型筛选
- **THEN** 按钮为圆角胶囊形，选中态有阴影，过渡平滑

## MODIFIED Requirements

### Requirement: 页面转场动效

路由切换时 SHALL 展示克制转场：内容向上滑入 8px + 淡入，时长 250ms，ease-out。

### Requirement: 全局滚动条

全局滚动条 SHALL 宽 5px，圆角全圆，颜色为 primary 色 20% 透明度，hover 时 40%。

### Requirement: anime-grid 间距

`anime-grid` SHALL 使用 1.5rem（桌面）/ 1rem（移动端）间距，卡片最小宽度 160px。
