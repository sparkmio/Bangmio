<template>
  <div>
    <div v-if="musicItems.length" class="space-y-6">
      <div v-for="(group, relation) in musicGroups" :key="relation">
        <h3 class="text-sm font-semibold text-base-content/60 uppercase tracking-wider mb-3">
          {{ relation }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MusicCard
            v-for="item in group"
            :key="item.id"
            :name="item.name"
            :name-cn="item.name_cn"
            :relation="item.relation"
            :image="item.images?.common"
          />
        </div>
      </div>
    </div>
    <div v-else class="py-10 text-center">
      <p class="text-base-content/40 text-sm mb-4">暂无相关音乐</p>
      <div class="flex flex-wrap justify-center gap-2">
        <a
          :href="`https://music.163.com/#/search/m/?s=${encodeURIComponent(searchName)}`"
          target="_blank"
          class="btn btn-sm btn-ghost"
          >网易云搜索</a
        >
        <a
          :href="`https://search.bilibili.com/all?keyword=${encodeURIComponent(searchName)}`"
          target="_blank"
          class="btn btn-sm btn-ghost"
          >B站搜索</a
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MusicCard from '../MusicCard.vue'

const props = defineProps({
  relations: { type: Array, default: () => [] },
  searchName: { type: String, default: '' }
})

const musicItems = computed(() => props.relations.filter(r => r.type === 3))
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
</script>
