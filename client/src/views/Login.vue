<template>
  <div class="max-w-md mx-auto mt-6">
    <div class="card bg-base-100 border border-base-300">
      <div class="card-body p-8">
        <div class="text-center mb-6">
          <img src="/logo.png" alt="Bangmio" class="w-16 h-16 mx-auto rounded-2xl mb-3" />
          <h1 class="text-2xl font-bold text-base-content">登录 Bangmio</h1>
        </div>

        <div v-if="auth.error" class="alert alert-error mb-4">
          <span>{{ auth.error }}</span>
        </div>

        <button
          @click="oauthLogin"
          :disabled="auth.loading"
          class="btn w-full mb-4 bg-[#2D89EF] text-white border-none hover:brightness-110"
        >
          {{ auth.loading ? '跳转中...' : '使用 Bangumi 账号登录' }}
        </button>

        <div class="divider text-xs text-base-content/40">或手动输入 Token</div>

        <form @submit.prevent="handleTokenLogin" class="flex flex-col gap-3">
          <input v-model="token" type="password" placeholder="粘贴 Access Token" class="input input-bordered w-full" />
          <button type="submit" :disabled="auth.loading || !token" class="btn btn-primary w-full">
            {{ auth.loading ? '验证中...' : 'Token 登录' }}
          </button>
        </form>

        <p class="text-xs text-center mt-4 text-base-content/50">
          前往 <a href="https://next.bgm.tv/demo/access-token" target="_blank" class="link link-primary">next.bgm.tv/demo/access-token</a> 获取 Token
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { userAPI } from '../api/endpoints'

const auth = useAuthStore()
const token = ref('')

async function oauthLogin() {
  try {
    if (window.Capacitor) {
      const { Browser } = await import('@capacitor/browser')
      const { App } = await import('@capacitor/app')
      const redirectUri = 'bangmio://callback'
      const oauthUrl = `https://bgm.tv/oauth/authorize?client_id=bgm61416a088eff71580&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`
      await Browser.open({ url: oauthUrl })
      App.addListener('appUrlOpen', async ({ url }) => {
        if (url.startsWith('bangmio://callback')) {
          const u = new URL(url)
          const code = u.searchParams.get('code')
          if (code) {
            await Browser.close()
            auth.oauthLogin(code)
          }
        }
      })
    } else {
      const res = await userAPI.getOAuthUrl()
      window.location.href = res.data.data
    }
  } catch {
    auth.error = '获取授权链接失败'
  }
}

function handleTokenLogin() {
  if (token.value) auth.login(token.value)
}
</script>
