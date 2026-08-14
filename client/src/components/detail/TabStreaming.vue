<template>
  <div>
    <div class="space-y-3">
      <a
        v-if="bilibiliDetails?.url"
        :href="bilibiliDetails.url"
        target="_blank"
        class="btn btn-primary w-full"
      >
        前往 B 站观看《{{ bilibiliDetails.title || title }}》 →
      </a>
      <a
        v-else
        :href="`https://search.bilibili.com/bangumi?keyword=${encodeURIComponent(title)}`"
        target="_blank"
        class="btn btn-primary w-full"
      >
        在 B 站搜索《{{ title }}》 →
      </a>
      <a
        :href="`https://ani.girigirilove.com/search/-------------.html?wd=${encodeURIComponent(title)}`"
        target="_blank"
        class="btn btn-outline w-full"
      >
        前往 girigirilove 搜索观看 →
      </a>
    </div>
    <p class="text-xs text-base-content/30 text-center mt-4">
      点击跳转至第三方网站，本站不存储任何视频内容
    </p>
  </div>
</template>

<script setup>
defineProps({
  bilibiliDetails: { type: Object, default: null },
  title: { type: String, default: '' }
})
</script>
