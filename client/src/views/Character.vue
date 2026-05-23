<template>
  <div>
    <LoadingState :loading="loading" :error="error" @retry="fetchCharacter" />

    <div v-if="!loading && !error && character.id" class="max-w-4xl mx-auto">
      <div class="flex flex-col md:flex-row gap-8 mb-8">
        <div class="flex-shrink-0 w-44 md:w-52 mx-auto md:mx-0">
          <img
            v-if="character.images?.large || character.images?.medium"
            :src="character.images.large || character.images.medium"
            :alt="character.name"
            class="w-full rounded-xl" style="box-shadow: var(--shadow-lg)"
          />
        </div>

        <div class="flex-1 min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold mb-1" style="color: var(--text)">{{ character.name }}</h1>
          <p v-if="character.gender || character.birth_year || character.type" class="text-sm mb-3" style="color: var(--text-muted)">
            {{ chrTypeLabel }}
            <span v-if="character.gender"> · {{ character.gender === 'male' ? '♂ 男' : character.gender === 'female' ? '♀ 女' : character.gender }}</span>
            <span v-if="character.blood_type"> · {{ ['','A','B','AB','O'][character.blood_type] }}型血</span>
            <span v-if="character.birth_year"> · 生日 {{ character.birth_year }}{{ character.birth_mon ? '-' + String(character.birth_mon).padStart(2,'0') : '' }}{{ character.birth_day ? '-' + String(character.birth_day).padStart(2,'0') : '' }}</span>
          </p>

          <div v-if="character.summary" class="mb-4">
            <h3 class="text-sm font-medium mb-1" style="color: var(--text-secondary)">简介</h3>
            <p class="text-sm leading-relaxed" style="color: var(--text-secondary)">{{ character.summary }}</p>
          </div>

          <div v-if="character.stat" class="flex gap-6 mb-4">
            <div class="text-center">
              <p class="text-xl font-bold" style="color: var(--star)">{{ character.stat.comments || 0 }}</p>
              <p class="text-xs" style="color: var(--text-muted)">评论</p>
            </div>
            <div class="text-center">
              <p class="text-xl font-bold" style="color: var(--primary)">{{ character.stat.collects || 0 }}</p>
              <p class="text-xs" style="color: var(--text-muted)">收藏</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="character.infobox?.length" class="rounded-xl p-5 border mb-8" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
        <h3 class="font-bold mb-3" style="color: var(--text)">详细信息</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div v-for="info in character.infobox.slice(0, 18)" :key="info.key" class="text-sm">
            <span class="font-medium" style="color: var(--text-muted)">{{ info.key }}</span>
            <span class="ml-1" style="color: var(--text-secondary)">{{ formatInfoValue(info.value) }}</span>
          </div>
        </div>
      </div>

      <div v-if="chrPersons.length" class="mb-8">
        <h2 class="text-lg font-bold mb-4" style="color: var(--text)">声优 / 关联人物</h2>
        <div class="flex flex-wrap gap-4">
          <div
            v-for="cp in chrPersons"
            :key="cp.id"
            class="flex items-center gap-3 p-3 rounded-xl border transition-all hover:brightness-110"
            :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }"
          >
            <img v-if="cp.images?.medium || cp.images?.grid" :src="cp.images.medium || cp.images.grid" class="w-10 h-10 rounded-full object-cover" />
            <div>
              <p class="text-sm font-medium" style="color: var(--text)">{{ cp.name }}</p>
              <p class="text-xs" style="color: var(--text-muted)">{{ cp.staff || cp.subject_name_cn || cp.subject_name }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="chrSubjects.length" class="mb-8">
        <h2 class="text-lg font-bold mb-4" style="color: var(--text)">参与作品</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <router-link
            v-for="subj in chrSubjects"
            :key="subj.id"
            :to="`/anime/${subj.id}`"
            class="flex gap-3 p-3 rounded-xl border transition-all hover:brightness-110"
            :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }"
          >
            <img v-if="subj.image" :src="subj.image" class="w-12 h-16 object-cover rounded-lg" />
            <div class="min-w-0">
              <p class="text-sm font-medium line-clamp-1" style="color: var(--text)">{{ subj.name_cn || subj.name }}</p>
              <p class="text-xs" style="color: var(--text-muted)">{{ subj.staff || typeLabel(subj.type) }}</p>
            </div>
          </router-link>
        </div>
      </div>

      <div class="flex gap-2 mb-8">
        <a :href="`https://bgm.tv/character/${character.id}`" target="_blank" class="px-4 py-2 rounded-lg text-sm transition-all hover:brightness-110" :style="{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }">
          在 Bangumi 查看完整信息 →
        </a>
      </div>

      <CommentSection type="character" :id="character.id" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { animeAPI } from '../api/endpoints'
import LoadingState from '../components/LoadingState.vue'
import CommentSection from '../components/CommentSection.vue'

const route = useRoute()
const character = ref({})
const chrPersons = ref([])
const chrSubjects = ref([])
const loading = ref(true)
const error = ref('')

const chrTypeLabel = computed(() => ({ 1:'角色', 2:'机体', 3:'舰船', 4:'组织' })[character.value.type] || '')

function formatInfoValue(val) {
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(v => v.v || v).join(', ')
  return String(val)
}

function typeLabel(t) {
  return { 1: '书籍', 2: '动画', 3: '音乐', 4: '游戏', 6: '三次元' }[t] || '其他'
}

async function fetchCharacter() {
  loading.value = true
  error.value = ''
  const id = route.params.id
  try {
    const [chrRes, perRes, subRes] = await Promise.all([
      animeAPI.getCharacterDetail(id),
      animeAPI.getCharacterPersons(id),
      animeAPI.getCharacterSubjects(id)
    ])
    character.value = chrRes.data?.data || chrRes.data || {}
    chrPersons.value = perRes.data?.data || perRes.data || []
    chrSubjects.value = subRes.data?.data || subRes.data || []
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) fetchCharacter()
})

onMounted(fetchCharacter)
</script>
