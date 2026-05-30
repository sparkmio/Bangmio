<template>
  <div class="max-w-md mx-auto mt-6">
    <div v-if="error" class="card bg-base-100 border border-base-300">
      <div class="card-body p-8 text-center">
        <p class="text-lg mb-2 text-error">{{ error }}</p>
        <router-link to="/login" class="btn btn-ghost btn-sm text-primary">返回登录</router-link>
      </div>
    </div>
    <div v-else class="card bg-base-100 border border-base-300">
      <div class="card-body p-8 text-center">
        <span class="loading loading-spinner loading-lg text-primary mx-auto mb-4"></span>
        <p class="text-base-content/60">正在完成授权...</p>
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
