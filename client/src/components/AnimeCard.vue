<template>
  <router-link :to="`/anime/${anime.id}`" class="group block" ref="cardRef">
    <div class="relative overflow-hidden rounded-lg bg-base-300/80 card-lift">
      <div class="aspect-[2/3] relative overflow-hidden">
        <img
          v-if="imageSrc && !imgError"
          :src="imageSrc"
          :alt="anime.name_cn || anime.name"
          class="w-full h-full object-cover transition-all duration-700 group-hover:brightness-110 group-hover:scale-[1.04]"
          loading="lazy"
          @error="imgError = true"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-base-200">
          <span class="text-xs text-base-content/30">暂无封面</span>
        </div>

        <!-- Gradient overlay - deeper on hover -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent transition-all duration-500 group-hover:from-black/80"></div>

        <!-- Top badges with glass effect -->
        <div v-if="anime.rating?.score" class="absolute top-2.5 left-2.5 z-10">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-black/40 text-amber-400 backdrop-blur-md border border-white/10">
            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            {{ anime.rating.score.toFixed(1) }}
          </span>
        </div>
        <div v-if="anime.rank" class="absolute top-2.5 right-2.5 z-10">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-black/40 text-white/90 backdrop-blur-md border border-white/10">#{{ anime.rank }}</span>
        </div>

        <!-- Title at bottom with gradient background -->
        <div class="absolute inset-x-0 bottom-0 p-3 z-10">
          <h3 class="text-[13px] font-semibold text-white line-clamp-2 leading-snug drop-shadow-md">{{ anime.name_cn || anime.name }}</h3>
          <p v-if="anime.name_cn && anime.name" class="text-[11px] text-white/50 mt-0.5 line-clamp-1">{{ anime.name }}</p>
          <!-- Accent line that expands on hover -->
          <div class="h-0.5 mt-2 rounded-full bg-gradient-to-r from-primary to-secondary w-0 group-hover:w-2/3 transition-all duration-500 ease-out"></div>
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
    gsap.fromTo(cardRef.value, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
  }
})
</script>
