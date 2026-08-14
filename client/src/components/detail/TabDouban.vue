<template>
  <div>
    <div v-if="loading" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>
    <div v-else-if="details" class="bg-base-200/40 rounded-xl p-6">
      <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h2 class="text-xl font-bold text-base-content break-words">
          {{ summary?.title || details.title || '豆瓣条目' }}
        </h2>
      </div>
      <div class="flex items-baseline gap-2 mb-2 flex-wrap">
        <span class="text-5xl font-black text-amber-500">{{ details.rate || '-' }}</span>
        <span class="text-amber-400 text-lg tracking-widest">{{ doubanStars }}</span>
        <span class="text-xs text-base-content/40">豆瓣评分</span>
      </div>
      <p v-if="doubanMeta" class="text-sm text-base-content/60 mb-4">{{ doubanMeta }}</p>
      <div
        v-if="doubanIntro"
        class="border-l-4 border-l-amber-500/60 bg-base-100/60 rounded-r-lg p-4 mb-5 text-sm leading-relaxed text-base-content/75"
      >
        {{ doubanIntro }}
      </div>
      <div class="flex flex-wrap gap-2">
        <a :href="details.url" target="_blank" class="btn btn-sm btn-primary">前往豆瓣查看 →</a>
        <a :href="`${details.url}comments?status=P`" target="_blank" class="btn btn-sm btn-outline"
          >查看短评</a
        >
        <a :href="`${details.url}reviews`" target="_blank" class="btn btn-sm btn-ghost">查看长评</a>
      </div>
      <p class="text-xs text-base-content/30 mt-3">
        豆瓣限制第三方页面嵌入，此处展示结构化数据摘要
      </p>
    </div>
    <div v-else class="py-10 text-center">
      <p class="text-base-content/40 text-sm mb-3">未找到豆瓣条目</p>
      <a
        :href="`https://www.douban.com/search?q=${encodeURIComponent(searchName)}`"
        target="_blank"
        class="btn btn-sm btn-ghost text-primary"
        >前往豆瓣搜索 →</a
      >
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  details: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  summary: { type: Object, default: null },
  searchName: { type: String, default: '' }
})

// 豆瓣结构化卡片（PROJECT_ISSUES 1.1）：
// 条目页 HTML 被上游反爬强制拦截，无法 iframe 内嵌，改用 JSON 接口数据渲染卡片
const doubanStars = computed(() => {
  const star = Math.round((parseFloat(props.details?.rate) || 0) / 2)
  return '★'.repeat(Math.min(star, 5)) + '☆'.repeat(Math.max(0, 5 - Math.min(star, 5)))
})
const doubanMeta = computed(() => {
  const d = props.details
  if (!d) return ''
  return [
    d.release_year ? `${d.release_year} 年` : '',
    d.types?.join(' / ') || '',
    d.episodes_count ? `${d.episodes_count} 集` : ''
  ]
    .filter(Boolean)
    .join(' · ')
})
const doubanIntro = computed(() => {
  const summaryIntro = props.summary?.intro || ''
  const shortComment =
    typeof props.details?.short_comment?.content === 'string'
      ? props.details.short_comment.content
      : ''
  return summaryIntro || shortComment || ''
})
</script>
