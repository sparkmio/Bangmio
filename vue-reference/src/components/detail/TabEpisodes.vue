<template>
  <div v-if="episodes.length" class="space-y-2">
    <div
      v-for="ep in episodes"
      :key="ep.id"
      class="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-3 min-h-[48px] rounded-xl bg-base-200/40 hover:bg-base-200/60 transition-colors"
    >
      <span
        class="w-10 h-8 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0"
        >{{ String(ep.sort || 0).padStart(2, '0') }}</span
      >
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-base-content line-clamp-1">
          {{ ep.name_cn || ep.name || `第${ep.sort}话` }}
        </p>
        <p class="text-xs text-base-content/50">
          {{ ep.airdate || '' }}
        </p>
      </div>
      <span class="text-xs text-base-content/40 flex-shrink-0">{{ ep.duration || '' }}</span>
    </div>
  </div>
  <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无章节信息</div>
</template>

<script setup>
defineProps({
  episodes: { type: Array, default: () => [] }
})
</script>
