<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link :to="backLink" class="text-sm hover:underline" style="color: var(--primary)">← 返回</router-link>
      <h1 class="text-xl font-bold" style="color: var(--text)">吐槽箱</h1>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 rounded-full animate-spin" :style="{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }"></div>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="mb-2" style="color: var(--danger)">{{ error }}</p>
      <button @click="fetchComments" class="text-sm hover:underline" style="color: var(--primary)">重试</button>
    </div>

    <div v-else-if="comments.length === 0" class="text-center py-20" style="color: var(--text-muted)">
      <p>暂无吐槽</p>
    </div>

    <div v-else class="space-y-3">
      <div v-for="c in comments" :key="c.id" class="p-4 rounded-xl border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
        <div class="flex items-start gap-3">
          <img v-if="c.user?.avatar" :src="c.user.avatar" class="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          <div v-else class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style="background: var(--primary)">
            {{ c.user?.username?.[0]?.toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <a :href="`https://bgm.tv${c.user?.url}`" target="_blank" class="text-sm font-medium hover:underline" style="color: var(--text)">{{ c.user?.username }}</a>
              <span v-if="c.rating" class="flex items-center gap-0.5 text-xs" style="color: var(--star)">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {{ c.rating }}
              </span>
              <span v-if="c.floor" class="px-1.5 py-0.5 rounded text-xs" style="background: var(--bg-hover); color: var(--text-muted)">#{{ c.floor }}</span>
              <span class="text-xs" style="color: var(--text-muted)">{{ c.timestamp }}</span>
            </div>
            <p class="text-sm leading-relaxed" style="color: var(--text-secondary)">{{ c.content }}</p>

            <div v-if="c.replies?.length" class="mt-3 ml-2 pl-3 border-l-2" :style="{ borderColor: 'var(--border)' }">
              <div v-for="sub in c.replies" :key="sub.id" class="flex items-start gap-2 py-1.5">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { commentsAPI } from '../api/endpoints'

const props = defineProps({ type: { type: String, required: true } })
const route = useRoute()
const comments = ref([])
const loading = ref(true)
const error = ref('')

const backLink = computed(() => {
  return props.type === 'person' ? `/person/${route.params.id}` : `/anime/${route.params.id}`
})

async function fetchComments() {
  loading.value = true
  error.value = ''
  try {
    let res
    if (props.type === 'subject') res = await commentsAPI.getSubjectComments(route.params.id)
    else if (props.type === 'person') res = await commentsAPI.getPersonComments(route.params.id)
    else return
    comments.value = res.data?.data || []
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchComments)
</script>
