<template>
  <div v-if="characters.length">
    <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      <router-link
        v-for="char in characters"
        :key="char.id"
        :to="`/character/${char.id}`"
        class="flex-shrink-0 text-center w-20 group"
      >
        <div class="avatar">
          <div
            class="w-16 h-16 rounded-full ring-2 ring-base-300 group-hover:ring-primary/40 transition-all"
          >
            <img
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
  <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无角色信息</div>
</template>

<script setup>
defineProps({
  characters: { type: Array, default: () => [] }
})
</script>
