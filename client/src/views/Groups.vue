<template>
  <div class="container mx-auto px-4 py-6 max-w-5xl">
    <div class="flex items-center justify-between mb-6 gap-2 flex-wrap">
      <h1 class="text-2xl font-bold">小组</h1>
      <div class="flex items-center gap-2">
        <input v-model="searchQuery" type="text" placeholder="搜索小组..." class="input input-sm input-bordered w-48" @keyup.enter="searchGroups">
        <button @click="searchGroups" class="btn btn-sm btn-primary">搜索</button>
      </div>
    </div>

    <!-- 加载中：骨架屏 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="n in 8" :key="n" class="card bg-base-100 border border-base-300">
        <div class="card-body p-4">
          <div class="flex items-center gap-3">
            <div class="skeleton w-12 h-12 rounded-full shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="skeleton h-4 w-1/2"></div>
              <div class="skeleton h-3 w-full"></div>
              <div class="skeleton h-3 w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表展示（至少 50 个，后端返回的全部展示，前端无需分页） -->
    <div v-else-if="groups.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link
        v-for="g in groups"
        :key="g.id"
        :to="`/group/${g.id}`"
        class="card bg-base-100 hover:shadow-lg transition-shadow border border-base-300"
      >
        <div class="card-body p-4">
          <div class="flex items-start gap-3">
            <!-- 头像（如有） -->
            <div class="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-base-200 flex items-center justify-center">
              <img
                v-if="g.icon || g.avatar"
                :src="g.icon || g.avatar"
                :alt="g.name"
                class="w-full h-full object-cover"
                @error="onAvatarError($event)"
              >
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-semibold text-base-content truncate">{{ g.name }}</h3>
                <!-- 成员数 badge -->
                <span v-if="g.member_count != null || g.members != null" class="badge badge-sm badge-ghost">
                  {{ g.member_count ?? g.members }} 成员
                </span>
              </div>
              <p class="text-sm text-base-content/60 line-clamp-2 mt-1">{{ g.description || '暂无简介' }}</p>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 空状态 -->
    <div v-else class="py-20 text-center text-base-content/40">
      <p>{{ searchQuery.trim() ? '没有匹配的小组' : '暂无小组数据' }}</p>
      <p class="text-xs mt-2">Bangumi 小组页面结构可能变化，抓取失败时显示空</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { groupAPI } from '../api/endpoints'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
// allGroups 存全量，groups 存过滤后的结果
const allGroups = ref([])
const groups = ref([])
const loading = ref(true)
const searchQuery = ref('')
// 防抖句柄
let debounceTimer = null

// 头像加载失败时隐藏 img，避免破图
function onAvatarError(e) {
  e.target.style.display = 'none'
}

// 根据当前 searchQuery 过滤 allGroups，结果写入 groups
function applyFilter() {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) {
    groups.value = allGroups.value
    return
  }
  groups.value = allGroups.value.filter(g =>
    (g.name || '').toLowerCase().includes(q) ||
    (g.description || '').toLowerCase().includes(q)
  )
}

// 加载全量小组列表
async function loadGroups() {
  loading.value = true
  try {
    const res = await groupAPI.getList()
    allGroups.value = res.data?.data || []
    applyFilter()
  } catch {
    toast.error('加载小组失败')
    allGroups.value = []
    groups.value = []
  }
  loading.value = false
}

// 修复异步 bug：先 await loadGroups() 再过滤；空搜索恢复原列表
async function searchGroups() {
  if (!searchQuery.value.trim()) {
    // 搜索框清空时恢复全量
    applyFilter()
    return
  }
  await loadGroups()
  // loadGroups 内部已调用 applyFilter，这里无需重复
}

// 输入框防抖（300ms），空值立即清空
watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (!val.trim()) {
    applyFilter()
    return
  }
  debounceTimer = setTimeout(() => {
    applyFilter()
  }, 300)
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

onMounted(loadGroups)
</script>
