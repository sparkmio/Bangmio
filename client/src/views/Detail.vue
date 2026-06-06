<template>
  <div v-if="loading" class="py-20 text-center">
    <span class="loading loading-spinner loading-lg text-primary"></span>
  </div>

  <div v-else-if="error" class="py-20 text-center">
    <p class="text-lg mb-2 text-error">{{ error }}</p>
    <button @click="fetchDetail" class="btn btn-ghost btn-sm text-primary">重试</button>
  </div>

  <div v-else>
    <!-- Hero -->
    <div class="-mx-4 md:-mx-8 -mt-6 relative overflow-hidden">
      <div class="absolute inset-0 overflow-hidden">
        <img v-if="anime.images?.large || anime.images?.common" :src="anime.images.large || anime.images.common" class="w-full h-full object-cover scale-110 blur-3xl opacity-30" />
        <div class="absolute inset-0 bg-gradient-to-b from-base-100/60 via-base-100/90 to-base-100"></div>
      </div>
      <div class="relative max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <a @click.prevent="$router.back()" class="btn btn-ghost btn-sm text-primary/80 mb-4 cursor-pointer inline-flex items-center gap-1">← 返回</a>
        <div class="flex flex-col md:flex-row gap-8 items-start" ref="heroRef">
          <div class="flex-shrink-0 w-48 md:w-60 mx-auto md:mx-0">
            <img v-if="anime.images?.large || anime.images?.common" :src="anime.images.large || anime.images.common" :alt="anime.name_cn || anime.name" class="w-full rounded-xl shadow-2xl ring-1 ring-white/10" />
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-3xl md:text-4xl font-bold mb-2 text-base-content break-words line-clamp-2">{{ anime.name_cn || anime.name }}</h1>
            <p v-if="anime.name_cn && anime.name" class="text-base text-base-content/50 mb-4">{{ anime.name }}</p>
            <div class="flex flex-wrap items-center gap-2 mb-6">
              <span v-if="anime.rating?.score" class="badge badge-lg gap-1.5 font-bold border-0 bg-amber-500/15 text-amber-400">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {{ anime.rating.score.toFixed(1) }}
                <span class="text-xs font-normal text-base-content/40">({{ anime.rating.total }}人)</span>
              </span>
              <span v-if="anime.rank" class="badge badge-lg font-bold border-0 bg-primary/15 text-primary">#{{ anime.rank }}</span>
              <span class="badge badge-lg badge-ghost">{{ typeLabel }}</span>
              <span v-if="anime.eps" class="badge badge-lg badge-ghost">{{ anime.eps }}话</span>
            </div>
            <div v-if="auth.isLoggedIn" class="bg-base-200 rounded-lg p-5 mb-5">
              <h3 class="text-sm font-semibold mb-3 text-base-content/80">我的收藏</h3>
              <div class="flex flex-wrap items-center gap-4">
                <CollectionButton :modelValue="collectionStatus" @update:modelValue="updateStatus" @remove="removeCollection" />
                <div class="flex items-center gap-2">
                  <span class="text-sm text-base-content/50">评分</span>
                  <StarRating v-model="collectionRating" :showValue="true" />
                </div>
              </div>
              <div class="mt-3">
                <textarea v-model="collectionComment" @blur="updateComment" placeholder="写短评..." rows="2" class="textarea textarea-bordered textarea-sm w-full bg-base-200/50"></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="sticky top-0 z-30 bg-base-100/80 backdrop-blur-md border-b border-base-300/30">
      <div class="max-w-5xl mx-auto px-4 md:px-8 flex gap-1 overflow-x-auto scrollbar-hide">
        <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
          class="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-base-content/60 hover:text-base-content'">
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-5xl mx-auto px-4 md:px-8 py-6">

      <!-- 概览 -->
      <div v-show="activeTab === 'overview'">
        <div v-if="anime.summary" class="mb-6">
          <p class="text-sm leading-relaxed text-base-content/70 break-words">{{ anime.summary }}</p>
        </div>
        <div v-if="anime.tags?.length" class="flex flex-wrap gap-1.5 mb-6">
          <span v-for="tag in anime.tags.slice(0,15)" :key="tag.name" class="badge badge-sm badge-ghost text-xs">{{ tag.name }}</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6" v-if="anime.rating?.count || anime.collection">
          <div v-if="anime.rating?.count" data-stats class="bg-base-200/40 rounded-lg p-5">
            <h3 class="font-semibold mb-4 text-base-content/80 text-sm">评分分布</h3>
            <div class="space-y-2">
              <div v-for="i in 10" :key="i" class="flex items-center gap-2 text-xs">
                <span class="w-4 text-right text-base-content/40 font-mono">{{ i }}</span>
                <div class="flex-1 h-2.5 rounded-full overflow-hidden bg-base-300/50">
                  <div class="h-full rounded-full" :style="{ width: barWidth(i) + '%', background: i >= 8 ? 'var(--p)' : i >= 5 ? 'var(--wa)' : 'var(--bc)' }"></div>
                </div>
                <span class="w-7 text-right text-base-content/40 font-mono">{{ anime.rating.count[i] || 0 }}</span>
              </div>
            </div>
          </div>
          <div v-if="anime.collection" data-stats class="bg-base-200/40 rounded-lg p-5">
            <h3 class="font-semibold mb-4 text-base-content/80 text-sm">收藏统计</h3>
            <div class="grid grid-cols-2 gap-3">
              <div class="text-center p-3 rounded-lg bg-base-300/30"><p class="text-xl font-bold text-blue-400">{{ anime.collection.wish||0 }}</p><p class="text-xs mt-1 text-base-content/40">想看</p></div>
              <div class="text-center p-3 rounded-lg bg-base-300/30"><p class="text-xl font-bold text-emerald-400">{{ anime.collection.doing||0 }}</p><p class="text-xs mt-1 text-base-content/40">在追</p></div>
              <div class="text-center p-3 rounded-lg bg-base-300/30"><p class="text-xl font-bold text-primary">{{ anime.collection.collect||0 }}</p><p class="text-xs mt-1 text-base-content/40">看过</p></div>
              <div class="text-center p-3 rounded-lg bg-base-300/30"><p class="text-xl font-bold text-red-400">{{ anime.collection.dropped||0 }}</p><p class="text-xs mt-1 text-base-content/40">弃番</p></div>
            </div>
          </div>
        </div>

        <!-- Characters -->
        <div v-if="characters.length" class="mb-8">
          <h2 class="text-lg font-semibold mb-4 text-base-content flex items-center gap-2">
            <span class="w-1 h-5 rounded-full bg-secondary"></span>角色
          </h2>
          <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <router-link v-for="char in characters.slice(0,14)" :key="char.id" :to="`/character/${char.id}`" class="flex-shrink-0 text-center w-20 group">
              <div class="avatar">
                <div class="w-16 h-16 rounded-full ring-2 ring-base-300 group-hover:ring-primary transition-all">
                  <img :src="char.images?.grid || char.images?.medium" />
                </div>
              </div>
              <p class="text-xs mt-1.5 truncate text-base-content/60 group-hover:text-base-content">{{ char.name }}</p>
              <p class="text-xs truncate text-base-content/30">{{ char.relation }}</p>
            </router-link>
          </div>
        </div>

        <!-- Staff -->
        <div v-if="persons.length" class="mb-8">
          <h2 class="text-lg font-semibold mb-4 text-base-content flex items-center gap-2">
            <span class="w-1 h-5 rounded-full bg-primary"></span>制作人员
          </h2>
          <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <router-link :to="`/person/${p.id}`" v-for="p in persons.slice(0,20)" :key="p.id" class="flex-shrink-0 bg-base-200/40 rounded-lg p-4 w-28 text-center border border-base-300/50 hover:border-primary transition-colors">
              <div class="avatar placeholder mb-2">
                <div class="w-12 h-12 rounded-full bg-primary/20">
                  <img v-if="p.images?.medium || p.images?.grid" :src="p.images.medium || p.images.grid" class="rounded-full" />
                  <span v-else class="text-lg font-bold text-primary">{{ p.name?.[0] }}</span>
                </div>
              </div>
              <p class="text-xs font-medium line-clamp-1 text-base-content">{{ p.name }}</p>
              <p class="text-xs line-clamp-1 text-base-content/40">{{ p.relation || cvtCareer(p.career?.[0]) }}</p>
            </router-link>
          </div>
        </div>

        <!-- Relations -->
        <div v-if="relations.length" class="mb-8">
          <h2 class="text-lg font-semibold mb-4 text-base-content flex items-center gap-2">
            <span class="w-1 h-5 rounded-full bg-accent"></span>关联条目
          </h2>
          <div class="anime-grid"><AnimeCard v-for="rel in relations.filter(r => r.type !== 3).slice(0,8)" :key="rel.id" :anime="rel" /></div>
        </div>

        <!-- Talkbox preview -->
        <CommentSection type="subject" :id="anime.id" />
      </div>

      <!-- 章节 -->
      <div v-show="activeTab === 'episodes'">
        <div v-if="episodeList.length" class="space-y-2">
          <div v-for="ep in episodeList" :key="ep.id" class="flex items-center gap-4 p-3 rounded-lg bg-base-200/40 hover:bg-base-200/60 transition-colors">
            <span class="w-10 h-8 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{{ String(ep.sort || 0).padStart(2, '0') }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-base-content line-clamp-1">{{ ep.name_cn || ep.name || `第${ep.sort}话` }}</p>
              <p class="text-xs text-base-content/50">{{ ep.airdate || '' }}</p>
            </div>
            <span class="text-xs text-base-content/40 flex-shrink-0">{{ ep.duration || '' }}</span>
          </div>
        </div>
        <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无章节信息</div>
      </div>

      <!-- 角色 -->
      <div v-show="activeTab === 'characters'" v-if="characters.length">
        <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          <router-link v-for="char in characters" :key="char.id" :to="`/character/${char.id}`" class="flex-shrink-0 text-center w-20 group">
            <div class="avatar"><div class="w-16 h-16 rounded-full ring-2 ring-base-300 group-hover:ring-primary transition-all"><img :src="char.images?.grid || char.images?.medium" /></div></div>
            <p class="text-xs mt-1.5 truncate text-base-content/60 group-hover:text-base-content">{{ char.name }}</p>
            <p class="text-xs truncate text-base-content/30">{{ char.relation }}</p>
          </router-link>
        </div>
      </div>
      <div v-show="activeTab === 'characters'" v-else class="py-10 text-center text-base-content/40 text-sm">暂无角色信息</div>

      <!-- 制作人员 -->
      <div v-show="activeTab === 'staff'" v-if="persons.length">
        <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <router-link :to="`/person/${p.id}`" v-for="p in persons.slice(0,20)" :key="p.id" class="flex-shrink-0 bg-base-200/40 rounded-lg p-4 w-28 text-center border border-base-300/50 hover:border-primary transition-colors">
            <div class="avatar placeholder mb-2"><div class="w-12 h-12 rounded-full bg-primary/20"><img v-if="p.images?.medium || p.images?.grid" :src="p.images.medium || p.images.grid" class="rounded-full" /><span v-else class="text-lg font-bold text-primary">{{ p.name?.[0] }}</span></div></div>
            <p class="text-xs font-medium line-clamp-1 text-base-content">{{ p.name }}</p>
            <p class="text-xs line-clamp-1 text-base-content/40">{{ p.relation || cvtCareer(p.career?.[0]) }}</p>
          </router-link>
        </div>
      </div>
      <div v-show="activeTab === 'staff'" v-else class="py-10 text-center text-base-content/40 text-sm">暂无制作人员信息</div>

      <!-- 关联 -->
      <div v-show="activeTab === 'relations'" v-if="relations.filter(r => r.type !== 3).length">
        <div class="anime-grid"><AnimeCard v-for="rel in relations.filter(r => r.type !== 3)" :key="rel.id" :anime="rel" /></div>
      </div>
      <div v-show="activeTab === 'relations'" v-else class="py-10 text-center text-base-content/40 text-sm">暂无关联条目</div>

      <!-- 吐槽 -->
      <div v-show="activeTab === 'talkbox'">
        <CommentSection type="subject" :id="anime.id" />
        <a :href="`https://bangumi.one/subject/${anime.id}`" target="_blank" class="btn btn-sm btn-outline mt-4 w-full">在 Bangumi 发表评论 →</a>
      </div>

      <!-- 讨论版 -->
      <div v-show="activeTab === 'topics'" class="text-center py-10">
        <router-link :to="`/anime/${anime.id}/topics`" class="btn btn-sm btn-outline">查看讨论版</router-link>
        <a :href="`https://bangumi.one/subject/${anime.id}/board`" target="_blank" class="btn btn-sm btn-ghost mt-3">在 Bangumi 发表讨论 →</a>
      </div>

      <!-- wiki -->
      <div v-show="activeTab === 'wiki'" v-if="anime.infobox?.length">
        <div class="bg-base-200/40 rounded-lg p-5">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div v-for="info in anime.infobox" :key="info.key" class="text-sm">
              <span class="font-medium text-base-content/50">{{ info.key }}</span>
              <span class="ml-1 text-base-content/70">{{ infoValue(info.value) }}</span>
            </div>
          </div>
        </div>
        <a :href="`https://bangumi.one/subject/${anime.id}`" target="_blank" class="btn btn-sm btn-ghost mt-4 w-full">在 Bangumi 查看完整 Wiki →</a>
      </div>
      <div v-show="activeTab === 'wiki'" v-else class="py-10 text-center text-base-content/40 text-sm">暂无制作信息</div>

      <!-- 豆瓣 -->
      <div v-show="activeTab === 'douban'">
        <div v-if="doubanData" class="bg-base-200/40 rounded-lg p-5">
          <div class="flex items-start gap-6">
            <div class="text-center flex-shrink-0">
              <p class="text-4xl font-black text-amber-500">{{ doubanData.rate }}</p>
              <div class="flex items-center gap-1 mt-1">
                <template v-for="i in 5" :key="i">
                  <svg class="w-4 h-4" :class="i <= Math.round(doubanData.star / 2) ? 'text-amber-400' : 'text-base-300'" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                </template>
              </div>
              <p class="text-xs text-base-content/50 mt-1">豆瓣评分</p>
            </div>
            <div v-if="doubanData.short_comment" class="flex-1 min-w-0">
              <p class="text-sm text-base-content/70 italic">"{{ doubanData.short_comment.content }}"</p>
              <p class="text-xs text-base-content/40 mt-2">— {{ doubanData.short_comment.author }}</p>
            </div>
          </div>
          <a :href="doubanData.url" target="_blank" class="btn btn-sm btn-ghost mt-4 w-full">在豆瓣查看详情 →</a>
        </div>
        <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无豆瓣评分信息</div>
      </div>

      <!-- 音乐 -->
      <div v-show="activeTab === 'music'">
        <div v-if="musicItems.length" class="space-y-4">
          <div v-for="(group, relation) in musicGroups" :key="relation">
            <h3 class="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-3">{{ relation }}</h3>
            <div class="space-y-2">
              <div v-for="item in group" :key="item.id" class="flex items-center gap-4 p-3 rounded-lg bg-base-200/40">
                <div class="avatar shrink-0">
                  <div class="w-12 h-12 rounded-lg">
                    <img v-if="item.images?.common" :src="item.images.common" />
                    <div v-else class="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">♪</div>
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-base-content line-clamp-1">{{ item.name_cn || item.name }}</p>
                  <p class="text-xs text-base-content/50">{{ item.relation || '相关音乐' }}</p>
                </div>
                <a :href="`https://music.163.com/#/search/m/?s=${encodeURIComponent(item.name)}`" target="_blank" class="btn btn-ghost btn-xs text-xs">网易云</a>
                <a :href="`https://search.bilibili.com/all?keyword=${encodeURIComponent(item.name)}`" target="_blank" class="btn btn-ghost btn-xs text-xs">B站</a>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无相关音乐</div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { animeAPI, collectionAPI, doubanAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import CollectionButton from '../components/CollectionButton.vue'
import StarRating from '../components/StarRating.vue'
import AnimeCard from '../components/AnimeCard.vue'
import CommentSection from '../components/CommentSection.vue'

const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()

const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'episodes', label: '章节' },
  { key: 'characters', label: '角色' },
  { key: 'staff', label: '制作人员' },
  { key: 'relations', label: '关联' },
  { key: 'talkbox', label: '吐槽' },
  { key: 'topics', label: '讨论版' },
  { key: 'wiki', label: 'wiki' },
  { key: 'douban', label: '豆瓣' },
  { key: 'music', label: '音乐' },
]

