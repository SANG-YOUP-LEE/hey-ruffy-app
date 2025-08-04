<template>
  <div class="form_box_g">
    <h3>함께 산책할 러피를 선택해주세요.</h3>
    <RuffySelector v-model="selectedRuffy" unique-name="routine-ruffy" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RuffySelector from '@/components/common/RuffySelector.vue'

const selectedRuffy = ref('')

defineExpose({
  ruffy: selectedRuffy
})

</script>