<template>
  <div class="form_box_g">
    <h3>소곤소곤, 더 기억할게 있나요?</h3>
    <textarea
      placeholder="최대 100자까지 적을 수 있어요."
      class="comment"
      maxlength="100"
      v-model="text"
    ></textarea>
    <div class="textarea_count">{{ text.length }}/100</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const text = ref('')

const setFromRoutine = (routine) => {
  text.value = routine?.comment || ''
}

defineExpose({
  comment: text,
  setFromRoutine
})

</script>