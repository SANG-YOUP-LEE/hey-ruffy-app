
<!-- src/components/TopLoader.vue -->
<template>
  <div v-show="topLoader.active" class="top-loader">
    <div class="bar" :style="barStyle"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { topLoader } from '@/lib/topLoader'
const barStyle = computed(() => ({ transform: `scaleX(${topLoader.progress})` }))
</script>

<style scoped>
.top-loader{
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 2px;
  z-index: 9999;
  pointer-events: none;
}
.bar{
  width: 100%; height: 100%;
  transform-origin: 0 50%;
  transition: transform .12s ease;
  background: #2C6CFD; /* hey, Ruffy! 파란색 */
}
</style>
