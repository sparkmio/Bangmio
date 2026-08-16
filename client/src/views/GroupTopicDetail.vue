<template>
  <div class="container mx-auto max-w-4xl px-4 py-6">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="$router.back()">← 返回</button>
      <router-link to="/groups" class="text-sm text-primary hover:underline">小组首页</router-link>
    </div>

    <div v-if="loading" class="space-y-4">
      <div class="card bg-base-100 border border-base-300 p-6 space-y-3">
        <div class="skeleton h-7 w-2/3" />
        <div class="skeleton h-4 w-1/3" />
      </div>
      <div v-for="n in 4" :key="n" class="card bg-base-100 border border-base-300 p-5 space-y-2">
        <div class="skeleton h-4 w-1/4" />
        <div class="skeleton h-16 w-full" />
      </div>
    </div>

    <div v-else-if="topic" class="space-y-5">
      <header class="card bg-base-100 border border-base-300">
        <div class="card-body p-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h1 class="text-xl font-bold leading-relaxed">{{ topic.title }}</h1>
              <div
                class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/55"
              >
                <router-link
                  v-if="topic.group_id"
                  :to="`/group/${topic.group_id}`"
                  class="text-primary hover:underline"
                >
                  {{ topic.group_name || '所属小组' }}
                </router-link>
                <span v-if="topic.author">{{ topic.author }}</span>
              </div>
            </div>
            <span class="badge badge-primary badge-outline whitespace-nowrap">
              {{ topic.reply_count || 0 }} 回复
            </span>
          </div>
        </div>
      </header>

      <section class="card bg-base-100 border border-base-300 overflow-hidden">
        <div class="px-5 py-4 border-b border-base-300">
          <h2 class="font-semibold">帖子内容</h2>
        </div>
        <div v-if="topic.replies?.length" class="divide-y divide-base-300">
          <article v-for="reply in topic.replies" :key="reply.id" class="p-5">
            <div class="flex items-center gap-2 text-sm text-base-content/55 mb-2">
              <span class="font-medium text-base-content">{{ reply.author || '匿名用户' }}</span>
              <span v-if="reply.timestamp">{{ reply.timestamp }}</span>
              <span class="ml-auto badge badge-xs">#{{ reply.floor }}</span>
            </div>
            <p class="whitespace-pre-wrap break-words leading-7 text-base-content/80">
              {{ reply.content }}
            </p>
          </article>
        </div>
        <div v-else class="p-8 text-center text-sm text-base-content/55">
          帖子标题已在 Bangmio 内打开，但暂时无法解析正文回复。
        </div>
      </section>
    </div>

    <div v-else class="py-20 text-center">
      <p class="text-base-content/60 mb-4">帖子暂时无法加载，请稍后重试。</p>
      <button class="btn btn-primary btn-sm" @click="loadTopic">重试</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { groupAPI } from '../api/endpoints'

const route = useRoute()
const topic = ref(null)
const loading = ref(true)

async function loadTopic() {
  loading.value = true
  try {
    const response = await groupAPI.getTopicDetail(route.params.id)
    topic.value = response.data?.data || null
  } catch {
    topic.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, loadTopic)
onMounted(loadTopic)
</script>
