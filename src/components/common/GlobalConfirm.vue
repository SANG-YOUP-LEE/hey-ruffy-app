<template>
  <teleport to="body">
    <div v-if="m.open" class="com_popup_wrap">
      <div class="popup_inner alert">
        <div class="popup_tit"><h2>{{ m.title }}</h2></div>
        <div class="popup_body">{{ m.message }}</div>
        <div class="popup_btm">
          <button @click="m.ok" class="p_basic">{{ m.okText }}</button>
          <button v-if="m.cancelText" @click="m.cancel" class="p_white">{{ m.cancelText }}</button>
        </div>
        <button class="close_btn" @click="m.cancel"><span>닫기</span></button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { useModalStore } from '@/stores/modal'
const m = useModalStore()
</script>