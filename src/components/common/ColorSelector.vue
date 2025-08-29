<template>
  <span
    v-for="(color, index) in colors"
    :key="index"
    :class="[color, { on: selectedColor === index, dimmed: selectedColor !== null && selectedColor !== index }]"
    @click="toggleColor(index)"
  >
    컬러{{ index + 1 }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const colors = [
  'color_picker01',
  'color_picker02',
  'color_picker03',
  'color_picker04',
  'color_picker05',
  'color_picker06',
  'color_picker07',
  'color_picker08',
  'color_picker09',
  'color_picker10'
]

const props = defineProps({
  modelValue: { type: Number, default: null }
})
const emit = defineEmits(['update:modelValue'])

const selectedColor = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

function toggleColor(index) {
  if (selectedColor.value !== index) selectedColor.value = index
}

const priority = computed(() => {
  if (selectedColor.value === null) return null
  if (selectedColor.value <= 3) return 'low'
  if (selectedColor.value <= 6) return 'medium'
  return 'high'
})

defineExpose({ priority })
</script>
