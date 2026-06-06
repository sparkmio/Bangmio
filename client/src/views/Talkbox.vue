<template>
  <div class="max-w-4xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <router-link :to="backLink" class="btn btn-ghost btn-sm text-primary cursor-pointer">← 返回</router-link>
      <h1 class="text-xl font-bold text-base-content">吐槽箱</h1>
    </div>

    <LoadingState :loading="loading" :error="error" @retry="fetchComments" />

    <div v-if="!loading && !error">
      <div v-if="comments.length === 0" class="py-20 text-center text-base-content/50">
        <p>暂无吐槽</p>
      </div>

      <div v-else class="space-y-3">
        <div v-for="c in comments" :key="c.id" class="card bg-base-100 border border-base-300">
          <div class="card-body p-4">
            <div class="flex gap-3">
              <div class="avatar placeholder shrink-0">
                <div class="w-8 h-8 rounded-full bg-primary text-primary-content">
                  <img v-if="c.user?.avatar" :src="c.user.avatar" />
                  <span v-else class="text-xs">{{ c.user?.username?.[0]?.toUpperCase() }}</span>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 text-xs mb-1">
                  <a :href="`https://bgm.tv${c.user?.url}`" target="_blank" class="font-medium hover:underline text-base-content/70">{{ c.user?.username }}</a>
                  <span class="text-base-content/40">{{ c.timestamp }}</span>
                  <span class="badge badge-xs">#{{ c.floor }}</span>
                </div>
                <p class="text-sm leading-relaxed text-base-content/70">{{ c.content }}</p>

                <div v-if="c.replies?.length" class="mt-3 ml-1 pl-2 border-l-2 border-base-300">
                  <div v-for="sub in c.replies" :key="sub.id" class="flex items-start gap-2 py-2">
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

      <!-- Comment input -->
      <div v-if="auth.isLoggedIn" class="mt-4 pt-4 border-t border-base-300">
        <form @submit.prevent="submitComment" class="flex gap-2">
          <input v-model="newComment" type="text" placeholder="发一条吐槽..." class="input input-bordered input-sm flex-1" :disabled="sending" />
          <button type="submit" :disabled="!newComment.trim() || sending" class="btn btn-primary btn-sm">
            <span v-if="sending" class="loading loading-spinner loading-xs"></span>
            发送
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { commentsAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import LoadingState from '../components/LoadingState.vue'

const props = defineProps({ type: String })
const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()
const comments = ref([])
const loading = ref(true)
const error = ref('')
const newComment = ref('')
const sending = ref(false)

const backLink = computed(() => {
  const id = route.params.id
  return props.type === 'person' ? `/person/${id}` : `/anime/${id}`
})

async function fetchComments() {
  loading.value = true; error.value = ''
  try {
    let res
    if (props.type === 'person') res = await commentsAPI.getPersonComments(route.params.id)
    else res = await commentsAPI.getSubjectComments(route.params.id)
    comments.value = res.data?.data || []
  } catch { error.value = '加载失败' }
  finally { loading.value = false }
}

async function submitComment() {
  if (!newComment.value.trim()) return
  sending.value = true
  try {
    await commentsAPI.postTalkbox(route.params.id, { content: newComment.value.trim() })
    newComment.value = ''
    toast.success('发送成功')
    await fetchComments()
  } catch (err) {
    toast.error(err.response?.data?.error || '发送失败')
  } finally {
    sending.value = false
  }
}

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) fetchComments()
})

onMounted(fetchComments)
</script>
