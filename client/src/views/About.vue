<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold mb-2 text-base-content">关于我们</h1>
    <p class="text-sm text-base-content/40 mb-8">半个作者的碎碎念 <span class="text-xs text-base-content/25">还有半个是AI</span></p>

    <div class="card bg-base-100 border border-base-300">
      <div class="card-body p-6 md:p-8 space-y-5 text-[15px] leading-relaxed text-base-content/80">
        <p>
          这是一个高中生好玩做的 VibeCoding 项目，主要是用 DeepSeek V4 Pro 和 MiMo-V2.5-Pro 做的，用了快 7000 万 tokens，要不是 D 便宜根本负担不起......
        </p>

        <p>
          本项目使用了 <a href="https://bgm.tv" target="_blank" class="link link-primary">Bangumi</a> 的 API，前端用了 Vue 3 + Vite + Pinia + TailwindCSS，还通过网页抓取解决了吐槽版和讨论版之类的小问题。考虑到国内没啥合适的平台所以依旧部署在 Vercel，反正都上 Bangumi 了应该也懂怎么科学上网了吧。
        </p>

        <p>
          这是一个几乎不懂 CSS 的人用 AI 做的网站，各位可以提出批评，但也别骂的太狠。也感谢 Bangumi 现在还活着，给我提供了一个这么全的数据库，只让我做了点前端工作。
        </p>

        <div class="divider"></div>

        <div class="flex flex-wrap gap-3 text-sm">
          <a href="https://github.com/sparkmio/Bangmio" target="_blank" class="badge badge-outline gap-1 hover:badge-primary transition-colors">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            GitHub
          </a>
          <a href="https://bgm.tv/user/acgpzh" target="_blank" class="badge badge-outline gap-1 hover:badge-primary transition-colors">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            Bangumi
          </a>
          <span class="badge badge-outline">Vue 3</span>
          <span class="badge badge-outline">Vite</span>
          <span class="badge badge-outline">Pinia</span>
          <span class="badge badge-outline">TailwindCSS</span>
          <span class="badge badge-outline">DaisyUI</span>
          <span class="badge badge-outline">GSAP</span>
          <span class="badge badge-outline">Bangumi API</span>
          <span class="badge badge-outline">Vercel</span>
        </div>
      </div>
    </div>
  </div>
</template>
