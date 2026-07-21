# Tasks

- [x] Task 1: 在 tailwind.config.js 中新增设计令牌（圆角、阴影、动画）
  - [x] 新增 `borderRadius` 扩展：`card: 0.75rem`，`pill: 9999px`
  - [x] 新增 `boxShadow` 扩展：`card: 0 2px 8px -2px rgba(0,0,0,0.08)`，`hover: 0 8px 24px -6px rgba(0,0,0,0.12)`
  - [x] 新增 `animation` 和 `keyframes` 扩展：`card-in` 入场动画

- [x] Task 2: 更新 main.css 全局样式
  - [x] 调整 `anime-grid` 间距为 `1.5rem` / 移动端 `1rem`，`minmax(160px, 1fr)`
  - [x] 优化滚动条宽度为 5px，圆角全圆，透明度调整
  - [x] 新增 `@keyframes cardIn` CSS 动画（opacity 0→1, translateY 12px→0, 300ms）
  - [x] 新增 `.skeleton` 骨架屏样式类（渐变 shimmer 动画）

- [x] Task 3: 优化 AnimeCard.vue 组件
  - [x] 外框圆角从 `rounded-lg` 改为 `rounded-xl`
  - [x] hover 从 `-translate-y-1.5` 改为 `-translate-y-1`，阴影改用 `shadow-hover`
  - [x] 海报渐变遮罩从 `from-black/50` 改为 `from-black/60`
  - [x] 评分 badge 从 `bg-black/70` 改为 `bg-black/60 backdrop-blur-sm`
  - [x] 入场动画从 GSAP 改为 CSS class `animate-card-in` + stagger delay
  - [x] 图片加载时增加 `bg-base-300` 骨架背景色
  - [x] 移除 GSAP import 依赖

- [x] Task 4: 优化 LoadingState.vue 组件
  - [x] 新增 `skeleton` prop（Boolean）
  - [x] 当 skeleton=true 且 loading=true 时，渲染 8 个骨架卡片占位
  - [x] spinner 颜色从 `text-primary` 调整为 `text-primary/60`

- [x] Task 5: 统一各页面 Tab/筛选按钮样式
  - [x] Home.vue: typeTabs 按钮改为 `rounded-full`，选中态加 `shadow-sm`
  - [x] Browse.vue: typeOptions 按钮改为 `rounded-full`，选中态加 `shadow-sm`
  - [x] Trending.vue: 将 DaisyUI `tabs-boxed` 替换为自定义胶囊按钮，与全局一致

- [x] Task 6: 优化 Detail.vue 圆角与细节
  - [x] Hero 海报圆角从 `rounded-xl` 改为 `rounded-2xl`
  - [x] 评分/统计卡片圆角统一为 `rounded-xl`
  - [x] Tab 栏底部边框从 `border-base-300/30` 改为 `border-base-300/50`
  - [x] 章节列表项圆角从 `rounded-lg` 改为 `rounded-xl`
  - [x] 角色头像 hover ring 从 `ring-primary` 改为 `ring-primary/40`

- [x] Task 7: 优化 Home.vue 细节
  - [x] 集数按钮从 `w-8 h-7 rounded` 改为 `w-9 h-8 rounded-lg`
  - [x] 弹窗圆角从 `rounded-xl` 改为 `rounded-2xl`，阴影更柔和
  - [x] 在追列表项选中态增加左侧内边距微调

- [x] Task 8: 微调 App.vue 转场动效
  - [x] 路由转场从 `y: 12` 改为 `y: 8`
  - [x] 时长从 `0.3s` 改为 `0.25s`，离场从 `0.2s` 改为 `0.15s`

- [x] Task 9: 构建并部署验证
  - [x] 运行 `npm run build` 确认无报错
  - [x] 部署到 Cloudflare Pages
  - [x] 验证线上效果

# Task Dependencies

- Task 3, 4 依赖 Task 1, 2（设计令牌和 CSS 先行）
- Task 5, 6, 7, 8 可并行
- Task 9 依赖所有前置任务完成
