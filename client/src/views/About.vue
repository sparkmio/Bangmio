<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-2 text-base-content">Bangmio</h1>
    <p class="text-sm text-base-content/50 mb-2">Bangumi (bgm.tv) 第三方客户端。支持 OAuth 登录、动画浏览与搜索、新番时间表、收藏管理、吐槽箱与讨论版查看。</p>
    <a href="https://bangmio.pages.dev" target="_blank" class="text-sm text-primary hover:underline mb-8 block">在线体验：https://bangmio.pages.dev</a>

    <div class="space-y-6 text-sm leading-relaxed text-base-content/80">

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-primary"></span>关于
        </h2>
        <p class="mb-2"><em>半个作者的碎碎念(还有半个是AI)</em></p>
        <p class="mb-3"><strong>这是一个高中生好玩做的 VibeCoding 项目</strong>，主要是用 DeepSeek V4 Pro 和 MiMo-V2.5-Pro 做的，用了快 2亿 tokens，要不是 <strong>Deepseek</strong> 便宜根本负担不起......</p>
        <p class="mb-3">本项目使用了 <a href="https://bgm.tv" target="_blank" class="link link-primary">Bangumi</a> 的 API，前端用了 Vue 3 + Vite ，还通过网页抓取解决了吐槽版和讨论版之类的小问题，还顺手通过cloudflare的边缘节点解决了国内无法正常访问的问题。国内没啥合适的平台所以部署在 Cloudflare Pages，不限带宽，全球 CDN 加速。因为cf速度太慢，所以替换了部分接口改为桜色大佬做的镜像站bangumi.one(详见<a href="https://bgm.tv/group/topic/462456" target="_blank" class="link link-primary">https://bgm.tv/group/topic/462456</a>)</p>
        <p>这是一个几乎不懂 CSS 的人用 AI 做的网站，各位可以提出批评，但也别骂的太狠。也感谢 Bangumi 现在还活着，给我提供了一个这么全的数据库，只让我做了点前端工作。<strong>这个项目虽然没啥人关注，但我会尽我所能持续进行维护和更新。</strong></p>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-secondary"></span>原版功能（均为 Bangumi 原版提供）
        </h2>
        <ul class="space-y-1.5 ml-1">
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>OAuth 登录</strong> — 一键登录或手动粘贴 Access Token</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>新番时间表</strong> — 周一至周日每日播出一览</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>收藏管理</strong> — 想看/在看/看过/搁置/弃番，支持评分和短评</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>番剧/游戏/书籍/音乐详情</strong> — 评分分布、收藏统计、制作人员、角色、相关条目</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>吐槽箱</strong> — 角色页嵌入式展示，番剧/人物页独立子页面</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>讨论版</strong> — 番剧讨论帖列表 + 帖子详情</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>人物/角色详情</strong> — 完整信息展示、参与作品、声优/关联人物、吐槽箱</span></li>
        </ul>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-accent"></span>特色功能（自己做的新功能）
        </h2>
        <ul class="space-y-1.5 ml-1">
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>豆瓣评分</strong> — 一站式查看多平台信息，不用多头跑</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>相关音乐</strong> — 一键跳转该番剧/游戏有关的音乐，不用到处找</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>萌娘百科</strong> — 链接萌娘百科，查看更全的番剧简介</span></li>
          <li class="flex items-start gap-2"><span class="text-primary mt-0.5">•</span><span><strong>在线观看</strong> — 链接第三方番剧在线观看网站，一键跳转在线观看</span></li>
        </ul>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-info"></span>技术栈
        </h2>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead><tr><th class="text-base-content/50">层</th><th class="text-base-content/50">技术</th></tr></thead>
            <tbody>
              <tr><td>前端</td><td>Vue 3 + Vite + Pinia + TailwindCSS + DaisyUI + GSAP</td></tr>
              <tr><td>后端</td><td>Hono（Cloudflare Pages Functions）</td></tr>
              <tr><td>API</td><td>代理 Bangumi API v0 + 网页抓取</td></tr>
              <tr><td>部署</td><td>Cloudflare Pages</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="border-t border-base-300/30"></div>

      <div>
        <h2 class="text-lg font-semibold mb-3 text-base-content flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-warning"></span>相关链接
        </h2>
        <div class="space-y-2">
          <a href="https://bangmio.pages.dev" target="_blank" class="flex items-center gap-2 text-primary hover:underline">
            <span>🌐</span> 网站：https://bangmio.pages.dev
          </a>
          <a href="https://github.com/sparkmio/Bangmio" target="_blank" class="flex items-center gap-2 text-primary hover:underline">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub：https://github.com/sparkmio/Bangmio
          </a>
          <a href="https://bgm.tv/user/acgpzh" target="_blank" class="flex items-center gap-2 text-primary hover:underline">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            作者 Bangumi 主页：https://bgm.tv/user/acgpzh
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
