<template>
  <div id="footer">
    <div class="button">
      <button class="home" @click="emit('refresh-main')"><span>홈</span></button>
      <button class="shop"><span>상점</span></button>
      <button class="say"><span>일기</span></button>
      <button class="share"><span>공유</span></button>
    </div>
  </div>
</template>

<script setup>
const emit = defineEmits(['refresh-main'])
</script>

