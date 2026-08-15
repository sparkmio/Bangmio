<template>
  <div v-if="loading" class="py-20 text-center">
    <span class="loading loading-spinner loading-lg text-primary" />
  </div>

  <div v-else-if="error" class="py-20 text-center">
    <p class="text-lg mb-2 text-error">
      {{ error }}
    </p>
    <button class="btn btn-ghost btn-sm text-primary" @click="fetchDetail">重试</button>
  </div>

  <div v-else>
    <!-- Hero -->
    <div class="-mx-4 md:-mx-8 -mt-6 relative overflow-hidden">
      <div class="absolute inset-0 overflow-hidden">
        <img
          v-if="anime.images?.large || anime.images?.common"
          v-image-placeholder
          :src="anime.images.large || anime.images.common"
          alt=""
          loading="lazy"
          decoding="async"
          class="w-full h-full object-cover scale-110 blur-3xl opacity-30"
        />
        <div
          class="absolute inset-0 bg-gradient-to-b from-base-100/60 via-base-100/90 to-base-100"
        />
      </div>
      <div class="relative max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16">
        <a
          class="btn btn-ghost btn-sm text-primary/80 mb-4 cursor-pointer inline-flex items-center gap-1"
          @click.prevent="$router.back()"
          >← 返回</a
        >
        <div
          ref="heroRef"
          class="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start"
        >
          <div class="flex-shrink-0 w-40 sm:w-48 md:w-60 mx-auto md:mx-0">
            <img
              v-if="anime.images?.large || anime.images?.common"
              v-image-placeholder
              :src="anime.images.large || anime.images.common"
              :alt="anime.name_cn || anime.name"
              loading="lazy"
              decoding="async"
              class="w-full rounded-2xl shadow-2xl ring-1 ring-white/10"
            />
          </div>
          <div class="flex-1 min-w-0 text-center md:text-left">
            <h1
              class="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-base-content break-words line-clamp-2"
            >
              {{ anime.name_cn || anime.name }}
            </h1>
            <p v-if="anime.name_cn && anime.name" class="text-base text-base-content/50 mb-4">
              {{ anime.name }}
            </p>
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
              <span
                v-if="anime.rating?.score"
                class="badge badge-lg gap-1.5 font-bold border-0 bg-amber-500/15 text-amber-400"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                {{ anime.rating.score.toFixed(1) }}
                <span class="text-xs font-normal text-base-content/40"
                  >({{ anime.rating.total }}人)</span
                >
              </span>
              <span
                v-if="anime.rank"
                class="badge badge-lg font-bold border-0 bg-primary/15 text-primary"
                >#{{ anime.rank }}</span
              >
              <span class="badge badge-lg badge-ghost">{{ typeLabel }}</span>
              <span v-if="anime.eps" class="badge badge-lg badge-ghost">{{ anime.eps }}话</span>
            </div>
            <div v-if="auth.isLoggedIn" class="bg-base-200 rounded-lg p-5 mb-5">
              <h3 class="text-sm font-semibold mb-3 text-base-content/80">我的收藏</h3>
              <div class="flex flex-wrap items-center gap-4">
                <CollectionButton
                  :model-value="collectionStatus"
                  @update:model-value="updateStatus"
                  @remove="removeCollection"
                />
                <div class="flex items-center gap-2">
                  <span class="text-sm text-base-content/50">评分</span>
                  <StarRating v-model="collectionRating" :show-value="true" />
                </div>
              </div>
              <div class="mt-3">
                <textarea
                  v-model="collectionComment"
                  placeholder="写短评..."
                  rows="2"
                  class="textarea textarea-bordered textarea-sm w-full bg-base-200/50"
                  @blur="updateComment"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="sticky top-0 z-30 bg-base-100/80 backdrop-blur-md border-b border-base-300/50">
      <div class="max-w-5xl mx-auto px-4 md:px-8 flex gap-1 overflow-x-auto scrollbar-hide">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-4 py-3 min-h-[44px] text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="
            activeTab === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-base-content/60 hover:text-base-content'
          "
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-5xl mx-auto px-4 md:px-8 py-6">
      <!-- 概览 -->
      <div v-show="activeTab === 'overview'">
        <TabOverview
          :anime="anime"
          :characters="characters"
          :persons="persons"
          :relations="relations"
        />
      </div>

      <!-- 章节 -->
      <div v-show="activeTab === 'episodes'">
        <TabEpisodes :episodes="episodeList" />
      </div>

      <!-- 角色 -->
      <div v-show="activeTab === 'characters'">
        <TabCharacters :characters="characters" />
      </div>

      <!-- 制作人员 -->
      <div v-show="activeTab === 'staff'">
        <TabStaff :persons="persons" />
      </div>

      <!-- 关联 -->
      <div v-show="activeTab === 'relations'">
        <TabRelations :relations="relations" />
      </div>

      <!-- 吐槽 -->
      <div v-show="activeTab === 'talkbox'">
        <TabTalkbox :subject-id="anime.id" />
      </div>

      <!-- 讨论版 -->
      <div v-show="activeTab === 'topics'">
        <TabTopics
          :subject-id="anime.id"
          :topics="topics"
          :topic-loading="topicLoading"
          @posted="onTopicPosted"
        />
      </div>

      <!-- wiki -->
      <div v-show="activeTab === 'wiki'">
        <TabWiki :infobox="anime.infobox" :subject-id="anime.id" />
      </div>

      <!-- 评分（Bangumi + 豆瓣 + B站） -->
      <div v-show="activeTab === 'rating'">
        <TabRating
          :bgm-rating="anime.rating"
          :subject-id="anime.id"
          :douban-details="doubanDetails"
          :douban-loading="doubanLoading"
          :bilibili-details="bilibiliDetails"
          :bilibili-loading="bilibiliLoading"
        />
      </div>

      <!-- 豆瓣 -->
      <div v-show="activeTab === 'douban'">
        <TabDouban
          :details="doubanDetails"
          :loading="doubanLoading"
          :summary="doubanSummary"
          :search-name="anime.name_cn || anime.name"
        />
      </div>

      <!-- 音乐 -->
      <div v-show="activeTab === 'music'">
        <TabMusic :relations="relations" :search-name="anime.name_cn || anime.name" />
      </div>

      <!-- 在线观看 -->
      <div v-show="activeTab === 'streaming'">
        <TabStreaming :bilibili-details="bilibiliDetails" :title="anime.name_cn || anime.name" />
      </div>

      <!-- 萌娘百科 -->
      <div v-show="activeTab === 'moegirl'">
        <TabMoegirl
          :subject-id="anime.id"
          :names="moegirlSearchNames"
          :active="activeTab === 'moegirl'"
          :embed-mode="embedMode"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { gsap } from 'gsap'
