<template>
  <div v-show="topLoader.active" class="top-loader">
    <div class="bar" :style="{ transform: `scaleX(${topLoader.progress})` }"></div>
  </div>
</template>

<script setup>
import { topLoader } from '@/lib/topLoader'
</script>

<style scoped>
.top-loader {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  z-index: 9999;
  pointer-events: none;
}
.bar {
  width: 100%;
  height: 100%;
  transform-origin: 0 50%;
  transition: transform 0.2s ease;
  background: #2C6CFD; /* hey, Ruffy! 파란색 */
}
</style>
