<template>
  <div id="stats" class="card bg-base-100 border border-base-300">
    <div class="card-body p-4">
      <!-- 统计 tab -->
      <div class="flex items-center gap-1 border-b border-base-300 mb-4 overflow-x-auto">
        <button
          v-for="tab in statsTabs"
          :key="tab.value"
          class="px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="
            statsFilter === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/50 hover:text-base-content'
          "
          @click="statsFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 6 彩色统计卡片 -->
      <div class="grid grid-cols-2 gap-2 mb-4">
        <div class="rounded-2xl border border-pink-500/30 bg-pink-500/10 p-3">
          <p class="text-xl font-bold text-pink-700">
            {{ computedStats.total }}
          </p>
          <p class="text-xs text-pink-600 mt-1">收藏数</p>
        </div>
        <div class="rounded-2xl border border-green-500/30 bg-green-500/10 p-3">
          <p class="text-xl font-bold text-green-700">
            {{ computedStats.completed }}
          </p>
          <p class="text-xs text-green-600 mt-1">完成数</p>
        </div>
        <div class="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3">
          <p class="text-xl font-bold text-blue-700">{{ computedStats.completionRate }}%</p>
          <p class="text-xs text-blue-600 mt-1">完成率</p>
        </div>
        <div class="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3">
          <p class="text-xl font-bold text-orange-700">
            {{ computedStats.avg }}
          </p>
          <p class="text-xs text-orange-600 mt-1">平均分</p>
        </div>
        <div class="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3">
          <p class="text-2xl font-bold text-purple-700">
            {{ computedStats.stdDev }}
          </p>
          <p class="text-xs text-purple-600 mt-1">标准差</p>
        </div>
        <div class="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3">
          <p class="text-xl font-bold text-cyan-700">
            {{ computedStats.rateTotal }}
          </p>
          <p class="text-xs text-cyan-600 mt-1">评分数</p>
        </div>
      </div>

      <!-- 评分分布条形图：10 → 1 倒序 -->
      <div v-if="computedStats.rateTotal > 0" class="space-y-1.5">
        <div class="flex items-center justify-between text-xs text-base-content/40 mb-2">
          <span>评分分布</span>
          <span>共 {{ computedStats.rateTotal }} 条评分</span>
        </div>
        <div v-for="r in rateDistribution" :key="r.rate" class="flex items-center gap-2">
          <span
            class="text-xs w-6 text-right text-base-content/70 flex items-center justify-end gap-0.5"
          >
            {{ r.rate }}
            <svg class="w-2.5 h-2.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          </span>
          <div class="flex-1 bg-base-200 rounded h-4 overflow-hidden relative">
            <div
              class="h-full transition-all duration-500"
              :class="rateBarClass(r.rate)"
              :style="{ width: Math.max(r.percent, r.count > 0 ? 4 : 0) + '%' }"
            />
            <span
              class="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-medium text-base-content/60"
              >{{ r.percent }}%</span
            >
          </div>
          <span class="text-xs w-6 text-right text-base-content font-medium shrink-0">{{
            r.count
          }}</span>
        </div>
      </div>
      <div v-else class="text-xs text-base-content/40 py-2">暂无评分数据</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { rateBarClass } from '../../utils/profile'

const props = defineProps({
  collections: { type: Array, default: () => [] }
})

const statsTabs = [
  { label: '全部', value: 0 },
  { label: '书籍', value: 1 },
  { label: '动画', value: 2 },
  { label: '音乐', value: 3 },
  { label: '游戏', value: 4 }
]

const statsFilter = ref(0)

const filteredCollectionsForStats = computed(() => {
  if (!statsFilter.value) return props.collections
  return props.collections.filter(c => {
    const st = c.subject_type ?? c.subject?.type
    return st === statsFilter.value
  })
})

const computedStats = computed(() => {
  const list = filteredCollectionsForStats.value
  const total = list.length
  const completed = list.filter(c => c.type === 2).length
  const rated = list.filter(c => c.rate && c.rate >= 1 && c.rate <= 10)
  const rateTotal = rated.length
  const sumRate = rated.reduce((s, c) => s + Number(c.rate), 0)
  const avg = rateTotal > 0 ? (sumRate / rateTotal).toFixed(1) : '-'
  let stdDev = '-'
  if (rateTotal > 0) {
    const mean = sumRate / rateTotal
    const variance = rated.reduce((s, c) => s + (Number(c.rate) - mean) ** 2, 0) / rateTotal
    stdDev = Math.sqrt(variance).toFixed(2)
  }
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, completionRate, avg, stdDev, rateTotal }
})

const rateDistribution = computed(() => {
  const list = filteredCollectionsForStats.value
  const rated = list.filter(c => c.rate && c.rate >= 1 && c.rate <= 10)
  const totalRated = rated.length
  const counts = {}
  rated.forEach(c => {
    counts[c.rate] = (counts[c.rate] || 0) + 1
  })

  const dist = []
  for (let r = 10; r >= 1; r--) {
    const count = counts[r] || 0
    dist.push({
      rate: r,
      count,
      percent: totalRated > 0 ? Math.round((count / totalRated) * 100) : 0
    })
  }
  return dist
})
</script>