const activeTab = ref('overview')
const anime = ref({})
const characters = ref([])
const persons = ref([])
const relations = ref([])
const episodeList = ref([])
const doubanData = ref(null)
const loading = ref(true)
const error = ref('')
const collectionStatus = ref(0)
const collectionRating = ref(0)
const collectionComment = ref('')
const heroRef = ref(null)

const typeLabel = computed(() => ({ 1:'书籍',2:'动画',3:'音乐',4:'游戏',6:'三次元' })[anime.value.type] || '其他')
const musicItems = computed(() => relations.value.filter(r => r.type === 3))
const musicGroups = computed(() => {
  const groups = {}
  const relMap = { 1: '片头曲', 2: '片尾曲', 3: '插入曲' }
  for (const m of musicItems.value) {
    const rel = relMap[m.relation_type] || m.relation || '其他'
    if (!groups[rel]) groups[rel] = []
    groups[rel].push(m)
  }
  return groups
})

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

async function fetchEpisodes(id) {
  try {
    const res = await animeAPI.getEpisodes(id)
    episodeList.value = res.data?.data || res.data || []
  } catch { episodeList.value = [] }
}

async function fetchDouban() {
  try {
    const id = route.params.id
    const res = await doubanAPI.getRating(id)
    doubanData.value = res.data?.data || null
  } catch { doubanData.value = null }
}

