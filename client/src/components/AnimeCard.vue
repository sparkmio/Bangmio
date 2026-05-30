<template>
  <router-link :to="`/anime/${anime.id}`" class="group block" ref="cardRef">
    <div
      class="relative overflow-hidden rounded-2xl tilt-hover cursor-pointer"
      :style="{ '--accent-color': accentColor }"
    >
      <div class="relative aspect-[3/4] overflow-hidden">
        <img
          v-if="imageSrc && !imgError"
          :src="imageSrc"
          :alt="anime.name_cn || anime.name"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          @error="imgError = true"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-base-200">
          <span class="text-xs text-base-content/30">暂无封面</span>
        </div>

        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div v-if="anime.rating?.score" class="absolute top-3 left-3 z-10">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-black/50 backdrop-blur-sm text-amber-400 border border-amber-400/20 group-hover:scale-110 transition-transform duration-300">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            {{ anime.rating.score.toFixed(1) }}
          </span>
        </div>
        <div v-if="anime.rank" class="absolute top-3 right-3 z-10">
          <span class="px-2 py-1 rounded-full text-xs font-bold bg-black/50 backdrop-blur-sm text-white border border-white/10 group-hover:scale-110 transition-transform duration-300">#{{ anime.rank }}</span>
        </div>

        <div class="absolute inset-x-0 bottom-0 p-4 z-10">
          <h3 class="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-lg">{{ anime.name_cn || anime.name }}</h3>
          <p v-if="anime.name_cn && anime.name" class="text-xs text-gray-300 mt-1 line-clamp-1">{{ anime.name }}</p>
          <div
            class="h-0.5 rounded-full mt-2 transition-all duration-500 group-hover:w-full"
            :style="{ width: '0%', background: accentColor, opacity: 0 }"
            :class="['group-hover:!opacity-100', 'group-hover:!w-3/4']"
          ></div>
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

const accents = ['#FF6B9D', '#C44D8B', '#7C3AED', '#A78BFA', '#60A5FA', '#34D399', '#F59E0B']
const accentColor = computed(() => {
  const hash = props.anime.id ? String(props.anime.id).split('').reduce((a,c) => a + c.charCodeAt(0), 0) : 0
  return accents[hash % accents.length]
})

onMounted(() => {
  if (cardRef.value) {
    gsap.from(cardRef.value, { opacity: 0, y: 30, scale: 0.95, duration: 0.5, ease: 'power2.out' })
  }
})
</script>
