<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold mb-8 text-base-content">关于我们</h1>

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
