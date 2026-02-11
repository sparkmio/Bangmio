<template>
  <div class="favorites-page">
    <header class="favorites-header">
      <h1>我的收藏</h1>
      <p>这里收藏了你喜欢的番剧</p>
    </header>
    
    <main class="favorites-main">
      <div v-if="!user" class="not-logged-in">
        <el-empty description="请先登录查看收藏" />
        <el-button type="primary" @click="$router.push('/')" class="login-btn">
          去登录
        </el-button>
      </div>
      
      <div v-else-if="loading" class="loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p>加载收藏中...</p>
      </div>
      
      <div v-else-if="favorites.length === 0" class="empty-favorites">
        <el-empty description="暂无收藏的番剧" />
        <el-button type="primary" @click="$router.push('/search')" class="explore-btn">
          去发现番剧
        </el-button>
      </div>
      
      <div v-else class="favorites-list">
        <h2>已收藏 {{ favorites.length }} 部番剧</h2>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in favorites" :key="item.id">
            <el-card class="favorite-card glass-card" shadow="hover">
              <img :src="item.image" class="favorite-image" @error="handleImageError" />
              <div class="favorite-info">
                <h3>{{ item.name_cn || item.name }}</h3>
                <p class="favorite-desc">{{ item.desc }}</p>
                <div class="favorite-actions">
                  <el-button type="text" @click="goToDetail(item.id)">
                    <el-icon><View /></el-icon>
                    查看详情
                  </el-button>
                  <el-button type="text" @click="removeFavorite(item.id)" class="remove-btn">
                    <el-icon><Delete /></el-icon>
                    移除
                  </el-button>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserInfo } from '../utils/auth'
import { getFavorites, removeFavorite as removeFavoriteLocal } from '../utils/favorites'

export default {
  name: 'Favorites',
  setup() {
    const router = useRouter()
    const user = ref(null)
    const favorites = ref([])
    const loading = ref(false)

    const checkAuth = async () => {
      try {
        user.value = await getUserInfo()
      } catch (error) {
        user.value = null
      }
    }

    const loadFavorites = async () => {
      if (!user.value) return
      
      loading.value = true
      try {
        // 从本地存储获取收藏
        favorites.value = getFavorites()
      } catch (error) {
        ElMessage.error('加载收藏失败')
        favorites.value = []
      } finally {
        loading.value = false
      }
    }

    const goToDetail = (id) => {
      router.push({ name: 'detail', params: { id } })
    }

    const removeFavorite = async (id) => {
      try {
        const success = removeFavoriteLocal(id)
        if (success) {
          favorites.value = favorites.value.filter(item => item.id !== id)
        }
      } catch (error) {
        ElMessage.error('移除失败')
      }
    }

    const handleImageError = (event) => {
      event.target.src = 'https://via.placeholder.com/300x400?text=封面加载失败'
    }

    onMounted(async () => {
      await checkAuth()
      await loadFavorites()
    })

    return {
      user,
      favorites,
      loading,
      goToDetail,
      removeFavorite,
      handleImageError
    }
  }
}
</script>

<style scoped>
.favorites-page {
  min-height: calc(100vh - 80px);
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.favorites-header {
  text-align: center;
  margin-bottom: 40px;
}

.favorites-header h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, var(--primary-pink), var(--secondary-pink));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
}

.favorites-header p {
  color: #666;
  font-size: 1.1rem;
}

.not-logged-in,
.loading,
.empty-favorites {
  text-align: center;
  padding: 60px 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  border: 1px solid var(--glass-border);
}

.login-btn,
.explore-btn {
  margin-top: 20px;
  padding: 12px 30px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-pink), var(--secondary-pink));
  border: none;
}

.loading-icon {
  font-size: 40px;
  color: var(--primary-pink);
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.favorites-list h2 {
  color: #333;
  margin-bottom: 30px;
  font-size: 1.5rem;
}

.favorite-card {
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.favorite-card:hover {
  transform: translateY(-5px);
}

.favorite-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 12px 12px 0 0;
}

.favorite-info {
  padding: 15px;
}

.favorite-info h3 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  color: #333;
}

.favorite-desc {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 15px;
}

.favorite-actions {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid rgba(255, 107, 139, 0.1);
  padding-top: 15px;
}

.remove-btn {
  color: #f56c6c;
}

.remove-btn:hover {
  color: #f78989;
  background: rgba(247, 137, 137, 0.1);
}

@media (max-width: 768px) {
  .favorites-page {
    padding: 20px 10px;
  }
  
  .favorites-header h1 {
    font-size: 2rem;
  }
}
</style>