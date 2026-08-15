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
        class="border-l-4 border-l-amber-500/60 bg-base-100/60 rounded-r-lg p-4 mb-5 text-sm leading-relaxed text-base-content/75 whitespace-pre-line"
      >
        {{ doubanIntro }}
      </div>

      <section v-if="comments.length" class="mt-6">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h3 class="font-semibold text-base-content">短评</h3>
          <a
            :href="`${details.url}comments?status=P`"
            target="_blank"
            class="link link-primary text-sm"
            >豆瓣查看全部 →</a
          >
        </div>
        <div class="space-y-3">
          <article
            v-for="(comment, index) in comments"
            :key="`${comment.user || 'anonymous'}-${comment.time || index}-${index}`"
            class="rounded-lg bg-base-100/70 p-3"
          >
            <div
              class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/50 mb-1"
            >
              <span class="font-medium text-base-content/75">{{ comment.user || '匿名用户' }}</span>
              <span v-if="comment.rating" class="text-amber-500">{{
                reviewStars(comment.rating)
              }}</span>
              <span v-if="comment.time">{{ comment.time }}</span>
              <span v-if="comment.useful">有用 {{ comment.useful }}</span>
            </div>
            <p class="text-sm leading-relaxed whitespace-pre-line break-words">
              {{ comment.content }}
            </p>
          </article>
        </div>
      </section>

      <section v-if="reviews.length" class="mt-7">
        <div class="flex items-center justify-between gap-3 mb-3">
          <h3 class="font-semibold text-base-content">长评</h3>
          <a :href="`${details.url}reviews`" target="_blank" class="link link-primary text-sm"
            >豆瓣查看全部 →</a
          >
        </div>
        <div class="space-y-4">
          <article
            v-for="(review, index) in reviews"
            :key="`${review.user || 'anonymous'}-${review.title || index}-${index}`"
            class="rounded-lg bg-base-100/70 p-4"
          >
            <h4 v-if="review.title" class="font-medium mb-1 break-words">{{ review.title }}</h4>
            <div
              class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/50 mb-2"
            >
              <span class="font-medium text-base-content/75">{{ review.user || '匿名用户' }}</span>
              <span v-if="review.rating" class="text-amber-500">{{
                reviewStars(review.rating)
              }}</span>
              <span v-if="review.time">{{ review.time }}</span>
              <span v-if="review.useful">有用 {{ review.useful }}</span>
            </div>
            <p class="text-sm leading-relaxed whitespace-pre-line break-words">
              {{ review.content }}
            </p>
          </article>
        </div>
      </section>

      <div class="flex flex-wrap gap-2 mt-6">
        <a :href="details.url" target="_blank" class="btn btn-sm btn-primary">前往豆瓣查看 →</a>
        <a :href="`${details.url}comments?status=P`" target="_blank" class="btn btn-sm btn-outline"
          >查看短评</a
        >
        <a :href="`${details.url}reviews`" target="_blank" class="btn btn-sm btn-ghost">查看长评</a>
      </div>
      <p class="text-xs text-base-content/30 mt-3">
        已展示可获取的结构化短评与长评；豆瓣原站内容以原站页面为准。
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
  comments: { type: Array, default: () => [] },
  reviews: { type: Array, default: () => [] },
  searchName: { type: String, default: '' }
})

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

function reviewStars(rating) {
  const stars = Math.round(Number(rating) / 10)
  return '★'.repeat(Math.min(stars, 5)) + '☆'.repeat(Math.max(0, 5 - Math.min(stars, 5)))
}
</script>
