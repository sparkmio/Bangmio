<template>
  <div class="callback-page">
    <div class="callback-container">
      <div v-if="loading" class="loading-section">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <h2>正在登录中...</h2>
        <p>请稍候，正在验证您的账号</p>
      </div>
      
      <div v-else-if="error" class="error-section">
        <el-icon class="error-icon"><CircleCloseFilled /></el-icon>
        <h2>登录失败</h2>
        <p class="error-message">{{ error }}</p>
        <el-button type="primary" @click="retry" class="retry-btn">
          重试登录
        </el-button>
        <el-button @click="$router.push('/')" class="home-btn">
          返回首页
        </el-button>
      </div>
      
      <div v-else class="success-section">
        <el-icon class="success-icon"><CircleCheck /></el-icon>
        <h2>登录成功！</h2>
        <p>欢迎回来，{{ user?.username }}</p>
        <el-button type="primary" @click="$router.push('/')" class="continue-btn">
          开始使用
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { handleOAuthCallback } from '../utils/auth'

export default {
  name: 'OAuthCallback',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const loading = ref(true)
    const error = ref('')
    const user = ref(null)

    const processCallback = async () => {
      const code = route.query.code
      const errorMsg = route.query.error

      if (errorMsg) {
        error.value = decodeURIComponent(errorMsg)
        loading.value = false
        return
      }

      if (!code) {
        error.value = '缺少授权码'
        loading.value = false
        return
      }

      try {
        user.value = await handleOAuthCallback(code)
        // 等待一下让用户看到成功消息
        setTimeout(() => {
          router.push('/')
        }, 1500)
      } catch (err) {
        error.value = err.message || '登录失败'
      } finally {
        loading.value = false
      }
    }

    const retry = () => {
      router.push('/')
    }

    onMounted(() => {
      processCallback()
    })

    return {
      loading,
      error,
      user,
      retry
    }
  }
}
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--white) 0%, var(--light-pink) 100%);
}

.callback-container {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 60px 40px;
  text-align: center;
  max-width: 500px;
  width: 90%;
  box-shadow: var(--glass-shadow);
}

.loading-section,
.error-section,
.success-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-icon {
  font-size: 60px;
  color: var(--primary-pink);
  animation: rotate 2s linear infinite;
}

.error-icon {
  font-size: 60px;
  color: #f56c6c;
}

.success-icon {
  font-size: 60px;
  color: #67c23a;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

h2 {
  color: #333;
  margin: 0;
  font-size: 1.8rem;
}

p {
  color: #666;
  margin: 0;
  font-size: 1.1rem;
}

.error-message {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
  padding: 12px 20px;
  border-radius: 12px;
  max-width: 400px;
  word-break: break-word;
}

.retry-btn,
.home-btn,
.continue-btn {
  margin-top: 10px;
  padding: 12px 30px;
  border-radius: 12px;
  font-weight: bold;
}

.continue-btn {
  background: linear-gradient(135deg, var(--primary-pink), var(--secondary-pink));
  border: none;
}

.continue-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 107, 139, 0.3);
}
</style>