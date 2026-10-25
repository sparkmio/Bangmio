<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <a
        class="text-sm text-primary hover-underline-wipe cursor-pointer"
        @click.prevent="$router.back()"
        >← 返回</a
      >
      <h1 class="text-2xl font-semibold text-base-content">新番时间表</h1>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchCalendar" />

    <div v-if="!loading && !error">
      <div class="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="(day, idx) in dayLabels"
          :key="idx"
          class="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300"
          :class="
            activeDay === idx + 1
              ? 'bg-primary text-primary-content shadow-sm'
              : 'bg-base-200/60 text-base-content/60 hover:bg-base-200'
          "
          @click="activeDay = idx + 1"
        >
          {{ day }}
        </button>
      </div>

      <div v-if="currentDayItems.length === 0" class="py-10 text-center text-base-content/50">
        当天暂无番剧播出
      </div>

      <div v-else class="anime-grid">
        <AnimeCard v-for="item in currentDayItems" :key="item.id" :anime="item" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { animeAPI } from '../api/endpoints'
import AnimeCard from '../components/AnimeCard.vue'
import LoadingState from '../components/LoadingState.vue'

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const activeDay = ref(new Date().getDay() || 7)
const weekData = ref([])
const loading = ref(true)
const error = ref('')

const byDay = computed(() => {
  const map = {}
  for (const day of weekData.value) {
    if (day.items?.length) {
      map[day.weekday?.id || 0] = day.items
    }
  }
  return map
})

const currentDayItems = computed(() => byDay.value[activeDay.value] || [])

async function fetchCalendar() {
  loading.value = true
  error.value = ''
  try {
    const res = await animeAPI.getCalendar()
    weekData.value = res.data.data || []
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchCalendar)
</script>
