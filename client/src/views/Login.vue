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
          <h1 class="text-2xl font-bold text-base-content">登录 Bangmio</h1>
        </div>

        <!-- Tab 切换 -->
        <div class="flex gap-1 mb-4 bg-base-200 p-1 rounded-lg">
          <button
            class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all"
            :class="
              activeTab === 'bangmio'
                ? 'bg-base-100 text-primary shadow-sm'
                : 'text-base-content/60 hover:text-base-content'
            "
            @click="activeTab = 'bangmio'"
          >
            Bangmio 账号
          </button>
          <button
            class="flex-1 py-1.5 text-sm font-medium rounded-md transition-all"
            :class="
              activeTab === 'bangumi'
                ? 'bg-base-100 text-primary shadow-sm'
                : 'text-base-content/60 hover:text-base-content'
            "
            @click="activeTab = 'bangumi'"
          >
            Bangumi 直登
          </button>
        </div>

        <div v-if="auth.error" class="alert alert-error mb-4">
          <span>{{ auth.error }}</span>
        </div>

        <!-- Tab 1: Bangmio 账号登录 -->
        <form
          v-if="activeTab === 'bangmio'"
          class="flex flex-col gap-3"
          @submit.prevent="handleBangmioLogin"
        >
          <input
            v-model="email"
            type="email"
            placeholder="邮箱"
            class="input input-bordered w-full"
            autocomplete="email"
          />
          <input
            v-model="password"
            type="password"
            placeholder="密码"
            class="input input-bordered w-full"
            autocomplete="current-password"
          />
          <button type="submit" :disabled="auth.loading" class="btn btn-primary w-full">
            {{ auth.loading ? '登录中...' : '登录' }}
          </button>

          <p class="text-sm text-center mt-2 text-base-content/50">
            还没账号？
            <router-link to="/register" class="link link-primary">立即注册</router-link>
          </p>
        </form>

        <!-- Tab 2: Bangumi 直登 -->
        <div v-else class="flex flex-col gap-3">
          <div v-if="oauthWaiting" class="text-center py-4">
            <span class="loading loading-spinner loading-lg text-primary" />
            <p class="text-sm text-base-content/60 mt-3">请在浏览器中完成授权...</p>
          </div>

          <button
            v-else
            :disabled="auth.loading"
            class="btn w-full bg-[#2D89EF] text-white border-none hover:brightness-110"
            @click="oauthLogin"
          >
            {{ auth.loading ? '跳转中...' : '使用 Bangumi 账号登录' }}
          </button>

          <div class="divider text-xs text-base-content/40">或手动输入 Token</div>

          <form class="flex flex-col gap-3" @submit.prevent="handleTokenLogin">
            <input
              v-model="token"
              type="password"
              placeholder="粘贴 Access Token"
              class="input input-bordered w-full"
            />
            <button type="submit" :disabled="auth.loading || !token" class="btn btn-primary w-full">
              {{ auth.loading ? '验证中...' : 'Token 登录' }}
            </button>
          </form>

          <p class="text-xs text-center mt-2 text-base-content/50">
            前往
            <a
              href="https://next.bgm.tv/demo/access-token"
              target="_blank"
              class="link link-primary"
              >next.bgm.tv/demo/access-token</a
            >
            获取 Token
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { userAPI } from '../api/endpoints'

const auth = useAuthStore()
const activeTab = ref('bangmio')
const email = ref('')
const password = ref('')
const token = ref('')
const oauthWaiting = ref(false)

// 切换 Tab 时清空错误信息
watch(activeTab, () => {
  auth.error = ''
})

async function handleBangmioLogin() {
  if (!email.value || !password.value) return
  try {
    await auth.loginWithBangmio(email.value, password.value)
  } catch {
    // 错误已写入 auth.error
  }
}

async function oauthLogin() {
  try {
    oauthWaiting.value = true
    const res = await userAPI.getOAuthUrl()
    window.location.href = res.data.data
  } catch {
    oauthWaiting.value = false
    auth.error = '获取授权链接失败'
  }
}

function handleTokenLogin() {
  if (token.value) auth.loginWithBangumi(token.value)
}
</script>
