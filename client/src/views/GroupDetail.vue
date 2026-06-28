<template>
  <div class="container mx-auto px-4 py-6 max-w-4xl">
    <div v-if="loading" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="group">
      <div class="bg-base-100 rounded-lg p-6 mb-6 border border-base-300">
        <h1 class="text-2xl font-bold mb-2">{{ group.name }}</h1>
        <p class="text-sm text-base-content/70">{{ group.description || '暂无简介' }}</p>
      </div>

      <div class="bg-base-100 rounded-lg p-6 border border-base-300">
        <h2 class="text-lg font-semibold mb-4">最近话题</h2>
        <div v-if="group.topics?.length" class="space-y-2">
          <div v-for="t in group.topics" :key="t.id" class="p-3 hover:bg-base-200 rounded-lg transition-colors">
            <a :href="`https://bgm.tv/group/topic/${t.id}`" target="_blank" class="text-base-content hover:text-primary">
              {{ t.title }}
            </a>
          </div>
        </div>
        <div v-else class="py-10 text-center text-base-content/40 text-sm">
          暂无话题
        </div>
      </div>
    </div>

    <div v-else class="py-20 text-center text-base-content/40">
      <p>小组不存在或加载失败</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { groupAPI } from '../api/endpoints'

const route = useRoute()
const group = ref(null)
const loading = ref(true)

async function loadGroup() {
  loading.value = true
  try {
    const res = await groupAPI.getDetail(route.params.id)
    group.value = res.data?.data || null
  } catch {
    group.value = null
  }
  loading.value = false
}

onMounted(loadGroup)
</script>
