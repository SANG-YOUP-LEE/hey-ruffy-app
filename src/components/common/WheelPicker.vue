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

  // 기본값 위치로 스크롤
  const defaultIndex = props.options.indexOf(props.modelValue)
  if (defaultIndex !== -1) {
    nextTick(() => {
      list.scrollTo({ top: defaultIndex * itemHeight, behavior: 'auto' })
    })
  }

  // 선택 강조
  const highlight = () => {
    const index = Math.round(list.scrollTop / itemHeight)
    items.forEach(item => item.classList.remove('light'))

    if (items[index]) {
      items[index].classList.add('light')
      emit('update:modelValue', props.options[index])
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
