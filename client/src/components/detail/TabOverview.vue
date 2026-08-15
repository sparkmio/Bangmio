<template>
  <div>
    <div v-if="anime.summary" class="mb-6">
      <p class="text-sm leading-relaxed text-base-content/70 break-words">
        {{ anime.summary }}
      </p>
    </div>
    <div v-if="anime.tags?.length" class="flex flex-wrap gap-1.5 mb-6">
      <span
        v-for="tag in anime.tags.slice(0, 15)"
        :key="tag.name"
        class="badge badge-sm badge-ghost text-xs"
        >{{ tag.name }}</span
      >
    </div>
    <div
      v-if="anime.rating?.count || anime.collection"
      class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6"
    >
      <div v-if="anime.rating?.count" data-stats class="bg-base-200/40 rounded-xl p-5">
        <div class="flex items-center gap-4 mb-4">
          <div class="text-center">
            <p
              class="text-3xl font-black"
              :class="
                anime.rating.score >= 8
                  ? 'text-success'
                  : anime.rating.score >= 5
                    ? 'text-warning'
                    : 'text-base-content/50'
              "
            >
              {{ anime.rating?.score?.toFixed(1) || '-' }}
            </p>
            <p class="text-xs text-base-content/40 mt-0.5">{{ anime.rating.total }}人评</p>
          </div>
          <div class="flex-1 space-y-1.5">
            <div v-for="i in 10" :key="i" class="flex items-center gap-1.5 text-xs">
              <span class="w-4 text-right text-base-content/40 font-mono">{{ 11 - i }}</span>
              <div class="flex-1 h-1.5 rounded-full overflow-hidden bg-base-300/50">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: barWidth(11 - i) + '%',
                    background: 11 - i >= 8 ? 'var(--p)' : 11 - i >= 5 ? 'var(--wa)' : 'var(--bc)'
                  }"
                />
              </div>
              <span class="w-6 text-right text-base-content/40 font-mono">{{
                anime.rating.count[11 - i] || 0
              }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="anime.collection" data-stats class="bg-base-200/40 rounded-xl p-5">
        <h3 class="font-semibold mb-4 text-base-content/80 text-sm">收藏统计</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-3 rounded-lg bg-base-300/30">
            <p class="text-xl font-bold text-blue-400">
              {{ anime.collection.wish || 0 }}
            </p>
            <p class="text-xs mt-1 text-base-content/40">想看</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-base-300/30">
            <p class="text-xl font-bold text-emerald-400">
              {{ anime.collection.doing || 0 }}
            </p>
            <p class="text-xs mt-1 text-base-content/40">在追</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-base-300/30">
            <p class="text-xl font-bold text-primary">
              {{ anime.collection.collect || 0 }}
            </p>
            <p class="text-xs mt-1 text-base-content/40">看过</p>
          </div>
          <div class="text-center p-3 rounded-lg bg-base-300/30">
            <p class="text-xl font-bold text-red-400">
              {{ anime.collection.dropped || 0 }}
            </p>
            <p class="text-xs mt-1 text-base-content/40">弃番</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Characters -->
    <div v-if="characters.length" class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-base-content flex items-center gap-2">
        <span class="w-1 h-5 rounded-full bg-secondary" />角色
      </h2>
      <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <router-link
          v-for="char in characters.slice(0, 14)"
          :key="char.id"
          :to="`/character/${char.id}`"
          class="flex-shrink-0 text-center w-20 group"
        >
          <div class="avatar">
            <div
              class="w-16 h-16 rounded-full ring-2 ring-base-300 group-hover:ring-primary/40 transition-all"
            >
              <img
                v-image-placeholder
                :src="char.images?.grid || char.images?.medium"
                :alt="char.name"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          <p class="text-xs mt-1.5 truncate text-base-content/60 group-hover:text-base-content">
            {{ char.name }}
          </p>
          <p class="text-xs truncate text-base-content/30">
            {{ char.relation }}
          </p>
        </router-link>
      </div>
    </div>

    <!-- Staff -->
    <div v-if="persons.length" class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-base-content flex items-center gap-2">
        <span class="w-1 h-5 rounded-full bg-primary" />制作人员
      </h2>
      <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <router-link
          v-for="p in persons.slice(0, 20)"
          :key="p.id"
          :to="`/person/${p.id}`"
          class="flex-shrink-0 bg-base-200/40 rounded-xl p-4 w-28 text-center border border-base-300/50 hover:border-primary transition-colors"
        >
          <div class="avatar placeholder mb-2">
            <div class="w-12 h-12 rounded-full bg-primary/20">
              <img
                v-if="p.images?.medium || p.images?.grid"
                v-image-placeholder
                :src="p.images.medium || p.images.grid"
                :alt="p.name"
                loading="lazy"
                decoding="async"
                class="rounded-full"
              />
              <span v-else class="text-lg font-bold text-primary">{{ p.name?.[0] }}</span>
            </div>
          </div>
          <p class="text-xs font-medium line-clamp-1 text-base-content">
            {{ p.name }}
          </p>
          <p class="text-xs line-clamp-1 text-base-content/40">
            {{ p.relation || cvtCareer(p.career?.[0]) }}
          </p>
        </router-link>
      </div>
    </div>

    <!-- Relations -->
    <div v-if="relations.filter(r => r.type !== 3).length" class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-base-content flex items-center gap-2">
        <span class="w-1 h-5 rounded-full bg-accent" />关联条目
      </h2>
      <div class="anime-grid">
        <AnimeCard
          v-for="rel in relations.filter(r => r.type !== 3).slice(0, 8)"
          :key="rel.id"
          :anime="rel"
        />
      </div>
    </div>

    <!-- Talkbox preview -->
    <CommentSection :id="anime.id" type="subject" />
  </div>
</template>

<script setup>
import { cvtCareer } from '../../utils/career'
import AnimeCard from '../AnimeCard.vue'
import CommentSection from '../CommentSection.vue'

const props = defineProps({
  anime: { type: Object, default: () => ({}) },
  characters: { type: Array, default: () => [] },
  persons: { type: Array, default: () => [] },
  relations: { type: Array, default: () => [] }
})

function barWidth(i) {
  const max = Math.max(...Object.values(props.anime.rating?.count || {}), 1)
  return ((props.anime.rating?.count[i] || 0) / max) * 100
}
</script>
