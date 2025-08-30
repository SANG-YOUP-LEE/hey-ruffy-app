<template>
  <div class="form_box_g">
    <h3>소곤소곤, 더 기억할게 있나요?</h3>
    <textarea
      class="comment"
      placeholder="최대 200자까지 적을 수 있지만 안 쓰셔도 괜찮아요."
      maxlength="200"
      v-model="model"
    ></textarea>
    <div class="textarea_count">{{ len }}/200</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue ?? '',
  set: v => emit('update:modelValue', v ?? '')
})
const len = computed(() => (model.value || '').length)
</script>