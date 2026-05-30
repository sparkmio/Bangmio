<template>
  <div v-if="loading" class="py-20 text-center">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>

  <div v-else-if="error" class="py-20 text-center">
    <p class="text-lg mb-2 text-error">{{ error }}</p>
    <button @click="fetchDetail" class="btn btn-ghost btn-sm text-primary">重试</button>
  </div>

  <div v-else class="max-w-5xl mx-auto">
    <div class="flex flex-col md:flex-row gap-8 mb-8">
      <div class="flex-shrink-0 w-48 md:w-56 mx-auto md:mx-0">
        <img v-if="anime.images?.large || anime.images?.common" :src="anime.images.large || anime.images.common" :alt="anime.name_cn || anime.name" class="w-full rounded-xl shadow-lg" />
      </div>

      <div class="flex-1 min-w-0">
        <h1 class="text-2xl md:text-3xl font-bold mb-1 text-base-content">{{ anime.name_cn || anime.name }}</h1>
        <p v-if="anime.name_cn && anime.name" class="mb-3 text-sm text-base-content/50">{{ anime.name }}</p>

        <div class="flex flex-wrap items-center gap-2 mb-4">
          <span v-if="anime.rating?.score" class="badge badge-lg gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">
            {{ anime.rating.score.toFixed(1) }}
            <span class="text-xs font-normal text-base-content/40">({{ anime.rating.total }}人)</span>
          </span>
          <span v-if="anime.rank" class="badge badge-lg bg-primary/10 text-primary border-primary/20 font-medium">#{{ anime.rank }}</span>
          <span class="badge badge-lg badge-ghost">{{ typeLabel }}</span>
          <span v-if="anime.eps" class="badge badge-lg badge-ghost">{{ anime.eps }}话</span>
        </div>

        <div v-if="auth.isLoggedIn" class="card bg-base-200 border border-base-300 mb-4">
          <div class="card-body p-4">
            <h3 class="card-title text-sm">我的收藏</h3>
            <div class="flex flex-wrap items-center gap-4">
              <CollectionButton :modelValue="collectionStatus" @update:modelValue="updateStatus" @remove="removeCollection" />
              <div class="flex items-center gap-2">
                <span class="text-sm text-base-content/60">评分</span>
                <StarRating v-model="collectionRating" :showValue="true" />
              </div>
            </div>
            <div class="mt-3">
              <textarea v-model="collectionComment" @blur="updateComment" placeholder="写短评..." rows="2" class="textarea textarea-bordered textarea-sm w-full"></textarea>
            </div>
          </div>
        </div>

        <div v-if="anime.summary" class="mb-4">
          <h3 class="text-sm font-medium mb-1 text-base-content/60">简介</h3>
          <p class="text-sm leading-relaxed text-base-content/70">{{ anime.summary }}</p>
        </div>

        <div v-if="anime.tags?.length" class="flex flex-wrap gap-2 mb-4">
          <span v-for="tag in anime.tags" :key="tag.name" class="badge badge-sm badge-ghost">{{ tag.name }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div v-if="anime.rating?.count" data-stats class="card bg-base-100 border border-base-300">
        <div class="card-body p-5">
          <h3 class="card-title text-base">评分分布</h3>
          <div class="space-y-1.5">
            <div v-for="i in 10" :key="i" class="flex items-center gap-2 text-xs">
              <span class="w-4 text-right text-base-content/50">{{ i }}</span>
              <div class="flex-1 h-3 rounded-full overflow-hidden bg-base-200">
                <div class="h-full rounded-full" :style="{ width: barWidth(i) + '%', background: i >= 8 ? 'var(--p)' : i >= 5 ? 'var(--wa)' : 'var(--bc)' }"></div>
              </div>
              <span class="w-8 text-right text-base-content/50">{{ anime.rating.count[i] || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="anime.collection" data-stats class="card bg-base-100 border border-base-300">
        <div class="card-body p-5">
          <h3 class="card-title text-base">收藏统计</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="text-center p-3 rounded-lg bg-base-200"><p class="text-xl font-bold text-blue-400">{{ anime.collection.wish||0 }}</p><p class="text-xs text-base-content/50">想看</p></div>
            <div class="text-center p-3 rounded-lg bg-base-200"><p class="text-xl font-bold text-emerald-400">{{ anime.collection.doing||0 }}</p><p class="text-xs text-base-content/50">在看</p></div>
            <div class="text-center p-3 rounded-lg bg-base-200"><p class="text-xl font-bold text-primary">{{ anime.collection.collect||0 }}</p><p class="text-xs text-base-content/50">看过</p></div>
            <div class="text-center p-3 rounded-lg bg-base-200"><p class="text-xl font-bold text-red-400">{{ anime.collection.dropped||0 }}</p><p class="text-xs text-base-content/50">弃番</p></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="anime.infobox?.length" class="card bg-base-100 border border-base-300 mb-8">
      <div class="card-body p-5">
        <h3 class="card-title text-base">制作信息</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div v-for="info in anime.infobox.slice(0,12)" :key="info.key" class="text-sm">
            <span class="font-medium text-base-content/50">{{ info.key }}</span>
            <span class="ml-1 text-base-content/70">{{ infoValue(info.value) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="persons.length" class="mb-8">
      <h2 class="text-lg font-bold mb-4 text-base-content">制作人员</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <router-link :to="`/person/${p.id}`" v-for="p in persons.slice(0,16)" :key="p.id" class="card bg-base-100 border border-base-300 hover:border-primary transition-all hover:brightness-110">
          <div class="card-body p-3 items-center text-center">
            <div class="avatar placeholder">
              <div class="w-10 h-10 rounded-full bg-primary text-primary-content">
                <img v-if="p.images?.medium || p.images?.grid" :src="p.images.medium || p.images.grid" />
                <span v-else class="text-xs">{{ p.name?.[0] }}</span>
              </div>
            </div>
            <p class="text-xs font-medium line-clamp-1 text-base-content">{{ p.name }}</p>
            <p class="text-xs line-clamp-1 text-base-content/50">{{ p.relation || cvtCareer(p.career?.[0]) }}</p>
          </div>
        </router-link>
      </div>
    </div>

    <div v-if="characters.length" class="mb-8">
      <h2 class="text-lg font-bold mb-4 text-base-content">角色</h2>
      <div class="flex gap-4 overflow-x-auto pb-2">
        <router-link v-for="char in characters.slice(0,12)" :key="char.id" :to="`/character/${char.id}`" class="flex-shrink-0 text-center w-20 group">
          <div class="avatar">
            <div class="w-16 h-16 rounded-full ring ring-base-300 group-hover:ring-primary transition-all">
              <img :src="char.images?.grid || char.images?.medium" />
            </div>
          </div>
          <p class="text-xs mt-1 truncate group-hover:underline text-base-content/70">{{ char.name }}</p>
          <p class="text-xs truncate text-base-content/40">{{ char.relation }}</p>
        </router-link>
      </div>
    </div>

    <div v-if="relations.length" class="mb-8">
      <h2 class="text-lg font-bold mb-4 text-base-content">相关条目</h2>
      <div class="anime-grid"><AnimeCard v-for="rel in relations.slice(0,8)" :key="rel.id" :anime="rel" /></div>
    </div>

    <CommentSection type="subject" :id="anime.id" />
    <div class="flex flex-col sm:flex-row gap-3 mt-8">
      <router-link :to="`/anime/${anime.id}/talkbox`" class="btn btn-outline btn-sm flex-1 border-base-300">
        查看吐槽箱 →
      </router-link>
      <router-link :to="`/anime/${anime.id}/topics`" class="btn btn-outline btn-sm flex-1 border-base-300">
        查看讨论版 →
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { animeAPI, collectionAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import CollectionButton from '../components/CollectionButton.vue'
import StarRating from '../components/StarRating.vue'
import AnimeCard from '../components/AnimeCard.vue'
import CommentSection from '../components/CommentSection.vue'

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

  nextTick(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
    tl.from('.max-w-5xl > .flex:first-child img', { opacity: 0, scale: 0.9, duration: 0.5 })
      .from('.max-w-5xl > .flex:first-child .flex-1 > *', { opacity: 0, x: 20, stagger: 0.08, duration: 0.4 }, '-=0.3')
      .from('[data-stats]', { opacity: 0, y: 20, stagger: 0.1, duration: 0.4 }, '-=0.2')
  })
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
