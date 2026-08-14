<template>
  <div>
    <CommentSection :id="subjectId" type="subject" />
    <a
      :href="`https://bangumi.lol/subject/${subjectId}`"
      target="_blank"
      class="btn btn-sm btn-outline mt-4 w-full"
      >在 Bangumi 发表评论 →</a
    >
  </div>
</template>

<script setup>
import CommentSection from '../CommentSection.vue'

defineProps({
  subjectId: { type: [String, Number], required: true }
})
</script>
