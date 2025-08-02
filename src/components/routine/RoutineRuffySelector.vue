<template>
  <div class="form_box_g">
    <h3>함께 산책할 러피를 선택해주세요.</h3>
    <RuffySelectorSignup v-model="selectedRuffy" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RuffySelectorSignup from '@/components/common/RuffySelector.vue'

const selectedRuffy = ref('')
</script>