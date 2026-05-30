<template>
  <div>
    <LoadingState :loading="loading" :error="error" @retry="fetchPerson" />

    <div v-if="!loading && !error && person.id" class="max-w-4xl mx-auto">
      <div class="flex flex-col md:flex-row gap-8 mb-8">
        <div class="flex-shrink-0 w-44 md:w-52 mx-auto md:mx-0">
          <img
            v-if="person.images?.large || person.images?.medium"
            :src="person.images.large || person.images.medium"
            :alt="person.name"
            class="w-full rounded-xl shadow-lg"
          />
        </div>

        <div class="flex-1 min-w-0">
          <h1 class="text-2xl md:text-3xl font-bold mb-1 text-base-content">{{ person.name }}</h1>
          <p class="text-sm mb-3 text-base-content/50">
            {{ typeLabel }}
            <span v-if="careerLabels.length"> · {{ careerLabels.join(' / ') }}</span>
            <span v-if="person.gender" class="ml-2"> · {{ person.gender === 'male' ? '♂ 男' : person.gender === 'female' ? '♀ 女' : person.gender }}</span>
            <span v-if="person.blood_type" class="ml-2"> · {{ ['','A','B','AB','O'][person.blood_type] }}型血</span>
          </p>
          <p v-if="person.birth_year" class="text-sm mb-3 text-base-content/50">
            {{ person.birth_year }}{{ person.birth_mon ? '-' + String(person.birth_mon).padStart(2,'0') : '' }}{{ person.birth_day ? '-' + String(person.birth_day).padStart(2,'0') : '' }}
          </p>

          <div v-if="person.summary" class="mb-4">
            <h3 class="text-sm font-medium mb-1 text-base-content/60">简介</h3>
            <p class="text-sm leading-relaxed text-base-content/70">{{ person.summary }}</p>
          </div>

          <div v-if="person.stat" class="flex gap-6 mb-4">
            <div class="text-center">
              <p class="text-xl font-bold text-amber-500">{{ person.stat.comments || 0 }}</p>
              <p class="text-xs text-base-content/50">评论</p>
            </div>
            <div class="text-center">
              <p class="text-xl font-bold text-primary">{{ person.stat.collects || 0 }}</p>
              <p class="text-xs text-base-content/50">收藏</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="person.infobox?.length" class="card bg-base-100 border border-base-300 mb-8">
        <div class="card-body p-5">
          <h3 class="card-title text-base">详细信息</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div v-for="info in person.infobox.slice(0, 18)" :key="info.key" class="text-sm">
              <span class="font-medium text-base-content/50">{{ info.key }}</span>
              <span class="ml-1 text-base-content/70">{{ formatInfoValue(info.value) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="subjects.length" class="mb-8">
        <h2 class="text-lg font-bold mb-4 text-base-content">参与作品</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <router-link v-for="subj in subjects" :key="subj.id" :to="`/anime/${subj.id}`" class="card card-side bg-base-100 border border-base-300 hover:border-primary transition-all">
            <figure class="w-12 shrink-0">
              <img v-if="subj.image" :src="subj.image" class="w-12 h-16 object-cover" />
            </figure>
            <div class="card-body p-3 py-2">
              <p class="text-sm font-medium line-clamp-1 text-base-content">{{ subj.name_cn || subj.name }}</p>
              <p class="text-xs text-base-content/50">{{ subj.staff || '' }}</p>
            </div>
          </router-link>
        </div>
      </div>

      <div class="flex gap-2 mb-8">
        <a :href="`https://bgm.tv/person/${person.id}`" target="_blank" class="btn btn-ghost btn-sm text-base-content/60">
          在 Bangumi 查看完整信息 →
        </a>
      </div>

      <router-link :to="`/person/${person.id}/talkbox`" class="btn btn-outline btn-sm w-full border-base-300">
        查看吐槽箱 →
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { animeAPI } from '../api/endpoints'
import LoadingState from '../components/LoadingState.vue'

const route = useRoute()
const person = ref({})
const subjects = ref([])
const loading = ref(true)
const error = ref('')

const careerLabels = computed(() => (person.value.career || []).map(c => {
  const map = { producer:'制作人', mangaka:'漫画家', artist:'美术', seiyu:'声优', writer:'剧本', illustrator:'插画', actor:'演员' }
  return map[c] || c
}))

const typeLabel = computed(() => ({ 1:'个人', 2:'公司', 3:'组合' })[person.value.type] || '')

function formatInfoValue(val) {
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(v => v.v || v).join(', ')
  return String(val)
}

async function fetchPerson() {
  loading.value = true
  error.value = ''
  const id = route.params.id
  try {
    const [pRes, sRes] = await Promise.all([
      animeAPI.getPersonDetail(id),
      animeAPI.getPersonSubjects(id)
    ])
    person.value = pRes.data?.data || pRes.data || {}
    subjects.value = sRes.data?.data || sRes.data || []
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) fetchPerson()
})

onMounted(fetchPerson)
</script>
