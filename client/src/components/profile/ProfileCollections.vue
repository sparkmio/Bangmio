<template>
  <div class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <!-- 标题 + 各状态计数 -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 class="text-base font-bold text-base-content">我的{{ label }}</h2>
        <div class="flex items-center gap-3 text-xs text-base-content/50 flex-wrap">
          <span v-for="s in statuses" :key="s.type">
            {{ s.label }}
            <span class="text-base-content font-medium">{{
              statusCounts[subjectType]?.[s.type] || 0
            }}</span>
          </span>
        </div>
      </div>

      <!-- 按状态分行的横向封面网格 -->
      <div v-for="s in statuses" :key="s.type" class="mb-4 last:mb-0">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-base-content">{{ s.label }}</span>
          <span v-if="grouped[subjectType]?.[s.type]?.length" class="text-xs text-base-content/40">
            {{ grouped[subjectType][s.type].length }} 部
          </span>
        </div>
        <div
          v-if="grouped[subjectType]?.[s.type]?.length"
          class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1"
        >
          <router-link
            v-for="col in grouped[subjectType][s.type]"
            :key="col.subject?.id || col.anime_id"
            :to="`/anime/${col.subject?.id || col.anime_id}`"
            class="shrink-0 group"
            :title="col.subject?.name_cn || col.subject?.name"
          >
            <div
              class="w-16 h-[90px] sm:w-[72px] sm:h-[100px] rounded-md overflow-hidden bg-base-200 shadow-sm relative"
            >
              <img
                v-if="
                  col.subject?.images?.common ||
                  col.subject?.images?.grid ||
                  col.subject?.images?.medium
                "
                v-image-placeholder
                :src="
                  col.subject?.images?.common ||
                  col.subject?.images?.grid ||
                  col.subject?.images?.medium
                "
                :alt="col.subject?.name_cn || col.subject?.name"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-[10px] text-base-content/40 p-1 text-center"
              >
                {{ col.subject?.name_cn || col.subject?.name || '无封面' }}
              </div>
              <!-- 评分角标 -->
              <div
                v-if="col.rate"
                class="absolute top-1 right-1 px-1 py-0.5 bg-black/70 rounded text-[10px] font-bold text-amber-400 flex items-center gap-0.5"
              >
                <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                {{ col.rate }}
              </div>
            </div>
            <p
              class="text-[10px] text-center mt-1 text-base-content/60 line-clamp-1 w-16 sm:w-[72px] group-hover:text-primary transition-colors"
            >
              {{ col.subject?.name_cn || col.subject?.name }}
            </p>
          </router-link>
        </div>
        <div v-else class="text-xs text-base-content/40 py-2">暂无</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  subjectType: { type: [String, Number], required: true },
  label: { type: String, required: true },
  statuses: { type: Array, required: true },
  statusCounts: { type: Object, required: true },
  grouped: { type: Object, required: true }
})
</script>
