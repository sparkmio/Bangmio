<template>
  <div v-if="relatedItems.length">
    <div class="anime-grid">
      <AnimeCard v-for="rel in relatedItems" :key="rel.id" :anime="rel" />
    </div>
  </div>
  <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无关联条目</div>
</template>

<script setup>
import { computed } from 'vue'
import AnimeCard from '../AnimeCard.vue'

const props = defineProps({
  relations: { type: Array, default: () => [] }
})

// type !== 3 的关联条目(音乐条目在「音乐」Tab 展示)
const relatedItems = computed(() => props.relations.filter(r => r.type !== 3))
</script>
