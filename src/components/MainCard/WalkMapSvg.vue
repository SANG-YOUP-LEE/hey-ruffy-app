<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :viewBox="`0 0 ${vbW} ${vbH}`"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- 배경 이미지 -->
    <image
      v-if="mapSrc"
      :href="mapSrc"
      x="0"
      y="0"
      :width="vbW"
      :height="vbH"
      :style="{ opacity: mapOpacity }"
    />

    <!-- 경로 -->
    <path
      v-if="showPath"
      :d="pathD"
      fill="none"
      :stroke="pathStroke"
      :stroke-width="pathWidth"
      :stroke-dasharray="pathDasharray"
    />

    <!-- 점 -->
    <circle
      v-for="(p, idx) in points"
      :key="idx"
      :cx="p.x"
      :cy="p.y"
      :r="pointR"
      fill="#ff3b30"
    />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mapSrc: String,
  vbW: Number,
  vbH: Number,
  pathD: String,
  pathStroke: String,
  pathWidth: Number,
  pathDasharray: String,
  showPath: Boolean,
  pointR: Number,
  points: { type: Array, default: () => [] },
  mapOpacity: { type: Number, default: 1 } // 🔹 추가됨
})
</script>
