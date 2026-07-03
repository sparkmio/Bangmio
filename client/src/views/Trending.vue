<template>
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-baseline gap-3">
        <a @click.prevent="$router.back()" class="text-sm text-base-content/50 hover:text-primary hover-underline-wipe cursor-pointer">← 返回</a>
        <h1 class="text-2xl font-bold text-base-content serif-cn">新番时间表</h1>
      </div>
      <span class="text-xs font-mono tracking-wider text-base-content/40 uppercase">{{ currentMonth }}</span>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchCalendar" />

    <template v-if="!loading && !error">
      <!-- Day selector -->
      <nav class="flex items-center gap-1 mb-8 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="(label, idx) in dayLabels"
          :key="idx"
          @click="activeDay = idx + 1"
          class="relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300"
          :class="activeDay === idx + 1
            ? 'bg-primary text-primary-content shadow-sm'
            : 'text-base-content/50 hover:text-base-content hover:bg-base-200'"
        >
          {{ label }}
          <span
            v-if="(idx + 1) === todayIndex"
            class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-secondary"
          ></span>
        </button>
      </nav>

      <!-- Empty -->
      <div v-if="currentDayItems.length === 0" class="py-20 text-center">
        <p class="text-sm text-base-content/40 serif-cn">{{ dayLabels[activeDay - 1] }} 暂无番剧播出</p>
      </div>

      <!-- Grid with transition -->
      <TransitionGroup
        v-else
        tag="div"
        name="schedule"
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8"
      >
        <router-link
          v-for="item in currentDayItems"
          :key="item.id"
          :to="`/anime/${item.id}`"
          class="group block"
        >
          <!-- Poster -->
          <div class="relative aspect-[2/3] rounded-lg overflow-hidden bg-base-300 mb-3 border border-transparent group-hover:border-primary/30 transition-all duration-300">
            <img
              v-if="item.images?.common || item.images?.large"
              :src="item.images?.common || item.images?.large"
              :alt="item.name_cn || item.name"
              class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <span class="text-[10px] text-base-content/30 serif-cn">暂无封面</span>
            </div>

            <!-- Score -->
            <div v-if="item.rating?.score" class="absolute top-2 left-2">
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-amber-300 numeric">
                <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {{ item.rating.score.toFixed(1) }}
              </span>
            </div>
          </div>

          <!-- Info -->
          <div>
            <h3 class="text-[13px] font-semibold text-base-content line-clamp-2 leading-snug serif-cn group-hover:text-primary transition-colors">
              {{ item.name_cn || item.name }}
            </h3>
            <p v-if="item.name_cn && item.name" class="text-[10px] text-base-content/40 mt-0.5 line-clamp-1 font-mono tracking-tight">
              {{ item.name }}
            </p>
            <p class="text-[10px] text-base-content/40 mt-1.5 font-mono">
              {{ formatAirDate(item.air_date) }}
            </p>
          </div>
        </router-link>
      </TransitionGroup>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { animeAPI } from '../api/endpoints'
import LoadingState from '../components/LoadingState.vue'

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const todayIndex = new Date().getDay() || 7
const activeDay = ref(todayIndex)
const weekData = ref([])
const loading = ref(true)
const error = ref('')

const currentMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear()} · ${now.getMonth() + 1}月`
})

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

function formatAirDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getMonth() + 1}月${d.getDate()}日 播出`
}

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

<style scoped>
.schedule-move,
.schedule-enter-active,
.schedule-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.schedule-enter-from,
.schedule-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
.schedule-leave-active {
  position: absolute;
}
</style>
