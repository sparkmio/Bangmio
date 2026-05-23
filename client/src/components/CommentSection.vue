<template>
  <div v-if="comments.length" class="rounded-xl p-5 border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
    <h2 class="text-lg font-bold mb-4" style="color: var(--text)">吐槽箱</h2>

    <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
      <div v-for="c in comments.slice(0, 10)" :key="c.id" class="flex gap-3 p-3 rounded-lg" :style="{ background: 'var(--bg-hover)' }">
        <img v-if="c.user?.avatar" :src="c.user.avatar" class="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        <div v-else class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style="background: var(--primary)">
          {{ c.user?.username?.[0]?.toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-xs mb-1">
            <a :href="`https://bgm.tv${c.user?.url}`" target="_blank" class="font-medium hover:underline" style="color: var(--text-secondary)">{{ c.user?.username }}</a>
            <span style="color: var(--text-muted)">{{ c.timestamp }}</span>
            <span class="px-1 py-0.5 rounded text-xs" style="background: var(--bg-card); color: var(--text-muted)">#{{ c.floor }}</span>
          </div>
          <p class="text-sm leading-relaxed" style="color: var(--text-secondary)">{{ c.content }}</p>

          <div v-if="c.replies?.length" class="mt-2 ml-1 pl-2 border-l-2" :style="{ borderColor: 'var(--border)' }">
            <div v-for="sub in c.replies.slice(0, 3)" :key="sub.id" class="py-1">
              <div class="flex items-center gap-1 text-xs mb-0.5">
                <a :href="`https://bgm.tv${sub.user?.url}`" target="_blank" class="font-medium hover:underline" style="color: var(--text-muted)">{{ sub.user?.username }}</a>
                <span style="color: var(--text-muted)">{{ sub.timestamp }}</span>
              </div>
              <p class="text-xs" style="color: var(--text-secondary)">{{ sub.content }}</p>
            </div>
            <p v-if="c.replies.length > 3" class="text-xs mt-1" style="color: var(--text-muted)">还有 {{ c.replies.length - 3 }} 条回复...</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="comments.length > 10" class="mt-3 text-center">
      <router-link :to="`/character/${charId}/talkbox`" class="text-sm hover:underline" style="color: var(--primary)">查看全部 {{ comments.length }} 条 →</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { commentsAPI } from '../api/endpoints'

const props = defineProps({ type: String, id: [String, Number] })
const route = useRoute()
const comments = ref([])
const charId = ref(props.id || route.params.id)

async function fetchComments() {
  try {
    let res
    if (props.type === 'character') res = await commentsAPI.getCharacterComments(props.id)
    else if (props.type === 'subject') res = await commentsAPI.getSubjectComments(props.id)
    else if (props.type === 'person') res = await commentsAPI.getPersonComments(props.id)
    else return
    comments.value = res.data?.data || []
  } catch { /* ignore */ }
}

onMounted(fetchComments)
watch(() => props.id, () => { if (props.id) fetchComments() })
</script>
