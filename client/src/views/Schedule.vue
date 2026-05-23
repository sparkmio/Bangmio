<template>
  <div>
    <h1 class="text-2xl font-bold mb-6" style="color: var(--text)">新番时间表</h1>

    <LoadingState :loading="loading" :error="error" @retry="fetchCalendar" />

    <div v-if="!loading && !error">
      <div v-if="Object.keys(byDay).length === 0" class="py-20 text-center" style="color: var(--text-muted)">
        <p>暂无番剧数据</p>
      </div>

      <div v-else>
        <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            v-for="(day, idx) in dayLabels"
            :key="idx"
            @click="activeDay = idx + 1"
            class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            :style="activeDay === idx + 1 ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--bg-hover)', color: 'var(--text-secondary)' }"
          >
            {{ day }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <router-link
            v-for="item in currentDayItems"
            :key="item.id"
            :to="`/anime/${item.id}`"
            class="flex gap-4 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5"
            :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }"
            @mouseenter="e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.borderColor = 'var(--primary)' }"
            @mouseleave="e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = 'var(--border)' }"
          >
            <img
              v-if="item.images?.common || item.image"
              :src="item.images?.common || item.image"
              class="w-20 h-24 object-cover rounded-lg flex-shrink-0"
            />
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold line-clamp-2" style="color: var(--text)">{{ item.name_cn || item.name }}</h3>
              <p class="text-xs mt-1 truncate" style="color: var(--text-muted)">{{ item.name }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span v-if="item.rating?.score" class="text-xs font-bold" style="color: var(--star)">{{ item.rating.score.toFixed(1) }}</span>
                <span v-if="item.eps" class="text-xs" style="color: var(--text-muted)">{{ item.eps }}话</span>
                <span class="text-xs px-1.5 py-0.5 rounded" :style="{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }">{{ typeLabel(item.type) }}</span>
              </div>
            </div>
          </router-link>
        </div>

        <div v-if="currentDayItems.length === 0" class="text-center py-10" style="color: var(--text-muted)">
          当天暂无番剧播出
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { animeAPI } from '../api/endpoints'
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

function typeLabel(t) {
  return t === 1 ? '书籍' : t === 2 ? '动画' : t === 3 ? '音乐' : t === 4 ? '游戏' : '其他'
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
