<template>
  <div id="timeline" class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-base-content/70">/ 我的时间胶囊</h3>
        <a
          :href="`https://bgm.tv/user/${username}/timeline`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-base-content/40 hover:text-primary"
          >...more</a
        >
      </div>
      <div v-if="timeline.length" class="relative">
        <div class="absolute left-[5px] top-1 bottom-1 w-px bg-base-300" />
        <div v-for="(item, i) in timeline" :key="i" class="relative pl-6 pb-3 last:pb-0">
          <div
            class="absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full bg-primary ring-2 ring-base-100"
          />
          <router-link
            :to="`/anime/${item.subject_id || item.subject?.id || item.anime_id}`"
            class="block hover:text-primary transition-colors"
          >
            <div class="flex items-center gap-2 text-sm flex-wrap">
              <span class="badge badge-xs" :class="timelineBadgeClass(item)">{{
                timelineTypeLabel(item)
              }}</span>
              <span class="font-medium line-clamp-1">{{
                item.subject_name || item.subject?.name_cn || item.subject?.name
              }}</span>
            </div>
            <p class="text-xs text-base-content/40 mt-0.5">
              {{ formatRelativeTime(item.time || item.updated_at || item.created_at) }}
            </p>
          </router-link>
        </div>
      </div>
      <div v-else class="text-xs text-base-content/40 py-2">还没有时间胶囊</div>
    </div>
  </div>
</template>

<script setup>
import { timelineTypeLabel, timelineBadgeClass, formatRelativeTime } from '../../utils/profile'

defineProps({
  timeline: { type: Array, default: () => [] },
  username: { type: String, default: '' }
})
</script>
