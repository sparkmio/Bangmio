<template>
  <div class="max-w-md mx-auto mt-6">
    <div v-if="error" class="rounded-2xl p-8 border text-center" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <p class="text-lg mb-2" style="color: var(--danger)">{{ error }}</p>
      <router-link to="/login" class="text-sm hover:underline" style="color: var(--primary)">返回登录</router-link>
    </div>
    <div v-else class="rounded-2xl p-8 border text-center" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <div class="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-4" :style="{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }"></div>
      <p style="color: var(--text-secondary)">正在完成授权...</p>
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

onMounted(() => {
  const code = route.query.code
  const err = route.query.error

  if (err === 'access_denied') {
    error.value = '你拒绝了授权，请重新登录'
    return
  }
  if (err) {
    error.value = '授权失败：' + err
    return
  }
  if (code) {
    auth.oauthLogin(code)
  } else {
    error.value = '未收到授权码'
  }
})
</script>
