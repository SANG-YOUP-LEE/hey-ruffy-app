<template>
  <div class="scroll-picker vertical" ref="picker">
    <div class="scroll-picker-list">
      <div 
        class="scroll-picker-item"
        v-for="option in options"
        :key="option"
      >
        {{ option }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  options: {
    type: Array,
    required: true
  },
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])
const picker = ref(null)

onMounted(() => {
  const list = picker.value.querySelector('.scroll-picker-list')
  const items = picker.value.querySelectorAll('.scroll-picker-item')
  const itemHeight = 40

  // 선택 강조
  const highlight = () => {
    const center = list.scrollTop + list.clientHeight / 2
    let closestItem = null
    let closestIndex = 0
    let minDistance = Infinity

    items.forEach((item, index) => {
      const itemCenter = item.offsetTop + item.clientHeight / 2
      const distance = Math.abs(center - itemCenter)
      item.classList.toggle('in-focus', distance < 20)
      if (distance < minDistance) {
        minDistance = distance
        closestItem = item
        closestIndex = index
      }
    })
    if (closestItem) {
      emit('update:modelValue', props.options[closestIndex])
    }
  }

  // 스냅
  let timeout
  const snap = () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      const index = Math.round(list.scrollTop / itemHeight)
      list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
    }, 100)
  }

  list.addEventListener('scroll', () => {
    highlight()
    snap()
  })

  nextTick(() => {
    highlight()
  })
})
</script>
