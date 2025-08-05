<template>
  <span 
    v-for="(color, index) in colors" 
    :key="index"
    :class="[color, { 
      on: selectedColor === index,
      dimmed: selectedColor !== null && selectedColor !== index 
    }]" 
    @click="toggleColor(index)"
  >
    컬러{{ index + 1 }}
  </span>
</template>

<script setup>
import { ref } from 'vue'

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

const selectedColor = ref(null)

const toggleColor = (index) => {
  selectedColor.value = selectedColor.value === index ? null : index
}

defineExpose({
  selectedColor
})

</script>

