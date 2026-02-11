<template>
  <div class="search-page">
    <header class="header">
      <h1>搜索番剧</h1>
      <el-button type="text" @click="$router.push('/')">
        <el-icon><ArrowLeft /></el-icon> 返回首页
      </el-button>
    </header>
    
    <main class="main">
      <div class="search-container">
        <el-input
          v-model="query"
          placeholder="搜索番剧..."
          size="large"
          @keyup.enter="search"
          clearable
        >
          <template #append>
            <el-button @click="search" type="primary">
              <el-icon><Search /></el-icon> 搜索
            </el-button>
          </template>
        </el-input>
      </div>
      
      <div v-if="loading" class="loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p>加载中...</p>
      </div>
      
      <div v-else-if="results.length > 0" class="results">
        <h2>搜索结果 ({{ results.length }})</h2>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in results" :key="item.id">
            <el-card class="result-card" shadow="hover" @click="goToDetail(item.id)">
              <div class="result-image-container">
                <img :src="item.image || 'https://via.placeholder.com/300x400'" class="result-image" @error="handleImageError" />
                <div class="result-score" v-if="item.score">
                  ⭐ {{ item.score.toFixed(1) }}
                </div>
              </div>
              <div class="result-info">
                <h3>{{ item.name_cn || item.name }}</h3>
                <p class="result-desc">{{ item.desc }}</p>
                <div class="result-tags">
                  <el-tag v-if="item.type" size="small" type="info">{{ item.type }}</el-tag>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
      
      <div v-else-if="searched" class="no-results">
        <el-empty description="未找到相关结果" />
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchAnime } from '../utils/api'

export default {
  name: 'Search',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const query = ref(route.query.q || '')
    const results = ref([])
    const loading = ref(false)
    const searched = ref(false)

    const search = async () => {
      if (!query.value.trim()) return
      
      loading.value = true
      searched.value = true
      
      try {
        const data = await searchAnime(query.value)
        results.value = data.results || []
      } catch (error) {
        console.error('Search failed:', error)
        results.value = []
      } finally {
        loading.value = false
      }
    }

    const goToDetail = (id) => {
      router.push({ name: 'detail', params: { id } })
    }

    const handleImageError = (event) => {
      event.target.src = 'https://via.placeholder.com/300x400?text=封面加载失败'
    }

    onMounted(() => {
      if (query.value) {
        search()
      }
    })

    return {
      query,
      results,
      loading,
      searched,
      search,
      goToDetail,
      handleImageError
    }
  }
}
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--white) 0%, var(--light-pink) 100%);
}

.header {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--glass-border);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  color: #333;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.search-container {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 30px;
  box-shadow: var(--glass-shadow);
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
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

.results h2 {
  margin: 20px 0;
  color: #333;
}

.result-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  overflow: hidden;
}

.result-card:hover {
  transform: translateY(-5px);
}

.result-image-container {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.result-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.result-card:hover .result-image {
  transform: scale(1.05);
}

.result-score {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffd700;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.result-info {
  padding: 12px 0 8px 0;
}

.result-info h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: #333;
  line-height: 1.3;
}

.result-desc {
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  margin-bottom: 8px;
}

.result-tags {
  display: flex;
  gap: 5px;
}

.no-results {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 40px;
  box-shadow: var(--glass-shadow);
}
</style>