<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link :to="`/anime/${route.params.id}`" class="text-sm hover:underline" style="color: var(--primary)">← 返回</router-link>
      <h1 class="text-xl font-bold" style="color: var(--text)">讨论版</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 rounded-full animate-spin" :style="{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }"></div>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="mb-2" style="color: var(--danger)">{{ error }}</p>
      <button @click="fetchTopics" class="text-sm hover:underline" style="color: var(--primary)">重试</button>
    </div>

    <div v-else-if="topics.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      <p>暂无讨论帖</p>
    </div>

    <div v-else class="space-y-2">
      <router-link
        v-for="topic in topics"
        :key="topic.id"
        :to="`/topic/${topic.id}`"
        class="flex items-center justify-between p-4 rounded-xl border transition-all hover:brightness-110"
        :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }"
      >
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-medium truncate" style="color: var(--text)">{{ topic.title }}</h3>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-xs" style="color: var(--text-muted)">{{ topic.author }}</span>
            <span class="text-xs" style="color: var(--text-muted)">{{ topic.date }}</span>
          </div>
        </div>
        <div class="flex-shrink-0 ml-4">
          <span class="px-2 py-1 rounded-lg text-xs font-medium" :style="{ background: 'var(--bg-hover)', color: topic.replies > 0 ? 'var(--primary)' : 'var(--text-muted)' }">
            {{ topic.replies }} 回复
          </span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { commentsAPI } from '../api/endpoints'

const route = useRoute()
const topics = ref([])
const loading = ref(true)
const error = ref('')

async function fetchTopics() {
  loading.value = true
  error.value = ''
  try {
    const res = await commentsAPI.getSubjectTopics(route.params.id)
    topics.value = res.data?.data || []
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }

  nextTick(() => {
    gsap.from('.space-y-2 > a', { opacity: 0, y: 15, stagger: 0.05, duration: 0.35, ease: 'power2.out' })
  })
}

onMounted(fetchTopics)
</script>
