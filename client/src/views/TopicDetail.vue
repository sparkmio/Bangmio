<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <a @click.prevent="$router.back()" class="btn btn-ghost btn-sm text-primary cursor-pointer">← 返回</a>
      <h1 class="text-lg font-bold truncate text-base-content">{{ topic.op?.title || '帖子详情' }}</h1>
      <a :href="`https://bgm.tv/subject/topic/${route.params.id}`" target="_blank" class="btn btn-ghost btn-xs ml-auto text-base-content/50">在 Bangumi 查看 →</a>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="mb-2 text-error">{{ error }}</p>
      <button @click="fetchTopic" class="btn btn-ghost btn-sm text-primary">重试</button>
    </div>

    <div v-else>
      <div v-if="topic.op" class="card bg-base-100 border border-base-300 mb-6">
        <div class="card-body p-5">
          <div class="flex items-start gap-3 mb-3">
            <div class="avatar placeholder shrink-0">
              <div class="w-10 h-10 rounded-full bg-primary text-primary-content">
                <img v-if="topic.op.user?.avatar" :src="topic.op.user.avatar" />
                <span v-else class="text-sm">{{ topic.op.user?.username?.[0]?.toUpperCase() }}</span>
              </div>
            </div>
            <div>
              <a :href="`https://bgm.tv${topic.op.user?.url}`" target="_blank" class="text-sm font-medium hover:underline text-base-content">{{ topic.op.user?.username }}</a>
              <span class="text-xs ml-2 text-base-content/50">{{ topic.op.timestamp }}</span>
            </div>
          </div>
          <div class="text-sm leading-relaxed whitespace-pre-wrap break-words text-base-content/70">{{ topic.op.content }}</div>
        </div>
      </div>

      <div v-if="topic.replies?.length" class="mb-4">
        <h2 class="text-sm font-bold mb-3 text-base-content/50">回复 ({{ topic.replies.length }})</h2>
        <div class="space-y-3">
          <div v-for="r in topic.replies" :key="r.id" class="card bg-base-100 border border-base-300">
            <div class="card-body p-4">
              <div class="flex items-start gap-3">
                <div class="avatar placeholder shrink-0">
                  <div class="w-8 h-8 rounded-full bg-primary text-primary-content">
                    <img v-if="r.user?.avatar" :src="r.user.avatar" />
                    <span v-else class="text-xs">{{ r.user?.username?.[0]?.toUpperCase() }}</span>
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <a :href="`https://bgm.tv${r.user?.url}`" target="_blank" class="text-sm font-medium hover:underline text-base-content">{{ r.user?.username }}</a>
                    <span class="badge badge-xs">#{{ r.floor }}</span>
                    <span class="text-xs text-base-content/50">{{ r.timestamp }}</span>
                  </div>
                  <p class="text-sm leading-relaxed whitespace-pre-wrap break-words text-base-content/70">{{ r.content }}</p>

                  <div v-if="r.replies?.length" class="mt-3 ml-2 pl-3 border-l-2 border-base-300">
                    <div v-for="sub in r.replies" :key="sub.id" class="flex items-start gap-2 py-2">
                      <div class="avatar placeholder shrink-0">
                        <div class="w-6 h-6 rounded-full bg-primary text-primary-content">
                          <img v-if="sub.user?.avatar" :src="sub.user.avatar" />
                          <span v-else class="text-xs">{{ sub.user?.username?.[0]?.toUpperCase() }}</span>
                        </div>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 mb-0.5">
                          <a :href="`https://bgm.tv${sub.user?.url}`" target="_blank" class="text-xs font-medium hover:underline text-base-content">{{ sub.user?.username }}</a>
                          <span class="text-xs text-base-content/50">{{ sub.timestamp }}</span>
                        </div>
                        <p class="text-xs leading-relaxed text-base-content/70">{{ sub.content }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { commentsAPI } from '../api/endpoints'

const route = useRoute()
const topic = ref({ op: null, replies: [] })
const loading = ref(true)
const error = ref('')

async function fetchTopic() {
  loading.value = true
  error.value = ''
  try {
    const res = await commentsAPI.getTopicDetail(route.params.id)
    topic.value = res.data?.data || { op: null, replies: [] }
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }

  nextTick(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    tl.fromTo('.card:first-child', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 })
    tl.fromTo('.space-y-3 > .card', { opacity: 0, y: 15 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.35 }, '-=0.2')
  })
}

onMounted(fetchTopic)
</script>
