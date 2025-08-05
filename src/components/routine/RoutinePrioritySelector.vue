<template>
  <div class="form_box_g">
    <h3>다짐을 표현할 색상을 선택해주세요.</h3>
    <div class="color_selecter">
      <ColorSelector ref="colorSelectorRef" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ColorSelector from '@/components/common/ColorSelector.vue'

const colorSelectorRef = ref(null)

const setFromRoutine = (routine) => {
  if (routine?.colorIndex !== undefined && colorSelectorRef.value?.setSelectedColor) {
    colorSelectorRef.value.setSelectedColor(routine.colorIndex)
  }
}

defineExpose({
  get selectedColor() {
    return colorSelectorRef.value?.selectedColor ?? null
  },
  get priority() {
    return colorSelectorRef.value?.priority ?? null
  },
  setFromRoutine
})
</script>
