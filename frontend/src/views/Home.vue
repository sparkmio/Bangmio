<template>
  <div class="home">
    <header class="header">
      <h1>Bangmio - 番剧管理</h1>
      <p>简洁美观的番剧管理网站</p>
    </header>
    
    <main class="main">
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索番剧..."
          size="large"
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button @click="handleSearch">
              <el-icon><Search /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
      
      <div class="content">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in featuredItems" :key="item.id">
            <el-card class="anime-card" shadow="hover" @click="goToDetail(item.id)">
              <div class="anime-image-container">
                <img :src="item.image" class="anime-image" @error="handleImageError" />
                <div class="anime-score" v-if="item.score">
                  ⭐ {{ item.score.toFixed(1) }}
                </div>
              </div>
              <div class="anime-info">
                <h3>{{ item.name_cn || item.name }}</h3>
                <p class="anime-desc">{{ item.desc }}</p>
                <div class="anime-tags">
                  <el-tag size="small" type="info">{{ item.type }}</el-tag>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export default {
  name: 'Home',
  setup() {
    const router = useRouter()
    const searchQuery = ref('')
    const featuredItems = ref([
      {
        id: 275877,
        name: '进击的巨人',
        name_cn: '进击的巨人',
        image: 'https://lain.bgm.tv/pic/cover/l/62/4c/275877_0Q2Q5.jpg',
        desc: '人类被巨人支配的时代，少年艾伦·耶格尔的复仇故事',
        type: '动画',
        score: 8.8
      },
      {
        id: 247001,
        name: '鬼灭之刃',
        name_cn: '鬼灭之刃',
        image: 'https://lain.bgm.tv/pic/cover/l/9d/1c/247001_C2A2o.jpg',
        desc: '家人被鬼杀害，妹妹变成鬼的少年炭治郎的斩鬼之旅',
        type: '动画',
        score: 8.5
      },
      {
        id: 348044,
        name: '咒术回战',
        name_cn: '咒术回战',
        image: 'https://lain.bgm.tv/pic/cover/l/1f/85/348044_O3M6y.jpg',
        desc: '高中生虎杖悠仁吞下特级咒物后卷入咒术世界的故事',
        type: '动画',
        score: 8.3
      },
      {
        id: 344030,
        name: '间谍过家家',
        name_cn: '间谍过家家',
        image: 'https://lain.bgm.tv/pic/cover/l/8c/0d/344030_6a8a3.jpg',
        desc: '间谍、杀手和超能力者组成的伪装家庭喜剧',
        type: '动画',
        score: 8.7
      }
    ])

    const handleSearch = () => {
      if (searchQuery.value.trim()) {
        router.push({ name: 'search', query: { q: searchQuery.value } })
      }
    }

    const goToDetail = (id) => {
      router.push({ name: 'detail', params: { id } })
    }

    const handleImageError = (event) => {
      event.target.src = 'https://via.placeholder.com/300x400?text=封面加载失败'
    }

    return {
      searchQuery,
      featuredItems,
      handleSearch,
      goToDetail,
      handleImageError
    }
  }
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--white) 0%, var(--light-pink) 100%);
}

.header {
  text-align: center;
  padding: 40px 20px;
  color: #333;
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 10px;
}

.header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.search-box {
  margin-bottom: 40px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 30px;
  box-shadow: var(--glass-shadow);
}

.content {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 30px;
  box-shadow: var(--glass-shadow);
}

.anime-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.3s;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  overflow: hidden;
}

.anime-card:hover {
  transform: translateY(-5px);
}

.anime-image-container {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.anime-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.anime-card:hover .anime-image {
  transform: scale(1.05);
}

.anime-score {
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

.anime-info {
  padding: 12px 0 8px 0;
}

.anime-info h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: #333;
  line-height: 1.3;
}

.anime-desc {
  color: #666;
  font-size: 0.85rem;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 8px;
}

.anime-tags {
  display: flex;
  gap: 5px;
}
</style>