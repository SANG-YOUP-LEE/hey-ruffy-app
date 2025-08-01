<template>
  <div class="scroll-picker vertical" ref="picker">
    <div class="scroll-picker-list">
      <div 
        class="scroll-picker-item"
        v-for="(option, index) in options"
        :key="option"
        :style="getItemStyle(index)"
        @click="handleClick(index)"
      >
        {{ option }}
      </div>
    </div>
    <div class="highlight-overlay"></div>
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
let list
const itemHeight = 30
const scrollTop = ref(0)
const currentIndex = ref(0)
let scrollEndTimer = null

// 아이템별 실시간 스타일 계산
const getItemStyle = (index) => {
  const distance = Math.abs(scrollTop.value / itemHeight - index)
  const scale = Math.max(1, 1.2 - distance * 0.1)
  const opacity = Math.max(0.4, 1 - distance * 0.3)
  const color = distance < 0.5 ? '#fff' : '#999'
  const background = distance < 0.5 ? '#333' : 'transparent'
  return {
    width: '80%',
    borderRadius: '1.5rem',
    transform: `scale(${scale})`,
    opacity: opacity,
    color: color,
    fontWeight: distance < 0.5 ? 'bold' : 'normal',
    backgroundColor: background,
    transition: 'transform 0.1s, color 0.1s, opacity 0.1s'
  }
}

// 스크롤 이벤트
const handleScroll = () => {
  scrollTop.value = list.scrollTop
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(handleScrollEnd, 100)
}

// 스크롤 멈춘 뒤 자동 스냅
const handleScrollEnd = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  currentIndex.value = index
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

// 클릭 시 선택
const handleClick = (index) => {
  currentIndex.value = index
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

onMounted(() => {
  list = picker.value.querySelector('.scroll-picker-list')
  const defaultIndex = props.options.indexOf(props.modelValue)
  nextTick(() => {
    const startIndex = defaultIndex !== -1 ? defaultIndex : 0
    currentIndex.value = startIndex
    scrollTop.value = startIndex * itemHeight
    list.scrollTo({ top: startIndex * itemHeight, behavior: 'auto' })
  })
  list.addEventListener('scroll', handleScroll)
})
</script>
