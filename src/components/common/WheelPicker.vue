<template>
  <div class="scroll-picker vertical" ref="picker">
    <div class="scroll-picker-list">
      <div 
        class="scroll-picker-item"
        v-for="(option, index) in options"
        :key="option"
        @click="handleClick(index)"
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
let list, items
const itemHeight = 30
let scrollFrame

// 실시간 하이라이트
const updateHighlight = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  items.forEach(item => item.classList.remove('light'))
  if (items[index]) {
    items[index].classList.add('light')
    emit('update:modelValue', props.options[index])
  }
}

// 스크롤 중 실시간 업데이트
const handleScroll = () => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(updateHighlight)
}

// 스크롤 멈췄을 때 스냅
const handleScrollEnd = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
}

const handleClick = (index) => {
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
}

onMounted(() => {
  list = picker.value.querySelector('.scroll-picker-list')
  items = picker.value.querySelectorAll('.scroll-picker-item')

  const defaultIndex = props.options.indexOf(props.modelValue)
  if (defaultIndex !== -1) {
    nextTick(() => {
      list.scrollTo({ top: defaultIndex * itemHeight, behavior: 'auto' })
    })
  }

  list.addEventListener('scroll', handleScroll)
  list.addEventListener('touchend', handleScrollEnd)
  list.addEventListener('mouseup', handleScrollEnd)

  nextTick(() => {
    updateHighlight()
  })
})
</script>