import { animeAPI, collectionAPI, doubanAPI, bilibiliAPI, commentsAPI } from '../api/endpoints'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { setPageMeta, resetPageMeta } from '../composables/useSeo'
import CollectionButton from '../components/CollectionButton.vue'
import StarRating from '../components/StarRating.vue'
import TabOverview from '../components/detail/TabOverview.vue'
import TabEpisodes from '../components/detail/TabEpisodes.vue'
import TabCharacters from '../components/detail/TabCharacters.vue'
import TabStaff from '../components/detail/TabStaff.vue'
import TabRelations from '../components/detail/TabRelations.vue'
import TabTalkbox from '../components/detail/TabTalkbox.vue'
import TabTopics from '../components/detail/TabTopics.vue'
import TabWiki from '../components/detail/TabWiki.vue'
import TabRating from '../components/detail/TabRating.vue'
import TabDouban from '../components/detail/TabDouban.vue'
import TabMusic from '../components/detail/TabMusic.vue'
import TabStreaming from '../components/detail/TabStreaming.vue'
import TabMoegirl from '../components/detail/TabMoegirl.vue'

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
  { key: 'rating', label: '评分' },
  { key: 'douban', label: '豆瓣' },
  { key: 'music', label: '音乐' },
  { key: 'streaming', label: '在线观看' },
  { key: 'moegirl', label: '萌娘百科' }
]

const activeTab = ref('overview')
const anime = ref({})
const characters = ref([])
const persons = ref([])
const relations = ref([])
const episodeList = ref([])
const doubanDetails = ref(null)
const doubanLoading = ref(false)
const bilibiliDetails = ref(null)
const bilibiliLoading = ref(false)
const topics = ref([])
const topicLoading = ref(false)
const doubanSummary = ref(null)
const loading = ref(true)
const error = ref('')
const collectionStatus = ref(0)
const collectionRating = ref(0)
const collectionComment = ref('')
let collectionLoaded = false
const heroRef = ref(null)

const typeLabel = computed(
  () => ({ 1: '书籍', 2: '动画', 3: '音乐', 4: '游戏', 6: '三次元' })[anime.value.type] || '其他'
)
const embedMode = computed(() => (route.query.embed === 'src' ? 'src' : 'srcdoc'))
// TabMoegirl 的候选搜索名(优先中文名)
const moegirlSearchNames = computed(() => [anime.value.name_cn, anime.value.name].filter(Boolean))

async function fetchDoubanDetails() {
  if (doubanDetails.value || doubanLoading.value) return
  doubanLoading.value = true
  try {
    const id = route.params.id
    const name = anime.value?.name_cn || anime.value?.name
    const res = await doubanAPI.getDetails(id, name)
    doubanDetails.value = res.data?.data || null

    // 拿到豆瓣 id 后并行拉结构化摘要（补充简介 intro），卡片直接展示
    if (doubanDetails.value?.id) {
      try {
        const sRes = await doubanAPI.getSummary(doubanDetails.value.id)
        doubanSummary.value = sRes.data?.data || null
      } catch {
        doubanSummary.value = null
      }
    }
  } catch {
    doubanDetails.value = null
  }
  doubanLoading.value = false
}

