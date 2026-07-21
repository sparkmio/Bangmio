<template>
  <div>
    <LoadingState :loading="loading" :error="error" @retry="fetchCharacter" />

    <div v-if="!loading && !error && character.id" class="max-w-4xl mx-auto">
      <a
        class="btn btn-ghost btn-sm text-primary mb-6 cursor-pointer inline-flex items-center gap-1"
        @click.prevent="$router.back()"
        >← 返回</a
      >
      <div class="flex flex-col md:flex-row gap-8 mb-8">
        <div class="flex-shrink-0 w-44 md:w-52 mx-auto md:mx-0">
          <img
            v-if="character.images?.large || character.images?.medium"
            :src="character.images.large || character.images.medium"
            :alt="character.name"
            class="w-full rounded-xl shadow-lg"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div class="flex-1 min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold mb-1 text-base-content">
            {{ character.name }}
          </h1>
          <p
            v-if="character.gender || character.birth_year || character.type"
            class="text-sm mb-3 text-base-content/50"
          >
            {{ chrTypeLabel }}
            <span v-if="character.gender">
              ·
              {{
                character.gender === 'male'
                  ? '♂ 男'
                  : character.gender === 'female'
                    ? '♀ 女'
                    : character.gender
              }}</span
            >
            <span v-if="character.blood_type">
              · {{ ['', 'A', 'B', 'AB', 'O'][character.blood_type] }}型血</span
            >
            <span v-if="character.birth_year">
              · 生日 {{ character.birth_year
              }}{{ character.birth_mon ? '-' + String(character.birth_mon).padStart(2, '0') : ''
              }}{{
                character.birth_day ? '-' + String(character.birth_day).padStart(2, '0') : ''
              }}</span
            >
          </p>

          <div v-if="character.summary" class="mb-4">
            <h3 class="text-sm font-medium mb-1 text-base-content/60">简介</h3>
            <p class="text-sm leading-relaxed text-base-content/70">
              {{ character.summary }}
            </p>
          </div>

          <div v-if="character.stat" class="flex gap-6 mb-4">
            <div class="text-center">
              <p class="text-xl font-bold text-amber-500">
                {{ character.stat.comments || 0 }}
              </p>
              <p class="text-xs text-base-content/50">评论</p>
            </div>
            <div class="text-center">
              <p class="text-xl font-bold text-primary">
                {{ character.stat.collects || 0 }}
              </p>
              <p class="text-xs text-base-content/50">收藏</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="character.infobox?.length" class="card bg-base-100 border border-base-300 mb-8">
        <div class="card-body p-5">
          <h3 class="card-title text-base">详细信息</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div v-for="info in character.infobox.slice(0, 18)" :key="info.key" class="text-sm">
              <span class="font-medium text-base-content/50">{{ info.key }}</span>
              <span class="ml-1 text-base-content/70">{{ formatInfoValue(info.value) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="chrPersons.length" class="mb-8">
        <h2 class="text-lg font-bold mb-4 text-base-content">声优 / 关联人物</h2>
        <div class="flex flex-wrap gap-4">
          <div
            v-for="cp in chrPersons"
            :key="cp.id"
            class="flex items-center gap-3 p-3 rounded-xl bg-base-100 border border-base-300 hover:border-primary transition-all"
          >
            <div class="avatar placeholder">
              <div class="w-10 h-10 rounded-full bg-primary text-primary-content">
                <img
                  v-if="cp.images?.medium || cp.images?.grid"
                  :src="cp.images.medium || cp.images.grid"
                  :alt="cp.name"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else class="text-xs">{{ cp.name?.[0] }}</span>
              </div>
            </div>
            <div>
              <p class="text-sm font-medium text-base-content">
                {{ cp.name }}
              </p>
              <p class="text-xs text-base-content/50">
                {{ cp.staff || cp.subject_name_cn || cp.subject_name }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="chrSubjects.length" class="mb-8">
        <h2 class="text-lg font-bold mb-4 text-base-content">参与作品</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <router-link
            v-for="subj in chrSubjects"
            :key="subj.id"
            :to="`/anime/${subj.id}`"
            class="card card-side bg-base-100 border border-base-300 hover:border-primary transition-all"
          >
            <figure class="w-12 shrink-0">
              <img
                v-if="subj.image"
                :src="subj.image"
                :alt="subj.name_cn || subj.name"
                loading="lazy"
                decoding="async"
                class="w-12 h-16 object-cover"
              />
            </figure>
            <div class="card-body p-3 py-2">
              <p class="text-sm font-medium line-clamp-1 text-base-content">
                {{ subj.name_cn || subj.name }}
              </p>
              <p class="text-xs text-base-content/50">
                {{ subj.staff || typeLabel(subj.type) }}
              </p>
            </div>
          </router-link>
        </div>
      </div>

      <div class="flex gap-2 mb-8">
        <a
          :href="`https://bgm.tv/character/${character.id}`"
          target="_blank"
          class="btn btn-ghost btn-sm text-base-content/60"
        >
          在 Bangumi 查看完整信息 →
        </a>
      </div>

      <CommentSection :id="character.id" type="character" />
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

const chrTypeLabel = computed(
  () => ({ 1: '角色', 2: '机体', 3: '舰船', 4: '组织' })[character.value.type] || ''
)

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

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) fetchCharacter()
  }
)

onMounted(fetchCharacter)
</script>
