<template>
  <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('close')" />

    <div
      class="relative bg-base-100 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-base-300"
    >
      <button
        class="absolute top-3 right-3 text-base-content/40 hover:text-base-content transition-colors"
        @click="$emit('close')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div class="text-center mb-4">
        <h2 class="text-lg font-bold text-base-content">绑定 Bangumi 账号</h2>
        <p class="text-sm text-base-content/60 mt-1.5">需要绑定 Bangumi 账号才能使用番剧功能</p>
      </div>

      <div v-if="auth.error" class="alert alert-error mb-3 text-sm">
        <span>{{ auth.error }}</span>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="handleBind">
        <input
          v-model="bangumiToken"
          type="password"
          placeholder="粘贴 Bangumi Access Token"
          class="input input-bordered w-full"
        />
        <button
          type="submit"
          :disabled="auth.loading || !bangumiToken"
          class="btn btn-primary w-full"
        >
          {{ auth.loading ? '绑定中...' : '立即绑定' }}
        </button>
      </form>

      <p class="text-xs text-center mt-3 text-base-content/40">
        前往
        <a href="https://next.bgm.tv/demo/access-token" target="_blank" class="link link-primary"
          >next.bgm.tv/demo/access-token</a
        >
        获取 Token
      </p>

      <div class="divider text-xs text-base-content/30 my-3">或</div>

      <router-link
        :to="`/login?redirect=${encodeURIComponent(returnUrl)}`"
        class="block text-center text-sm text-base-content/60 hover:text-primary transition-colors"
        @click="$emit('close')"
      >
        切换为 Bangumi 直登
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  returnUrl: {
    type: String,
    default: '/'
  }
})

const emit = defineEmits(['close', 'bound'])

const auth = useAuthStore()
const bangumiToken = ref('')

async function handleBind() {
  if (!bangumiToken.value) return
  try {
    await auth.bindBangumi(bangumiToken.value)
    bangumiToken.value = ''
    emit('bound')
    emit('close')
  } catch {
    // 错误已写入 auth.error
  }
}
</script>
