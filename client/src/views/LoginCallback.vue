<template>
  <div class="max-w-md mx-auto mt-6">
    <div v-if="error" class="card bg-base-100 border border-base-300">
      <div class="card-body p-8 text-center">
        <p class="text-lg mb-2 text-error">
          {{ error }}
        </p>
        <router-link to="/login" class="btn btn-ghost btn-sm text-primary"> 返回登录 </router-link>
      </div>
    </div>
    <div v-else class="card bg-base-100 border border-base-300">
      <div class="card-body p-8 text-center">
        <span class="loading loading-spinner loading-lg text-primary mx-auto mb-4" />
        <p class="text-base-content/60">{{ statusText }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const error = ref('')
const statusText = ref('正在完成授权...')

onMounted(async () => {
  const code = route.query.code
  const state = route.query.state
  const err = route.query.error

  if (err === 'access_denied') {
    error.value = '你拒绝了授权，请重新登录'
    return
  }
  if (err) {
    error.value = '授权失败：' + err
    return
  }
  if (!code) {
    error.value = '未收到授权码'
    return
  }

  // 通过 state JWT 判断是绑定流程还是登录流程
  // state 存在且为 JWT 格式（三段式）→ 绑定流程
  // 否则 → Bangumi 直登流程
  const isBindFlow = typeof state === 'string' && state.split('.').length === 3

  if (isBindFlow) {
    statusText.value = '正在绑定 Bangumi 账号...'
    try {
      await auth.oauthBindBangumi(code, state)
      router.push('/')
    } catch (e) {
      error.value = auth.error || '绑定失败，请重试'
    }
  } else {
    // 原有 Bangumi 直登流程
    statusText.value = '正在完成登录...'
    try {
      await auth.oauthLogin(code)
    } catch {
      error.value = auth.error || '授权登录失败'
    }
  }
})
</script>
