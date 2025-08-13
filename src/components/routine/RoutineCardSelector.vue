<template>
  <div class="form_box_g">
    <h3>다짐카드 디자인을 선택해주세요.</h3>
    <CardSelector v-model="selectedCard" unique-name="routine-card" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CardSelector from '@/components/common/CardSelector.vue'

const selectedCard = ref('')

const setFromRoutine = (routine) => {
  selectedCard.value = routine?.card || ''
}

defineExpose({
  card: selectedCard,
  setFromRoutine
})

</script>
