<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <a @click.prevent="$router.back()" class="text-sm hover:underline cursor-pointer" style="color: var(--primary)">← 返回</a>
      <h1 class="text-lg font-bold truncate" style="color: var(--text)">{{ topic.op?.title || '帖子详情' }}</h1>
      <a :href="`https://bgm.tv/subject/topic/${route.params.id}`" target="_blank" class="text-xs hover:underline ml-auto flex-shrink-0" style="color: var(--text-muted)">在 Bangumi 查看 →</a>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 rounded-full animate-spin" :style="{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }"></div>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="mb-2" style="color: var(--danger)">{{ error }}</p>
      <button @click="fetchTopic" class="text-sm hover:underline" style="color: var(--primary)">重试</button>
    </div>

    <div v-else>
      <div v-if="topic.op" class="p-5 rounded-xl border mb-6" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
        <div class="flex items-start gap-3 mb-3">
          <img v-if="topic.op.user?.avatar" :src="topic.op.user.avatar" class="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          <div v-else class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white" style="background: var(--primary)">
            {{ topic.op.user?.username?.[0]?.toUpperCase() }}
          </div>
          <div>
            <a :href="`https://bgm.tv${topic.op.user?.url}`" target="_blank" class="text-sm font-medium hover:underline" style="color: var(--text)">{{ topic.op.user?.username }}</a>
            <span class="text-xs ml-2" style="color: var(--text-muted)">{{ topic.op.timestamp }}</span>
          </div>
        </div>
        <div class="text-sm leading-relaxed whitespace-pre-wrap" style="color: var(--text-secondary)">{{ topic.op.content }}</div>
      </div>

      <div v-if="topic.replies?.length" class="mb-4">
        <h2 class="text-sm font-bold mb-3" style="color: var(--text-muted)">回复 ({{ topic.replies.length }})</h2>
        <div class="space-y-3">
          <div v-for="r in topic.replies" :key="r.id" class="p-4 rounded-xl border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
            <div class="flex items-start gap-3">
              <img v-if="r.user?.avatar" :src="r.user.avatar" class="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              <div v-else class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style="background: var(--primary)">
                {{ r.user?.username?.[0]?.toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <a :href="`https://bgm.tv${r.user?.url}`" target="_blank" class="text-sm font-medium hover:underline" style="color: var(--text)">{{ r.user?.username }}</a>
                  <span class="px-1.5 py-0.5 rounded text-xs" style="background: var(--bg-hover); color: var(--text-muted)">#{{ r.floor }}</span>
                  <span class="text-xs" style="color: var(--text-muted)">{{ r.timestamp }}</span>
                </div>
                <p class="text-sm leading-relaxed whitespace-pre-wrap" style="color: var(--text-secondary)">{{ r.content }}</p>

                <div v-if="r.replies?.length" class="mt-3 ml-2 pl-3 border-l-2" :style="{ borderColor: 'var(--border)' }">
                  <div v-for="sub in r.replies" :key="sub.id" class="flex items-start gap-2 py-2">
                    <img v-if="sub.user?.avatar" :src="sub.user.avatar" class="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                    <div v-else class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style="background: var(--primary)">
                      {{ sub.user?.username?.[0]?.toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5 mb-0.5">
                        <a :href="`https://bgm.tv${sub.user?.url}`" target="_blank" class="text-xs font-medium hover:underline" style="color: var(--text)">{{ sub.user?.username }}</a>
                        <span class="text-xs" style="color: var(--text-muted)">{{ sub.timestamp }}</span>
                      </div>
                      <p class="text-xs leading-relaxed" style="color: var(--text-secondary)">{{ sub.content }}</p>
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
    tl.from('.p-5.rounded-xl:first-child', { opacity: 0, y: 20, duration: 0.4 })
    tl.from('.space-y-3 > div', { opacity: 0, y: 15, stagger: 0.06, duration: 0.35 }, '-=0.2')
  })
}

onMounted(fetchTopic)
</script>
