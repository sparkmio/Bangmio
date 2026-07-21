<template>
  <router-link :to="`/anime/${anime.id}`" class="group block animate-card-in">
    <div
      class="relative overflow-hidden rounded-xl bg-base-300 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-hover"
    >
      <div class="aspect-[2/3] relative bg-base-300">
        <img
          v-if="imageSrc && !imgError"
          :src="imageSrc"
          :alt="anime.name_cn || anime.name"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          width="200"
          height="280"
          style="aspect-ratio: 2 / 3"
          loading="lazy"
          decoding="async"
          @error="imgError = true"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-base-200">
          <span class="text-xs text-base-content/30">暂无封面</span>
        </div>

        <div
          class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
        />

        <div v-if="anime.rating?.score" class="absolute top-2 left-2 z-10">
          <span
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/60 backdrop-blur-sm text-amber-400"
          >
            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            {{ anime.rating.score.toFixed(1) }}
          </span>
        </div>
        <div v-if="anime.rank" class="absolute top-2 right-2 z-10">
          <span
            class="px-1.5 py-0.5 rounded text-[11px] font-bold bg-black/60 backdrop-blur-sm text-white"
            >#{{ anime.rank }}</span
          >
        </div>

        <div class="absolute inset-x-0 bottom-0 p-3 z-10">
          <h3 class="text-[13px] font-semibold text-white line-clamp-2 leading-snug">
            {{ anime.name_cn || anime.name }}
          </h3>
          <p
            v-if="anime.name_cn && anime.name"
            class="text-[11px] text-white/50 mt-0.5 line-clamp-1"
          >
            {{ anime.name }}
          </p>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ anime: { type: Object, required: true } })
const imgError = ref(false)
const imageSrc = computed(
  () => props.anime.images?.large || props.anime.images?.common || props.anime.image || null
)
</script>

<style scoped>
.animate-card-in {
  animation: card-in 0.35s ease-out backwards;
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-card-in:nth-child(1) {
  animation-delay: 0s;
}
.animate-card-in:nth-child(2) {
  animation-delay: 0.05s;
}
.animate-card-in:nth-child(3) {
  animation-delay: 0.1s;
}
.animate-card-in:nth-child(4) {
  animation-delay: 0.15s;
}
.animate-card-in:nth-child(5) {
  animation-delay: 0.2s;
}
.animate-card-in:nth-child(6) {
  animation-delay: 0.25s;
}
.animate-card-in:nth-child(7) {
  animation-delay: 0.3s;
}
.animate-card-in:nth-child(8) {
  animation-delay: 0.35s;
}
.animate-card-in:nth-child(9) {
  animation-delay: 0.4s;
}
.animate-card-in:nth-child(10) {
  animation-delay: 0.45s;
}
.animate-card-in:nth-child(11) {
  animation-delay: 0.5s;
}
.animate-card-in:nth-child(12) {
  animation-delay: 0.55s;
}
</style>
