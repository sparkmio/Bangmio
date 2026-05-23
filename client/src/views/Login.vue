<template>
  <div class="max-w-md mx-auto mt-6">
    <div class="rounded-2xl p-8 border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <div class="text-center mb-6">
        <img src="/logo.png" alt="Bangmio" class="w-16 h-16 mx-auto rounded-2xl mb-3" />
        <h1 class="text-2xl font-bold" style="color: var(--text)">登录 Bangmio</h1>
      </div>

      <div v-if="auth.error" class="mb-4 p-3 rounded-lg text-sm" :style="{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: 'var(--danger)' }">
        {{ auth.error }}
      </div>

      <button
        @click="oauthLogin"
        :disabled="auth.loading"
        class="w-full py-3 rounded-xl font-medium text-white transition-all hover:brightness-110 disabled:opacity-50 mb-4"
        style="background: #2D89EF"
      >
        {{ auth.loading ? '跳转中...' : '使用 Bangumi 账号登录' }}
      </button>

      <div class="flex items-center gap-3 my-4">
        <div class="flex-1 h-px" style="background: var(--border)"></div>
        <span class="text-xs" style="color: var(--text-muted)">或手动输入 Token</span>
        <div class="flex-1 h-px" style="background: var(--border)"></div>
      </div>

      <form @submit.prevent="handleTokenLogin" class="flex flex-col gap-3">
        <input v-model="token" type="password" placeholder="粘贴 Access Token" class="input-field" />
        <button type="submit" :disabled="auth.loading || !token" class="w-full py-2.5 rounded-xl font-medium text-white transition-all hover:brightness-110 disabled:opacity-50" style="background: var(--primary)">
          {{ auth.loading ? '验证中...' : 'Token 登录' }}
        </button>
      </form>

      <p class="text-xs text-center mt-4" style="color: var(--text-muted)">
        前往 <a href="https://next.bgm.tv/demo/access-token" target="_blank" class="hover:underline" style="color: var(--primary)">next.bgm.tv/demo/access-token</a> 获取 Token
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { userAPI } from '../api/endpoints'

const auth = useAuthStore()
const token = ref('')

async function oauthLogin() {
  try {
    const res = await userAPI.getOAuthUrl()
    window.location.href = res.data.data
  } catch {
    auth.error = '获取授权链接失败'
  }
}

function handleTokenLogin() {
  if (token.value) auth.login(token.value)
}
</script>
