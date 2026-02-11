<template>
  <nav class="dock-bar">
    <div class="dock-container">
      <!-- Logo -->
      <div class="dock-logo" @click="$router.push('/')">
        <img src="/logo.png" alt="Bangmio" class="logo-image" />
        <span class="logo-text">Bangmio</span>
      </div>

      <!-- 导航链接 -->
      <div class="nav-links">
        <router-link to="/" class="nav-link">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </router-link>
        <router-link to="/search" class="nav-link">
          <el-icon><Search /></el-icon>
          <span>搜索</span>
        </router-link>
        <router-link to="/favorites" v-if="user" class="nav-link">
          <el-icon><Star /></el-icon>
          <span>收藏</span>
        </router-link>
      </div>

      <!-- 用户区域 -->
      <div class="user-area">
        <div v-if="user" class="user-info">
          <el-avatar :size="36" :src="user.avatar" class="user-avatar" />
          <span class="user-name">{{ user.username }}</span>
          <el-button type="text" @click="logout" class="logout-btn">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
        </div>
        <div v-else>
          <el-button class="login-btn glass-btn" @click="showLogin = true">
            <el-icon><User /></el-icon>
            <span>登录</span>
          </el-button>
        </div>
      </div>
    </div>

    <!-- 登录对话框 -->
    <el-dialog
      v-model="showLogin"
      title="登录 Bangmio"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="login-dialog">
        <p class="login-tip">使用 Bangumi 账号登录</p>
        <el-button 
          type="primary" 
          class="oauth-btn glass-btn" 
          @click="handleBangumiLogin"
          :loading="loginLoading"
        >
          <el-icon><Connection /></el-icon>
          <span>Bangumi OAuth 登录</span>
        </el-button>
        <div class="login-terms">
          <small>登录即表示同意我们的服务条款和隐私政策</small>
        </div>
      </div>
    </el-dialog>
  </nav>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loginWithBangumi, logoutUser, getUserInfo } from '../utils/auth'

export default {
  name: 'DockBar',
  setup() {
    const router = useRouter()
    const user = ref(null)
    const showLogin = ref(false)
    const loginLoading = ref(false)

    // 检查登录状态
    const checkAuth = async () => {
      try {
        const userInfo = await getUserInfo()
        user.value = userInfo
      } catch (error) {
        user.value = null
      }
    }

    // Bangumi OAuth 登录
    const handleBangumiLogin = async () => {
      loginLoading.value = true
      try {
        const authUrl = await loginWithBangumi()
        window.location.href = authUrl
      } catch (error) {
        ElMessage.error('登录失败：' + error.message)
        loginLoading.value = false
      }
    }

    // 登出
    const logout = async () => {
      try {
        await logoutUser()
        user.value = null
        ElMessage.success('已退出登录')
        router.push('/')
      } catch (error) {
        ElMessage.error('退出失败：' + error.message)
      }
    }

    onMounted(() => {
      checkAuth()
    })

    return {
      user,
      showLogin,
      loginLoading,
      handleBangumiLogin,
      logout
    }
  }
}
</script>

<style scoped>
.dock-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 107, 139, 0.1);
  box-shadow: 0 4px 30px rgba(255, 107, 139, 0.1);
  height: 70px;
}

.dock-container {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.dock-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.dock-logo:hover {
  transform: scale(1.05);
}

.logo-image {
  height: 40px;
  width: 40px;
  object-fit: contain;
  border-radius: 10px;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(135deg, var(--primary-pink), var(--secondary-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  gap: 30px;
  align-items: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  text-decoration: none;
  padding: 10px 16px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: rgba(255, 107, 139, 0.1);
  color: var(--primary-pink);
}

.nav-link.router-link-active {
  background: rgba(255, 107, 139, 0.15);
  color: var(--primary-pink);
  font-weight: bold;
}

.nav-link .el-icon {
  font-size: 1.2rem;
}

.user-area {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  border: 2px solid rgba(255, 107, 139, 0.3);
}

.user-name {
  font-weight: 500;
  color: #333;
}

.logout-btn {
  color: var(--primary-pink);
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 107, 139, 0.1);
}

.login-btn {
  padding: 10px 20px;
  border-radius: 12px;
}

.login-dialog {
  text-align: center;
  padding: 20px 0;
}

.login-tip {
  color: #666;
  margin-bottom: 30px;
  font-size: 1rem;
}

.oauth-btn {
  width: 100%;
  padding: 15px;
  border-radius: 12px;
  font-size: 1.1rem;
}

.oauth-btn .el-icon {
  margin-right: 10px;
  font-size: 1.2rem;
}

.login-terms {
  margin-top: 20px;
  color: #999;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .dock-container {
    padding: 0 10px;
  }
  
  .logo-text {
    display: none;
  }
  
  .nav-links {
    gap: 10px;
  }
  
  .nav-link span {
    display: none;
  }
  
  .user-name {
    display: none;
  }
}
</style>