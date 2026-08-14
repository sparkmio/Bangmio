<template>
  <div>
    <div v-if="auth.isLoggedIn" class="mb-4">
      <button class="btn btn-sm btn-primary" @click="showNewTopicModal = true">发表新讨论</button>
    </div>
    <div v-if="topicLoading" class="flex justify-center py-10">
      <span class="loading loading-spinner loading-lg text-primary" />
    </div>
    <div v-else-if="topics.length === 0" class="py-10 text-center text-base-content/50">
      <p>暂无讨论帖</p>
    </div>
    <div v-else class="space-y-2">
      <router-link
        v-for="topic in topics"
        :key="topic.id"
        :to="`/topic/${topic.id}`"
        class="card bg-base-100 border border-base-300 hover:border-primary transition-all hover:brightness-110 block"
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
              >{{ topic.replies }} 回复</span
            >
          </div>
        </div>
      </router-link>
    </div>
    <router-link :to="`/anime/${subjectId}/topics`" class="btn btn-sm btn-outline mt-4 w-full">
      查看全部讨论
    </router-link>
    <a
      :href="`https://bangumi.lol/subject/${subjectId}/board`"
      target="_blank"
      class="btn btn-sm btn-ghost mt-2 w-full"
      >在 Bangumi 发表讨论 →</a
    >

    <dialog v-if="showNewTopicModal" class="modal modal-open modal-bottom sm:modal-middle">
      <div class="modal-box max-h-[90vh] sm:max-w-lg">
        <h3 class="text-lg font-bold mb-4">发表新讨论</h3>
        <input
          v-model="newTopicTitle"
          placeholder="标题"
          class="input input-bordered w-full mb-3"
        />
        <textarea
          v-model="newTopicContent"
          placeholder="内容..."
          rows="5"
          class="textarea textarea-bordered w-full mb-4"
        />
        <div class="flex gap-2 justify-end">
          <button class="btn btn-ghost btn-sm" @click="showNewTopicModal = false">取消</button>
          <button :disabled="newTopicPosting" class="btn btn-primary btn-sm" @click="postNewTopic">
            <span v-if="newTopicPosting" class="loading loading-spinner loading-xs" />
            发布
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="showNewTopicModal = false" />
    </dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { commentsAPI } from '../../api/endpoints'
import { useAuthStore } from '../../stores/auth'
import { useToastStore } from '../../stores/toast'

const props = defineProps({
  subjectId: { type: [String, Number], required: true },
  topics: { type: Array, default: () => [] },
  topicLoading: { type: Boolean, default: false }
})

const emit = defineEmits(['posted'])

const auth = useAuthStore()
const toast = useToastStore()

const showNewTopicModal = ref(false)
const newTopicTitle = ref('')
const newTopicContent = ref('')
const newTopicPosting = ref(false)

async function postNewTopic() {
  if (!newTopicTitle.value.trim() || !newTopicContent.value.trim()) return
  newTopicPosting.value = true
  try {
    const res = await commentsAPI.postTopic(props.subjectId, {
      title: newTopicTitle.value.trim(),
      content: newTopicContent.value.trim()
    })
    if (res.data?.success) {
      toast.success('发布成功')
      showNewTopicModal.value = false
      newTopicTitle.value = ''
      newTopicContent.value = ''
      // 通知父组件刷新讨论列表
      emit('posted')
    } else {
      toast.error(res.data?.error || '发布失败')
    }
  } catch {
    toast.error('发布失败')
  }
  newTopicPosting.value = false
}
</script>
