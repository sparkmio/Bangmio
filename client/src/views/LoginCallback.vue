<template>
  <div class="max-w-md mx-auto mt-6">
    <div v-if="error" class="card bg-base-100 border border-base-300">
      <div class="card-body p-8 text-center">
        <p class="text-lg mb-2 text-error">{{ error }}</p>
        <p v-if="errorDetail" class="text-sm text-base-content/60 mb-4">{{ errorDetail }}</p>
        <div class="flex justify-center gap-2">
          <button class="btn btn-primary btn-sm" type="button" @click="retryLogin">重新登录</button>
          <router-link to="/" class="btn btn-ghost btn-sm">返回首页</router-link>
        </div>
      </div>
    </div>
    <div v-else class="card bg-base-100 border border-base-300">
      <div class="card-body p-8 text-center">
        <span class="loading loading-spinner loading-lg text-primary mx-auto mb-4" />
        <p class="text-base-content/60">{{ statusText }}</p>
        <p class="text-xs text-base-content/40 mt-2">请不要关闭此页面</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const CALLBACK_TIMEOUT_MS = 20000

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const error = ref('')
const errorDetail = ref('')
const statusText = ref('正在验证授权回调...')
let timeoutId

function queryString(value) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function describeError(err, fallback) {
  const message = err?.response?.data?.error || err?.message
  if (!message) return fallback
  if (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
    return '网络请求超时，请检查网络后重试'
  }
  return message
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutError = new Error('OAuth callback timeout')
        timeoutError.code = 'OAUTH_CALLBACK_TIMEOUT'
        reject(timeoutError)
      }, timeoutMs)
    })
  ])
}

function retryLogin() {
  router.replace({ path: '/login', query: { oauth: 'retry' } })
}

async function handleCallback() {
  const code = queryString(route.query.code)
  const state = queryString(route.query.state)
  const providerError = queryString(route.query.error)
  const providerDescription = queryString(route.query.error_description)

  if (providerError === 'access_denied') {
    error.value = '你拒绝了 Bangumi 授权'
    errorDetail.value = '如需登录，请返回登录页后再次授权。'
    return
  }
  if (providerError) {
    error.value = `Bangumi 授权失败：${providerError}`
    errorDetail.value = providerDescription
    return
  }
  if (!code || !state) {
    error.value = !code ? '未收到 Bangumi 授权码' : '授权状态缺失或无效'
    errorDetail.value = '请从 Bangmio 登录页重新发起授权，不要直接打开回调地址。'
    return
  }

  // 绑定流程的 state 是 JWT（三段式），普通登录流程使用随机字符串。
  const isBindFlow = state.split('.').length === 3

  try {
    if (isBindFlow) {
      statusText.value = '正在绑定 Bangumi 账号...'
      await withTimeout(auth.oauthBindBangumi(code, state), CALLBACK_TIMEOUT_MS)
      statusText.value = '绑定成功，正在返回首页...'
      await router.replace('/')
      return
    }

    statusText.value = '正在向服务器验证授权码...'
    await withTimeout(auth.oauthLogin(code, state), CALLBACK_TIMEOUT_MS)
    statusText.value = '登录成功，正在跳转...'
  } catch (err) {
    if (err?.code === 'OAUTH_CALLBACK_TIMEOUT') {
      error.value = '授权验证超时'
      errorDetail.value = '服务器在 20 秒内没有返回结果，请稍后重试。'
      return
    }
    error.value = describeError(err, isBindFlow ? '绑定失败，请重试' : '授权登录失败')
    errorDetail.value =
      '如果反复出现，请确认 Bangumi OAuth 应用的回调地址为 https://bangmio.site/login/callback。'
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

onMounted(() => {
  // 捕获同步异常和异步异常，避免回调页只剩下 spinner 而没有任何提示。
  Promise.resolve()
    .then(handleCallback)
    .catch(err => {
      error.value = describeError(err, '授权回调处理失败')
      errorDetail.value = '请返回登录页后重新发起授权。'
      if (timeoutId) clearTimeout(timeoutId)
    })
})

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
})
</script>
