<template>
  <div class="detail-page">
    <header class="header">
      <el-button type="text" @click="$router.go(-1)">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h1>番剧详情</h1>
    </header>
    
    <main class="main" v-if="anime">
      <div class="anime-header">
        <img :src="anime.image" class="anime-poster" @error="handleImageError" />
        <div class="anime-info">
          <h2>{{ anime.name }}</h2>
          <p class="anime-desc">{{ anime.description }}</p>
          
          <div class="anime-meta">
            <div class="meta-item">
              <span class="meta-label">类型:</span>
              <el-tag>{{ anime.type }}</el-tag>
            </div>
            <div class="meta-item">
              <span class="meta-label">集数:</span>
              <span>{{ anime.total_episodes }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">状态:</span>
              <el-tag :type="statusType">{{ anime.status }}</el-tag>
            </div>
            <div class="meta-item">
              <span class="meta-label">评分:</span>
              <span class="score-text">{{ anime.rating ? anime.rating.toFixed(1) + '分' : '暂无评分' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">收藏:</span>
              <el-button 
                :type="isFavorited ? 'warning' : 'primary'" 
                :icon="isFavorited ? 'StarFilled' : 'Star'" 
                @click="toggleFavorite"
                size="small"
                :disabled="!user"
              >
                {{ isFavorited ? '已收藏' : '收藏' }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="anime-content">
        <el-tabs v-model="activeTab">
           <el-tab-pane label="概述" name="overview">
            <div v-html="anime.overview"></div>
          </el-tab-pane>
           <el-tab-pane label="角色" name="characters">
            <el-row :gutter="20">
              <el-col :span="8" v-for="char in anime.characters" :key="char.id">
                <el-card class="character-card">
                  <img :src="char.image" class="character-image" />
                  <div class="character-info">
                    <h4>{{ char.name }}</h4>
                    <p>{{ char.role }}</p>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </el-tab-pane>
           <el-tab-pane label="剧集" name="episodes">
            <template v-if="anime.episodes && anime.episodes.length > 0">
              <el-collapse v-model="activeEpisode">
                <el-collapse-item v-for="episode in anime.episodes" :key="episode.id" :title="episode.title" :name="episode.id">
                  <p>{{ episode.description }}</p>
                  <el-tag size="small">{{ episode.type }}</el-tag>
                </el-collapse-item>
              </el-collapse>
            </template>
            <template v-else>
              <div class="empty-episodes">
                <el-empty description="暂无剧集信息" />
              </div>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
    </main>
    
    <div v-else-if="loading" class="loading">
      <el-icon class="loading-icon"><Loading /></el-icon>
       <p>加载详情中...</p>
    </div>
    
    <div v-else class="not-found">
       <el-empty description="番剧未找到" />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getAnimeDetail } from '../utils/api'
import { getUserInfo } from '../utils/auth'
import { addFavorite, removeFavorite, isFavorite } from '../utils/favorites'

export default {
  name: 'Detail',
  props: ['id'],
  setup(props) {
    const route = useRoute()
    const anime = ref(null)
    const loading = ref(true)
    const activeTab = ref('overview')
    const activeEpisode = ref([])
    
    const animeId = props.id || route.params.id
    const user = ref(null)
    const isFavorited = ref(false)
    
    const statusType = computed(() => {
      if (!anime.value) return ''
      switch(anime.value.status) {
        case 'Finished': return 'success'
        case 'Airing': return 'warning'
        case 'Not yet aired': return 'info'
        default: return ''
      }
    })
    
    const fetchAnimeDetail = async () => {
      loading.value = true
      try {
        const data = await getAnimeDetail(animeId)
        anime.value = data
      } catch (error) {
        console.error('Failed to fetch anime details:', error)
        anime.value = null
      } finally {
        loading.value = false
      }
    }
    
    const handleImageError = (event) => {
      event.target.src = 'https://via.placeholder.com/300x400?text=封面加载失败'
    }

    const checkUser = async () => {
      try {
        user.value = await getUserInfo()
      } catch (error) {
        user.value = null
      }
    }

    const toggleFavorite = async () => {
      if (!user.value) {
        ElMessage.warning('请先登录后再收藏')
        return
      }
      
      if (!anime.value) return
      
      try {
        if (isFavorited.value) {
          const success = removeFavorite(animeId)
          if (success) {
            isFavorited.value = false
          }
        } else {
          const success = addFavorite(anime.value)
          if (success) {
            isFavorited.value = true
          }
        }
      } catch (error) {
        ElMessage.error('操作失败')
      }
    }

    // 检查收藏状态
    const checkFavoriteStatus = () => {
      if (anime.value && user.value) {
        isFavorited.value = isFavorite(animeId)
      }
    }

    onMounted(async () => {
      await checkUser()
      await fetchAnimeDetail()
    })

    // 当动漫数据加载完成时检查收藏状态
    watch(() => anime.value, () => {
      checkFavoriteStatus()
    })
    
    return {
      anime,
      loading,
      activeTab,
      activeEpisode,
      statusType,
      user,
      isFavorited,
      toggleFavorite,
      handleImageError
    }
  }
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--white) 0%, var(--light-pink) 100%);
}

.header {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--glass-border);
  padding: 20px;
  display: flex;
  align-items: center;
}

.header h1 {
  margin: 0 0 0 20px;
  color: #333;
}

.main {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
}

.anime-header {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
}

.anime-poster {
  width: 300px;
  height: 400px;
  object-fit: cover;
  border-radius: 10px;
}

.anime-info {
  flex: 1;
}

.anime-info h2 {
  margin: 0 0 20px 0;
  color: #333;
}

.anime-desc {
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

.anime-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-label {
  font-weight: bold;
  color: #333;
  min-width: 80px;
}

.anime-content {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 30px;
  box-shadow: var(--glass-shadow);
}

.character-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  overflow: hidden;
}

.character-card:hover {
  transform: translateY(-5px);
}

.character-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.character-info {
  padding: 10px 0;
  text-align: center;
}

.character-info h4 {
  margin: 0 0 5px 0;
}

.character-info p {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.loading {
  text-align: center;
  padding: 100px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
  margin: 20px;
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

.not-found {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 100px;
  box-shadow: var(--glass-shadow);
  margin: 20px;
}

.score-text {
  font-size: 1.1rem;
  font-weight: bold;
  color: #f56c6c;
}

.empty-episodes {
  padding: 40px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .anime-header {
    flex-direction: column;
  }
  
  .anime-poster {
    width: 100%;
    height: auto;
  }
}
</style>