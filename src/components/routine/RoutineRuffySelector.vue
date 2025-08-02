<template>
  <div class="form_box_g">
    <h3>함께 산책할 러피를 선택해주세요.</h3>
    <!-- name을 고유화하기 위해 uniqueName 전달 -->
    <RuffySelector v-model="selectedRuffy" :unique-name="'routine-choice'" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RuffySelector from '@/components/common/RuffySelector.vue'

const selectedRuffy = ref('')
</script>