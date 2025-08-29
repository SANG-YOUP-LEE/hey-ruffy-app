<template>
  <div class="form_box_g">
    <h3>즐거운 산책 코스를 선택해주세요.</h3>
    <CourseSelector
      :model-value="modelValue"
      @update:modelValue="onUpdate"
      :unique-name="uniqueName || 'routine-course'"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CourseSelector from '@/components/common/CourseSelector.vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  uniqueName: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const onUpdate = v => emit('update:modelValue', v)

const setFromRoutine = (routine) => {
  emit('update:modelValue', routine?.course ?? null)
}

const course = computed(() => props.modelValue)

defineExpose({
  course,
  setFromRoutine
})
</script>
