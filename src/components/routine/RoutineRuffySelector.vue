<template>
  <div class="form_box_g">
    <h3>함께 산책할 러피를 선택해주세요.</h3>
    <RuffySelector
      :model-value="modelValue"
      @update:modelValue="val => emit('update:modelValue', val)"
      :unique-name="uniqueName"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import RuffySelector from '@/components/common/RuffySelector.vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  uniqueName: { type: String, default: 'routine-ruffy' }
})
const emit = defineEmits(['update:modelValue'])

const setFromRoutine = (routine) => {
  emit('update:modelValue', routine?.ruffy ?? '')
}

defineExpose({
  ruffy: computed(() => props.modelValue),
  setFromRoutine
})
</script>
