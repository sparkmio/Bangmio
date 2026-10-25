<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link :to="`/anime/${route.params.id}`" class="btn btn-ghost btn-sm text-primary">
        ← 返回
      </router-link>
      <h1 class="text-xl font-bold text-base-content">讨论版</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="mb-2 text-error">
        {{ error }}
      </p>
      <button class="btn btn-ghost btn-sm text-primary" @click="fetchTopics">重试</button>
    </div>

    <div v-else-if="topics.length === 0" class="py-20 text-center text-base-content/50">
      <p>暂无讨论帖</p>
    </div>

    <div v-else class="space-y-2">
      <router-link
        v-for="topic in topics"
        :key="topic.id"
        :to="`/topic/${topic.id}`"
        class="card bg-base-100 border border-base-300 hover:border-primary transition-all hover:brightness-110"
      >
        <div class="card-body p-4 flex-row items-center justify-between">
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-medium truncate text-base-content">
              {{ topic.title }}
            </h3>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs text-base-content/50">{{ topic.author }}</span>
              <span class="text-xs text-base-content/50">{{ topic.date }}</span>
            </div>
          </div>
          <div class="flex-shrink-0 ml-4">
            <span
              class="badge badge-sm"
              :class="topic.replies > 0 ? 'badge-primary' : 'badge-ghost'"
            >
              {{ topic.replies }} 回复
            </span>
          </div>
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
    gsap.fromTo(
      '.space-y-2 > a',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, stagger: 0.05, duration: 0.35, ease: 'power2.out' }
    )
  })
}

onMounted(fetchTopics)
</script>
