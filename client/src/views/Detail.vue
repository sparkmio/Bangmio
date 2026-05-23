<template>
  <div v-if="loading" class="py-20 text-center">
    <div class="w-10 h-10 border-2 rounded-full animate-spin mx-auto" :style="{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }"></div>
  </div>

  <div v-else-if="error" class="py-20 text-center">
    <p class="text-lg mb-2" style="color: var(--danger)">{{ error }}</p>
    <button @click="fetchDetail" class="text-sm hover:underline" style="color: var(--primary)">重试</button>
  </div>

  <div v-else class="max-w-5xl mx-auto">
    <div class="flex flex-col md:flex-row gap-8 mb-8">
      <div class="flex-shrink-0 w-48 md:w-56 mx-auto md:mx-0">
        <img v-if="anime.images?.large || anime.images?.common" :src="anime.images.large || anime.images.common" :alt="anime.name_cn || anime.name" class="w-full rounded-xl" style="box-shadow: var(--shadow-lg)" />
      </div>

      <div class="flex-1 min-w-0">
        <h1 class="text-2xl md:text-3xl font-bold mb-1" style="color: var(--text)">{{ anime.name_cn || anime.name }}</h1>
        <p v-if="anime.name_cn && anime.name" class="mb-3 text-sm" style="color: var(--text-muted)">{{ anime.name }}</p>

        <div class="flex flex-wrap items-center gap-2 mb-4">
          <span v-if="anime.rating?.score" class="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold" :style="{ background: 'var(--accent-bg)', color: 'var(--star)' }">
            {{ anime.rating.score.toFixed(1) }}
            <span class="text-xs font-normal" style="color: var(--text-muted)">({{ anime.rating.total }}人)</span>
          </span>
          <span v-if="anime.rank" class="px-2 py-1 rounded-lg text-sm font-medium" :style="{ background: 'var(--primary-bg)', color: 'var(--primary)' }">#{{ anime.rank }}</span>
          <span class="px-2 py-1 rounded-lg text-sm" :style="{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }">{{ typeLabel }}</span>
          <span v-if="anime.eps" class="px-2 py-1 rounded-lg text-sm" :style="{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }">{{ anime.eps }}话</span>
        </div>

        <div v-if="auth.isLoggedIn" class="p-4 rounded-xl border mb-4" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
          <h3 class="text-sm font-semibold mb-3" style="color: var(--text)">我的收藏</h3>
          <div class="flex flex-wrap items-center gap-4">
            <CollectionButton :modelValue="collectionStatus" @update:modelValue="updateStatus" @remove="removeCollection" />
            <div class="flex items-center gap-2">
              <span class="text-sm" style="color: var(--text-secondary)">评分</span>
              <StarRating v-model="collectionRating" :showValue="true" />
            </div>
          </div>
          <div class="mt-3">
            <textarea v-model="collectionComment" @blur="updateComment" placeholder="写短评..." rows="2" class="input-field resize-none"></textarea>
          </div>
        </div>

        <div v-if="anime.summary" class="mb-4">
          <h3 class="text-sm font-medium mb-1" style="color: var(--text-secondary)">简介</h3>
          <p class="text-sm leading-relaxed" style="color: var(--text-secondary)">{{ anime.summary }}</p>
        </div>

        <div v-if="anime.tags?.length" class="flex flex-wrap gap-2 mb-4">
          <span v-for="tag in anime.tags" :key="tag.name" class="px-2 py-0.5 rounded-full text-xs" :style="{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }">{{ tag.name }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div v-if="anime.rating?.count" class="rounded-xl p-5 border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
        <h3 class="font-bold mb-3" style="color: var(--text)">评分分布</h3>
        <div class="space-y-1.5">
          <div v-for="i in 10" :key="i" class="flex items-center gap-2 text-xs">
            <span class="w-4 text-right" style="color: var(--text-muted)">{{ i }}</span>
            <div class="flex-1 h-3 rounded-full overflow-hidden" style="background: var(--bg-hover)">
              <div class="h-full rounded-full" :style="{ width: barWidth(i) + '%', background: i >= 8 ? 'var(--primary)' : i >= 5 ? 'var(--star)' : 'var(--text-muted)' }"></div>
            </div>
            <span class="w-8 text-right" style="color: var(--text-muted)">{{ anime.rating.count[i] || 0 }}</span>
          </div>
        </div>
      </div>
      <div v-if="anime.collection" class="rounded-xl p-5 border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
        <h3 class="font-bold mb-3" style="color: var(--text)">收藏统计</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-3 rounded-lg" :style="{ background: 'var(--bg-hover)' }"><p class="text-xl font-bold" style="color:#60a5fa">{{ anime.collection.wish||0 }}</p><p class="text-xs" style="color:var(--text-muted)">想看</p></div>
          <div class="text-center p-3 rounded-lg" :style="{ background: 'var(--bg-hover)' }"><p class="text-xl font-bold" style="color:#34d399">{{ anime.collection.doing||0 }}</p><p class="text-xs" style="color:var(--text-muted)">在看</p></div>
          <div class="text-center p-3 rounded-lg" :style="{ background: 'var(--bg-hover)' }"><p class="text-xl font-bold" style="color:var(--primary)">{{ anime.collection.collect||0 }}</p><p class="text-xs" style="color:var(--text-muted)">看过</p></div>
          <div class="text-center p-3 rounded-lg" :style="{ background: 'var(--bg-hover)' }"><p class="text-xl font-bold" style="color:#f87171">{{ anime.collection.dropped||0 }}</p><p class="text-xs" style="color:var(--text-muted)">弃番</p></div>
        </div>
      </div>
    </div>

    <div v-if="anime.infobox?.length" class="rounded-xl p-5 border mb-8" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <h3 class="font-bold mb-3" style="color: var(--text)">制作信息</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div v-for="info in anime.infobox.slice(0,12)" :key="info.key" class="text-sm">
          <span class="font-medium" style="color:var(--text-muted)">{{ info.key }}</span>
          <span class="ml-1" style="color:var(--text-secondary)">{{ infoValue(info.value) }}</span>
        </div>
      </div>
    </div>

    <div v-if="persons.length" class="mb-8">
      <h2 class="text-lg font-bold mb-4" style="color: var(--text)">制作人员</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <router-link :to="`/person/${p.id}`" v-for="p in persons.slice(0,16)" :key="p.id" class="p-3 rounded-xl border transition-all hover:brightness-110 block" :style="{ background:'var(--bg-card)', borderColor:'var(--border)' }">
          <img v-if="p.images?.medium || p.images?.grid" :src="p.images.medium || p.images.grid" class="w-10 h-10 rounded-full object-cover mb-2 mx-auto" />
          <p class="text-xs font-medium text-center line-clamp-1" style="color:var(--text)">{{ p.name }}</p>
          <p class="text-xs text-center line-clamp-1" style="color:var(--text-muted)">{{ p.relation || cvtCareer(p.career?.[0]) }}</p>
        </router-link>
      </div>
    </div>

    <div v-if="characters.length" class="mb-8">
      <h2 class="text-lg font-bold mb-4" style="color: var(--text)">角色</h2>
      <div class="flex gap-4 overflow-x-auto pb-2">
        <router-link v-for="char in characters.slice(0,12)" :key="char.id" :to="`/character/${char.id}`" class="flex-shrink-0 text-center w-20 group">
          <img :src="char.images?.grid || char.images?.medium" class="w-16 h-16 rounded-full object-cover mx-auto border group-hover:ring-2" :style="{ borderColor:'var(--border)' }" />
          <p class="text-xs mt-1 truncate group-hover:underline" style="color:var(--text-secondary)">{{ char.name }}</p>
          <p class="text-xs truncate" style="color:var(--text-muted)">{{ char.relation }}</p>
        </router-link>
      </div>
    </div>

    <div v-if="relations.length" class="mb-8">
      <h2 class="text-lg font-bold mb-4" style="color: var(--text)">相关条目</h2>
      <div class="anime-grid"><AnimeCard v-for="rel in relations.slice(0,8)" :key="rel.id" :anime="rel" /></div>
    </div>

    <CommentSection type="subject" :id="anime.id" />
    <div class="flex flex-col sm:flex-row gap-3 mt-8 p-5 rounded-xl border" :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)' }">
      <router-link :to="`/anime/${anime.id}/talkbox`" class="flex-1 py-3 rounded-lg text-center text-sm font-medium transition-all hover:brightness-110" :style="{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }">
        查看吐槽箱 →
      </router-link>
      <router-link :to="`/anime/${anime.id}/topics`" class="flex-1 py-3 rounded-lg text-center text-sm font-medium transition-all hover:brightness-110" :style="{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }">
        查看讨论版 →
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { animeAPI, collectionAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import CollectionButton from '../components/CollectionButton.vue'
import StarRating from '../components/StarRating.vue'
import AnimeCard from '../components/AnimeCard.vue'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()

const anime = ref({})
const characters = ref([])
const persons = ref([])
const relations = ref([])
const loading = ref(true)
const error = ref('')

const collectionStatus = ref(0)
const collectionRating = ref(0)
const collectionComment = ref('')

const typeLabel = computed(() => ({ 1:'书籍',2:'动画',3:'音乐',4:'游戏',6:'三次元' })[anime.value.type] || '其他')

function barWidth(i) {
  const max = Math.max(...Object.values(anime.value.rating?.count || {}), 1)
  return ((anime.value.rating?.count[i] || 0) / max) * 100
}
function infoValue(val) {
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(v => v.v || v).join(', ')
  return ''
}
function cvtCareer(c) {
  const map = { producer:'制作',mangaka:'漫画家',artist:'美术',seiyu:'声优',writer:'剧本',illustrator:'插画',actor:'演员' }
  return map[c] || c || ''
}

async function fetchDetail() {
  loading.value = true
  error.value = ''
  const id = route.params.id
  try {
    const results = await Promise.allSettled([
      animeAPI.getDetail(id),
      animeAPI.getCharacters(id),
      animeAPI.getPersons(id),
      animeAPI.getRelations(id)
    ])
    const [dRes, cRes, pRes, rRes] = results.map(r => r.status === 'fulfilled' ? r.value : null)
    anime.value = dRes?.data?.data || dRes?.data || {}
    characters.value = (cRes?.data?.data || cRes?.data || []).sort((a, b) => {
      const order = { '主角': 0, '配角': 1, '客串': 2 }
      const ao = order[a.relation] ?? 99
      const bo = order[b.relation] ?? 99
      return ao - bo
    })
    persons.value = pRes?.data?.data || pRes?.data || []
    relations.value = rRes?.data?.data || rRes?.data || []
  } catch { error.value = '加载失败' }
  finally { loading.value = false }

  if (auth.isLoggedIn) loadCollection()
}

async function loadCollection() {
  try {
    const res = await collectionAPI.getOne(route.params.id)
    const col = res.data.data
    if (col) {
      collectionStatus.value = col.status || col.type || 0
      collectionRating.value = col.rating || col.rate || 0
      collectionComment.value = col.comment || ''
    } else {
      collectionStatus.value = 0
      collectionRating.value = 0
      collectionComment.value = ''
    }
  } catch (err) {
    const msg = err.response?.data?.error
    if (msg) toast.error(msg)
  }
}

async function saveCollectionBody(extra = {}) {
  try {
    await collectionAPI.save(route.params.id, {
      status: collectionStatus.value,
      rating: collectionRating.value,
      comment: collectionComment.value,
      ...extra
    })
  } catch (err) {
    const msg = err.response?.data?.error || '保存失败'
    toast.error(msg)
  }
}

async function updateStatus(status) {
  if (!auth.isLoggedIn) return toast.error('请先登录')
  collectionStatus.value = status
  await saveCollectionBody({ status })
  toast.success('状态已更新')
}

async function updateComment() {
  if (!auth.isLoggedIn) return
  await saveCollectionBody({ comment: collectionComment.value })
}

watch(collectionRating, async (val) => {
  if (!auth.isLoggedIn) return
  await saveCollectionBody({ rating: val })
})

async function removeCollection() {
  try {
    await collectionAPI.remove(route.params.id)
    collectionStatus.value = 0; collectionRating.value = 0; collectionComment.value = ''
    toast.success('已移除收藏')
  } catch { toast.error('操作失败') }
}

watch(() => route.params.id, (newId, oldId) => {
  if (newId && newId !== oldId) {
    collectionStatus.value = 0
    collectionRating.value = 0
    collectionComment.value = ''
    fetchDetail()
  }
})

onMounted(fetchDetail)
</script>
