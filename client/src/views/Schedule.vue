<template>
  <div>
    <h1 class="text-2xl font-semibold mb-6 text-base-content">新番时间表</h1>

    <LoadingState :loading="loading" :error="error" @retry="fetchCalendar" />

    <div v-if="!loading && !error">
      <div v-if="Object.keys(byDay).length === 0" class="py-20 text-center text-base-content/50">
        <p>暂无番剧数据</p>
      </div>

      <div v-else>
        <div class="tabs tabs-boxed bg-base-200 mb-6 overflow-x-auto">
          <button
            v-for="(day, idx) in dayLabels"
            :key="idx"
            @click="activeDay = idx + 1"
            class="tab whitespace-nowrap"
            :class="activeDay === idx + 1 ? 'tab-active' : ''"
          >
            {{ day }}
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <router-link
            v-for="item in currentDayItems"
            :key="item.id"
            :to="`/anime/${item.id}`"
            class="flex gap-4 p-4 rounded-lg glass-card hover-glow group"
          >
            <figure class="w-20 shrink-0">
              <img
                v-if="item.images?.common || item.image"
                :src="item.images?.common || item.image"
                class="w-20 h-28 object-cover"
              />
            </figure>
            <div class="card-body p-4 py-3">
              <h3 class="card-title text-sm line-clamp-2 text-base-content">{{ item.name_cn || item.name }}</h3>
              <p class="text-xs truncate text-base-content/50">{{ item.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span v-if="item.rating?.score" class="text-xs font-bold text-amber-500">{{ item.rating.score.toFixed(1) }}</span>
                <span v-if="item.eps" class="text-xs text-base-content/50">{{ item.eps }}话</span>
                <span class="badge badge-xs">{{ typeLabel(item.type) }}</span>
              </div>
            </div>
          </router-link>
        </div>

        <div v-if="currentDayItems.length === 0" class="py-10 text-center text-base-content/50">
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