async function fetchBilibiliDetails() {
  if (bilibiliDetails.value || bilibiliLoading.value) return
  bilibiliLoading.value = true
  try {
    const id = route.params.id
    const name = anime.value?.name_cn || anime.value?.name
    const res = await bilibiliAPI.getDetails(id, name)
    bilibiliDetails.value = res.data?.data || null
  } catch {
    bilibiliDetails.value = null
  }
  bilibiliLoading.value = false
}

async function fetchRatingDetails() {
  await Promise.all([fetchDoubanDetails(), fetchBilibiliDetails()])
}

/**
 * 空闲时预取评分/豆瓣 Tab 数据（PROJECT_ISSUES 6.2），
 * 减少用户点击 Tab 后的等待；各 fetch 自带防重入，重复调用无害。
 */
function scheduleIdlePrefetch() {
  const idleCb =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback.bind(window)
      : fn => setTimeout(fn, 2000)
  idleCb(
    () => {
      fetchRatingDetails()
      fetchDoubanDetails()
    },
    { timeout: 5000 }
  )
}

async function fetchTopics() {
  if (topicLoading.value) return
  topicLoading.value = true
  try {
    const res = await commentsAPI.getSubjectTopics(route.params.id)
    topics.value = res.data?.data || []
  } catch {
    topics.value = []
  }
  topicLoading.value = false
}

/** TabTopics 发帖成功后的回调：清空列表并重新拉取 */
async function onTopicPosted() {
  topicLoading.value = false
  topics.value = []
  fetchTopics()
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
      animeAPI.getRelations(id),
      animeAPI.getEpisodes(id)
    ])
    const [dRes, cRes, pRes, rRes, eRes] = results.map(r =>
      r.status === 'fulfilled' ? r.value : null
    )
    anime.value = dRes?.data?.data || dRes?.data || {}
    characters.value = (cRes?.data?.data || cRes?.data || []).sort((a, b) => {
      const order = { 主角: 0, 配角: 1, 客串: 2 }
      return (order[a.relation] ?? 99) - (order[b.relation] ?? 99)
    })
    persons.value = pRes?.data?.data || pRes?.data || []
    relations.value = rRes?.data?.data || rRes?.data || []
    episodeList.value = eRes?.data?.data || eRes?.data || []

    // 动态 SEO / 社交分享 meta（PROJECT_ISSUES 4.4）
    const name = anime.value?.name_cn || anime.value?.name || ''
    const summary = (anime.value?.summary || '').slice(0, 200)
    const image = anime.value?.images?.large || anime.value?.images?.common || ''
    if (name) {
      setPageMeta({
        title: name,
        description: summary,
        image,
        url: `${window.location.origin}/anime/${id}`
      })
    }
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }

  if (auth.isLoggedIn) loadCollection()

  // 主数据加载完成后，空闲预取评分/豆瓣数据
  scheduleIdlePrefetch()

  nextTick(() => {
    if (heroRef.value) {
      gsap.from(heroRef.value.children, {
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power3.out'
      })
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
      collectionStatus.value = 0
      collectionRating.value = 0
      collectionComment.value = ''
    }
    collectionLoaded = true
  } catch (err) {
    const msg = err.response?.data?.error
    if (msg) toast.error(msg)
  }
}

async function saveCollectionBody(fields = {}) {
  try {
    // 仅发送实际变更的字段：updateStatus 只发 status、updateRating 只发 rating、
    // updateComment 只发 comment。后端对未提供的 status 会保留当前收藏状态。
    await collectionAPI.save(route.params.id, fields)
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

let ratingDebounceTimer = null
watch(collectionRating, val => {
  if (!auth.isLoggedIn || !collectionLoaded) return
  clearTimeout(ratingDebounceTimer)
  ratingDebounceTimer = setTimeout(async () => {
    await saveCollectionBody({ rating: val })
  }, 500)
})

async function removeCollection() {
  try {
    await collectionAPI.remove(route.params.id)
    collectionStatus.value = 0
    collectionRating.value = 0
    collectionComment.value = ''
    toast.success('已移除收藏')
  } catch {
    toast.error('操作失败')
  }
}

watch(activeTab, tab => {
  if (tab === 'topics' && topics.value.length === 0 && !topicLoading.value) fetchTopics()
  if (
    tab === 'rating' &&
    !doubanDetails.value &&
    !doubanLoading.value &&
    !bilibiliDetails.value &&
    !bilibiliLoading.value
  )
    fetchRatingDetails()
  if (tab === 'douban' && !doubanDetails.value && !doubanLoading.value) fetchDoubanDetails()
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      collectionStatus.value = 0
      collectionRating.value = 0
      collectionComment.value = ''
      topics.value = []
      doubanDetails.value = null
      doubanSummary.value = null
      bilibiliDetails.value = null
      activeTab.value = 'overview'
      fetchDetail()
    }
  }
)

onMounted(fetchDetail)

onBeforeUnmount(resetPageMeta)
</script>
