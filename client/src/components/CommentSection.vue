<template>
  <div v-if="comments.length" class="card bg-base-100 border border-base-300">
    <div class="card-body p-5">
      <h2 class="card-title text-lg">吐槽箱</h2>

      <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
        <div
          v-for="c in comments.slice(0, 10)"
          :key="c.id"
          class="flex gap-3 p-3 rounded-lg bg-base-200"
        >
          <div class="avatar placeholder shrink-0">
            <div class="w-8 h-8 rounded-full bg-primary text-primary-content">
              <img
                v-if="c.user?.avatar"
                :src="c.user.avatar"
                :alt="c.user?.username || ''"
                loading="lazy"
                decoding="async"
              />
              <span v-else class="text-xs">{{ c.user?.username?.[0]?.toUpperCase() }}</span>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 text-xs mb-1">
              <a
                :href="`https://bgm.tv${c.user?.url}`"
                target="_blank"
                class="font-medium hover:underline text-base-content/70"
                >{{ c.user?.username }}</a
              >
              <span class="text-base-content/40">{{ c.timestamp }}</span>
              <span class="badge badge-xs">#{{ c.floor }}</span>
            </div>
            <p class="text-sm leading-relaxed text-base-content/70">
              {{ c.content }}
            </p>

            <div v-if="c.replies?.length" class="mt-2 ml-1 pl-2 border-l-2 border-base-300">
              <div v-for="sub in c.replies.slice(0, 3)" :key="sub.id" class="py-1">
                <div class="flex items-center gap-1 text-xs mb-0.5">
                  <a
                    :href="`https://bgm.tv${sub.user?.url}`"
                    target="_blank"
                    class="font-medium hover:underline text-base-content/50"
                    >{{ sub.user?.username }}</a
                  >
                  <span class="text-base-content/40">{{ sub.timestamp }}</span>
                </div>
                <p class="text-xs text-base-content/70">
                  {{ sub.content }}
                </p>
              </div>
              <p v-if="c.replies.length > 3" class="text-xs mt-1 text-base-content/40">
                还有 {{ c.replies.length - 3 }} 条回复...
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="comments.length > 10" class="mt-3 text-center">
        <router-link :to="`/character/${charId}/talkbox`" class="btn btn-ghost btn-sm text-primary">
          查看全部 {{ comments.length }} 条 →
        </router-link>
      </div>

      <!-- Comment input -->
      <div v-if="auth.isLoggedIn" class="mt-4 pt-4 border-t border-base-300">
        <form class="flex gap-2" @submit.prevent="submitComment">
          <input
            v-model="newComment"
            type="text"
            placeholder="发一条吐槽..."
            class="input input-bordered input-sm flex-1"
            :disabled="sending"
          />
          <button
            type="submit"
            :disabled="!newComment.trim() || sending"
            class="btn btn-primary btn-sm"
          >
            <span v-if="sending" class="loading loading-spinner loading-xs" />
            发送
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { commentsAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const props = defineProps({
  type: { type: String, default: '' },
  id: { type: [String, Number], default: '' }
})
const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()
const comments = ref([])
const charId = ref(props.id || route.params.id)
const newComment = ref('')
const sending = ref(false)

const MAX_CONTENT_LENGTH = 5000

async function fetchComments() {
  try {
    let res
    if (props.type === 'character') res = await commentsAPI.getCharacterComments(props.id)
    else if (props.type === 'subject') res = await commentsAPI.getSubjectComments(props.id)
    else if (props.type === 'person') res = await commentsAPI.getPersonComments(props.id)
    else return
    comments.value = res.data?.data || []
  } catch {
    /* ignore */
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return
  let content = newComment.value.trim()
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.slice(0, MAX_CONTENT_LENGTH)
    toast.error(`内容过长，已截断至 ${MAX_CONTENT_LENGTH} 字`)
  }
  sending.value = true
  try {
    await commentsAPI.postComment(props.id, { content })
    newComment.value = ''
    toast.success('发送成功')
    await fetchComments()
  } catch (err) {
    toast.error(err.response?.data?.error || '发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(fetchComments)
watch(
  () => props.id,
  () => {
    if (props.id) fetchComments()
  }
)
</script>
