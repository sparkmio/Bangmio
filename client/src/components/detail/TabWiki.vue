<template>
  <div v-if="infobox?.length">
    <div class="bg-base-200/40 rounded-lg p-5">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div v-for="info in infobox" :key="info.key" class="text-sm">
          <span class="font-medium text-base-content/50">{{ info.key }}</span>
          <span class="ml-1 text-base-content/70">{{ infoValue(info.value) }}</span>
        </div>
      </div>
    </div>
    <a
      :href="`https://bangumi.lol/subject/${subjectId}`"
      target="_blank"
      class="btn btn-sm btn-ghost mt-4 w-full"
      >在 Bangumi 查看完整 Wiki →</a
    >
  </div>
  <div v-else class="py-10 text-center text-base-content/40 text-sm">暂无制作信息</div>
</template>

<script setup>
defineProps({
  infobox: { type: Array, default: () => [] },
  subjectId: { type: [String, Number], required: true }
})

function infoValue(val) {
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(v => v.v || v).join(', ')
  return ''
}
</script>
