<template>
  <div class="container mx-auto px-4 py-6 max-w-5xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">小组</h1>
      <div class="flex items-center gap-2">
        <input v-model="searchQuery" type="text" placeholder="搜索小组..." class="input input-sm input-bordered w-48" @keyup.enter="searchGroups">
        <button @click="searchGroups" class="btn btn-sm btn-primary">搜索</button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="groups.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link v-for="g in groups" :key="g.id" :to="`/group/${g.id}`" class="card bg-base-100 hover:shadow-lg transition-shadow border border-base-300">
        <div class="card-body p-4">
          <h3 class="font-semibold text-base-content">{{ g.name }}</h3>
          <p class="text-sm text-base-content/60 line-clamp-2">{{ g.description || '暂无简介' }}</p>
        </div>
      </router-link>
    </div>

    <div v-else class="py-20 text-center text-base-content/40">
      <p>暂无小组数据</p>
      <p class="text-xs mt-2">Bangumi 小组页面结构可能变化，抓取失败时显示空</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { groupAPI } from '../api/endpoints'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
const groups = ref([])
const loading = ref(true)
const searchQuery = ref('')

async function loadGroups() {
  loading.value = true
  try {
    const res = await groupAPI.getList()
    groups.value = res.data?.data || []
  } catch {
    toast.error('加载小组失败')
    groups.value = []
  }
  loading.value = false
}

function searchGroups() {
  if (!searchQuery.value.trim()) return
  // 暂用前端过滤
  const q = searchQuery.value.toLowerCase()
  // 重新加载后过滤
  loadGroups().then(() => {
    groups.value = groups.value.filter(g => g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q))
  })
}

onMounted(loadGroups)
</script>
