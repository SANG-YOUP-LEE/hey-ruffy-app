<template>
  <div class="full_screen_popup" v-if="visible">
    <button class="close_btn" @click="$emit('close')"><span>닫기</span></button>
    <div class="popup_content">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean
})

defineEmits(['close'])
</script>

<style scoped>
.full_screen_popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: white;
  z-index: 1000;
  overflow-y: auto;
  padding: 2rem;
}
</style>
