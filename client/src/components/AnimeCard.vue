<template>
  <router-link :to="`/anime/${anime.id}`" class="group block" data-card ref="cardRef">
    <div class="anime-card rounded-xl overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1" :style="{ boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }">
      <div class="relative aspect-[3/4]">
        <img
          v-if="imageSrc && !imgError"
          :src="imageSrc"
          :alt="anime.name_cn || anime.name"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          @error="imgError = true"
        />
        <div v-else class="w-full h-full flex items-center justify-center" :style="{ background: 'var(--bg-hover)' }">
          <span class="text-xs" style="color: var(--text-muted)">暂无封面</span>
        </div>
        <div v-if="anime.rating?.score" class="absolute top-2 left-2 z-10">
          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold backdrop-blur-sm" style="background: rgba(0,0,0,.6); color: var(--star); border: 1px solid rgba(255,255,255,.1)">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            {{ anime.rating.score.toFixed(1) }}
          </span>
        </div>
        <div v-if="anime.rank" class="absolute top-2 right-2 z-10">
          <span class="px-1.5 py-0.5 rounded-md text-xs font-bold backdrop-blur-sm" style="background: rgba(0,0,0,.6); color: #fff; border: 1px solid rgba(255,255,255,.1)">#{{ anime.rank }}</span>
        </div>
        <div class="absolute inset-x-0 bottom-0 p-3 pt-16" style="background: linear-gradient(transparent 0%, rgba(0,0,0,.2) 30%, rgba(0,0,0,.8) 100%)">
          <h3 class="text-sm font-semibold text-white line-clamp-2 leading-snug drop-shadow-md">{{ anime.name_cn || anime.name }}</h3>
          <p v-if="anime.name_cn && anime.name" class="text-xs text-gray-300 mt-0.5 line-clamp-1">{{ anime.name }}</p>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { gsap } from 'gsap'
const props = defineProps({ anime: { type: Object, required: true } })
const imgError = ref(false)
const imageSrc = computed(() => props.anime.images?.large || props.anime.images?.common || props.anime.image || null)
const cardRef = ref(null)

onMounted(() => {
  if (cardRef.value) {
    gsap.from(cardRef.value, { opacity: 0, y: 20, duration: 0.4, ease: 'power2.out' })
  }
})
</script>
