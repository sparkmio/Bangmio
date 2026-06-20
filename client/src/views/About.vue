<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-2 text-base-content">Bangmio</h1>
    <p class="text-sm text-base-content/50 mb-8">Bangumi (bgm.tv) 第三方客户端。支持 OAuth 登录、动画浏览与搜索、新番时间表、收藏管理、吐槽箱与讨论版查看。</p>

    <div class="space-y-6 text-sm leading-relaxed text-base-content/80">

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-primary"></span>关于
        </h2>
        <p class="mb-2"><em>半个作者的碎碎念 <span class="text-base-content/30">还有半个是AI</span></em></p>
        <p class="mb-3">这是一个高中生好玩做的 VibeCoding 项目，主要是用 DeepSeek V4 Pro 和 MiMo-V2.5-Pro 做的，用了快 2亿 tokens，要不是 D 便宜根本负担不起......</p>
        <p class="mb-3">本项目使用了 <a href="https://bgm.tv" target="_blank" class="link link-primary">Bangumi</a> 的 API，前端用了 Vue 3 + Vite + Pinia + TailwindCSS，还通过网页抓取解决了吐槽版和讨论版之类的小问题。国内没啥合适的平台所以部署在 Cloudflare Pages，不限带宽，全球 CDN 加速。</p>
        <p>这是一个几乎不懂 CSS 的人用 AI 做的网站，各位可以提出批评，但也别骂的太狠。也感谢 Bangumi 现在还活着，给我提供了一个这么全的数据库，只让我做了点前端工作。</p>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-secondary"></span>功能
        </h2>
        <ul class="space-y-1.5 ml-1">
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>OAuth / Token 双登录</strong> — 扫码授权或手动粘贴 Access Token</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>动画浏览</strong> — 按热度、标签、类型筛选番剧，支持搜索和分页</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>新番时间表</strong> — 周一至周日每日播出一览</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>收藏管理</strong> — 想看/在看/看过/搁置/弃番，支持评分和短评</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>番剧详情</strong> — 评分分布、收藏统计、制作人员、角色、相关条目</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>吐槽箱</strong> — 角色页嵌入式展示，番剧/人物页独立子页面</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>讨论版</strong> — 番剧讨论帖列表 + 帖子详情（含回复和子回复）</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>人物/角色详情</strong> — 完整信息展示、参与作品、声优/关联人物、吐槽箱</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>暗色/浅色模式</strong></span></li>
        </ul>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-accent"></span>技术栈
        </h2>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead><tr><th class="text-base-content/50">层</th><th class="text-base-content/50">技术</th></tr></thead>
            <tbody>
              <tr><td>前端</td><td>Vue 3 + Vite + Pinia + TailwindCSS + DaisyUI + GSAP</td></tr>
              <tr><td>后端</td><td>Hono（Cloudflare Pages Functions）</td></tr>
              <tr><td>API</td><td>代理 Bangumi API v0 + 网页抓取</td></tr>
              <tr><td>图片 CDN</td><td>lain.bangumi.one 反代 + Cloudflare 边缘缓存</td></tr>
              <tr><td>OAuth</td><td>bgm.tv 反代（绕过 GFW）</td></tr>
              <tr><td>部署</td><td>Cloudflare Pages（前后端一体）</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-info"></span>本地开发
        </h2>
        <div class="bg-base-200/40 rounded-lg p-4 font-mono text-xs">
          <p class="text-base-content/50 mb-1"># 安装依赖</p>
          <p class="text-base-content">npm run install:all</p>
          <p class="text-base-content/50 mt-3 mb-1"># 启动（同时运行前端和后端）</p>
          <p class="text-base-content">npm run dev</p>
        </div>
        <p class="mt-2 text-xs text-base-content/50">前端：<code class="badge badge-ghost badge-xs">http://localhost:5173</code> &nbsp;后端：<code class="badge badge-ghost badge-xs">http://localhost:3000</code></p>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-warning"></span>部署
        </h2>
        <ol class="space-y-1.5 ml-4 list-decimal">
          <li>Fork 本仓库</li>
          <li>进入 <a href="https://dash.cloudflare.com" target="_blank" class="link link-primary">Cloudflare Dashboard</a> → Workers & Pages → Create → Pages</li>
          <li>连接 GitHub 仓库</li>
          <li>构建配置使用 <code class="badge badge-ghost badge-xs">wrangler.toml</code>（已配置好）</li>
          <li>部署后在 Settings → Environment Variables 添加 <code class="badge badge-ghost badge-xs">OAUTH_REDIRECT_URI</code> = <code class="badge badge-ghost badge-xs">https://你的域名.pages.dev/login/callback</code></li>
        </ol>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-success"></span>项目结构
        </h2>
        <div class="bg-base-200/40 rounded-lg p-4 font-mono text-xs leading-relaxed">
          <p>Bangmio/</p>
          <p>├── client/                 <span class="text-base-content/40"># Vue 3 前端</span></p>
          <p>│   ├── src/</p>
          <p>│   │   ├── api/            <span class="text-base-content/40"># API 调用</span></p>
          <p>│   │   ├── components/     <span class="text-base-content/40"># 通用组件</span></p>
          <p>│   │   ├── stores/         <span class="text-base-content/40"># Pinia 状态管理</span></p>
          <p>│   │   ├── views/          <span class="text-base-content/40"># 页面组件</span></p>
          <p>│   │   └── router/         <span class="text-base-content/40"># 路由配置</span></p>
          <p>│   └── public/             <span class="text-base-content/40"># 静态资源</span></p>
          <p>├── server/                 <span class="text-base-content/40"># Hono 后端</span></p>
          <p>│   └── src/</p>
          <p>│       ├── app.js          <span class="text-base-content/40"># Hono 应用入口</span></p>
          <p>│       ├── routes/         <span class="text-base-content/40"># API 路由</span></p>
          <p>│       └── services/       <span class="text-base-content/40"># Bangumi API 服务</span></p>
          <p>├── functions/              <span class="text-base-content/40"># Cloudflare Pages Functions</span></p>
          <p>│   └── api/[[path]].js     <span class="text-base-content/40"># API 代理（Hono app）</span></p>
          <p>└── wrangler.toml           <span class="text-base-content/40"># Cloudflare Pages 配置</span></p>
        </div>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-error"></span>相关链接
        </h2>
        <div class="flex flex-wrap gap-3">
          <a href="https://github.com/sparkmio/Bangmio" target="_blank" class="badge badge-outline gap-1 hover:badge-primary transition-colors">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </a>
          <a href="https://bgm.tv/user/acgpzh" target="_blank" class="badge badge-outline gap-1 hover:badge-primary transition-colors">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            作者 Bangumi 主页
          </a>
          <a href="https://bangmio.pages.dev" target="_blank" class="badge badge-outline gap-1 hover:badge-primary transition-colors">
            🌐 在线体验
          </a>
        </div>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div class="flex flex-wrap gap-2 text-xs">
        <span class="badge badge-outline badge-sm">Vue 3</span>
        <span class="badge badge-outline badge-sm">Vite</span>
        <span class="badge badge-outline badge-sm">Pinia</span>
        <span class="badge badge-outline badge-sm">TailwindCSS</span>
        <span class="badge badge-outline badge-sm">DaisyUI</span>
        <span class="badge badge-outline badge-sm">GSAP</span>
        <span class="badge badge-outline badge-sm">Hono</span>
        <span class="badge badge-outline badge-sm">Bangumi API</span>
        <span class="badge badge-outline badge-sm">Cloudflare Pages</span>
      </div>
    </div>
  </div>
</template>