async function fetchDetail() {
  loading.value = true; error.value = ''
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
      return (order[a.relation] ?? 99) - (order[b.relation] ?? 99)
    })
    persons.value = pRes?.data?.data || pRes?.data || []
    relations.value = rRes?.data?.data || rRes?.data || []
    fetchEpisodes(id)
    fetchDouban()
  } catch { error.value = '加载失败' }
  finally { loading.value = false }

  if (auth.isLoggedIn) loadCollection()

  nextTick(() => {
    if (heroRef.value) {
      gsap.from(heroRef.value.children, { opacity: 0, y: 30, stagger: 0.1, duration: 0.6, ease: 'power3.out' })
    }
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
      collectionStatus.value = 0; collectionRating.value = 0; collectionComment.value = ''
    }
  } catch (err) {
    const msg = err.response?.data?.error
    if (msg) toast.error(msg)
  }
}

async function saveCollectionBody(extra = {}) {
  try {
    await collectionAPI.save(route.params.id, { status: collectionStatus.value, rating: collectionRating.value, comment: collectionComment.value, ...extra })
    return true
  } catch (err) {
    const msg = err.response?.data?.error || '保存失败'
    toast.error(msg)
    return false
  }
}

async function updateStatus(status) {
  if (!auth.isLoggedIn) return toast.error('请先登录')
  collectionStatus.value = status
  const ok = await saveCollectionBody({ status })
  if (ok) toast.success('状态已更新')
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
    collectionStatus.value = 0; collectionRating.value = 0; collectionComment.value = ''
    activeTab.value = 'overview'
    fetchDetail()
  }
})

onMounted(fetchDetail)
</script>
