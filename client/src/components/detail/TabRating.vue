<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Bangumi -->
    <div class="bg-base-200/40 rounded-xl p-5 text-center">
      <p
        class="text-4xl font-black"
        :class="
          bgmRating?.score >= 8
            ? 'text-success'
            : bgmRating?.score >= 5
              ? 'text-warning'
              : 'text-base-content/50'
        "
      >
        {{ bgmRating?.score?.toFixed(1) || '-' }}
      </p>
      <div class="flex items-center gap-0.5 mt-1 justify-center">
        <svg
          v-for="i in 5"
          :key="i"
          class="w-4 h-4"
          :class="i <= Math.round((bgmRating?.score || 0) / 2) ? 'text-amber-400' : 'text-base-300'"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      </div>
      <p class="text-xs text-base-content/50 mt-1">Bangumi {{ bgmRating?.total }}人评</p>
      <a
        :href="`https://bangumi.lol/subject/${subjectId}`"
        target="_blank"
        class="btn btn-xs btn-ghost mt-3 w-full"
        >查看详情 →</a
      >
    </div>

    <!-- 豆瓣 -->
    <div class="bg-base-200/40 rounded-xl p-5 text-center">
      <template v-if="doubanDetails">
        <p class="text-4xl font-black text-amber-500">
          {{ doubanDetails.rate }}
        </p>
        <div class="flex items-center gap-0.5 mt-1 justify-center">
          <svg
            v-for="i in 5"
            :key="i"
            class="w-4 h-4"
            :class="
              i <= Math.round(parseFloat(doubanDetails.rate) / 2)
                ? 'text-amber-400'
                : 'text-base-300'
            "
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        </div>
        <p class="text-xs text-base-content/50 mt-1">豆瓣评分</p>
        <a :href="doubanDetails.url" target="_blank" class="btn btn-xs btn-ghost mt-3 w-full"
          >查看详情 →</a
        >
      </template>
      <template v-else>
        <p class="text-sm text-base-content/40 py-6">
          <span v-if="doubanLoading" class="loading loading-spinner loading-sm" />
          <span v-else>豆瓣评分暂不可用（接口被限制）</span>
        </p>
      </template>
    </div>

    <!-- B站 -->
    <div class="bg-base-200/40 rounded-xl p-5 text-center">
      <template v-if="bilibiliDetails">
        <p class="text-4xl font-black text-pink-500">
          {{ bilibiliDetails.score }}
        </p>
        <div class="flex items-center gap-0.5 mt-1 justify-center">
          <svg
            v-for="i in 5"
            :key="i"
            class="w-4 h-4"
            :class="
              i <= Math.round((bilibiliDetails.score || 0) / 2) ? 'text-pink-400' : 'text-base-300'
            "
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        </div>
        <p class="text-xs text-base-content/50 mt-1">
          B站评分
          {{ bilibiliDetails.score_count ? `(${bilibiliDetails.score_count}人)` : '' }}
        </p>
        <a :href="bilibiliDetails.url" target="_blank" class="btn btn-xs btn-ghost mt-3 w-full"
          >查看详情 →</a
        >
      </template>
      <template v-else>
        <p class="text-sm text-base-content/40 py-6">
          <span v-if="bilibiliLoading" class="loading loading-spinner loading-sm" />
          <span v-else>B站评分暂不可用（接口被限制）</span>
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  bgmRating: { type: Object, default: () => ({}) },
  subjectId: { type: [String, Number], required: true },
  doubanDetails: { type: Object, default: null },
  doubanLoading: { type: Boolean, default: false },
  bilibiliDetails: { type: Object, default: null },
  bilibiliLoading: { type: Boolean, default: false }
})
</script>
