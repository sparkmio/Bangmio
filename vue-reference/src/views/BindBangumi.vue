<template>
  <div class="max-w-md mx-auto mt-6">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body p-8">
        <div class="text-center mb-6">
          <img
            src="/logo.png"
            alt="Bangmio"
            class="w-16 h-16 mx-auto rounded-2xl mb-3"
            decoding="async"
          />
          <h1 class="text-2xl font-bold text-base-content">绑定 Bangumi 账号</h1>
          <p class="text-sm text-base-content/60 mt-2">
            Bangmio 的番剧收藏、评论、评分等功能依赖 Bangumi 数据源，<br />
            绑定后才能完整使用。
          </p>
        </div>

        <div v-if="auth.error" class="alert alert-error mb-4">
          <span>{{ auth.error }}</span>
        </div>

        <!-- OAuth 授权绑定（推荐） -->
        <button
          :disabled="auth.loading || oauthWaiting"
          class="btn w-full bg-[#2D89EF] text-white border-none hover:brightness-110 mb-3"
          @click="handleOAuthBind"
        >
          <span v-if="oauthWaiting" class="loading loading-spinner loading-sm" />
          {{ oauthWaiting ? '请在新页面完成授权...' : '使用 Bangumi 一键授权绑定' }}
        </button>

        <div class="divider text-xs text-base-content/40">或手动粘贴 Token</div>

        <form class="flex flex-col gap-3" @submit.prevent="handleTokenBind">
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

        <p class="text-xs text-center mt-3 text-base-content/50">
          前往
          <a href="https://next.bgm.tv/demo/access-token" target="_blank" class="link link-primary"
            >next.bgm.tv/demo/access-token</a
          >
          获取 Token
        </p>

        <div class="divider text-xs text-base-content/30 my-3">或</div>

        <router-link
          to="/"
          class="block text-center text-sm text-base-content/60 hover:text-primary transition-colors"
        >
          稍后绑定（功能受限）
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const bangumiToken = ref('')
const oauthWaiting = ref(false)

async function handleOAuthBind() {
  try {
    oauthWaiting.value = true
    auth.error = ''
    const url = await auth.getOAuthBindUrl()
    // 跳转到 Bangumi 授权页（带 state JWT）
    window.location.href = url
  } catch {
    oauthWaiting.value = false
    auth.error = '获取授权链接失败，请检查网络'
  }
}

async function handleTokenBind() {
  if (!bangumiToken.value) return
  try {
    await auth.bindBangumi(bangumiToken.value)
    bangumiToken.value = ''
    router.push('/')
  } catch {
    // 错误已写入 auth.error
  }
}
</script>
