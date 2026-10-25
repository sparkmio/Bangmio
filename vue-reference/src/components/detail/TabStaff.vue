<template>
  <div v-if="persons.length">
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
            /><span v-else class="text-lg font-bold text-primary">{{ p.name?.[0] }}</span>
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
  <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无制作人员信息</div>
</template>

<script setup>
import { cvtCareer } from '../../utils/career'

defineProps({
  persons: { type: Array, default: () => [] }
})
</script>
