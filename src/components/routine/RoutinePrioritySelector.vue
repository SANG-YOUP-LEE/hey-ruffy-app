<template>
  <div class="form_box_g">
    <h3>다짐을 표현할 색상을 선택해주세요.</h3>
    <div class="color_selecter">
      <ColorSelector :model-value="modelValue" @update:model-value="updateValue" />
    </div>
  </div>
</template>

<script setup>
import ColorSelector from '@/components/common/ColorSelector.vue'

const props = defineProps({
  modelValue: { type: Number, default: null }
})
const emit = defineEmits(['update:modelValue'])

function updateValue(v) {
  const n = Number.isFinite(+v) ? +v : null
  emit('update:modelValue', n)
}
</script>
