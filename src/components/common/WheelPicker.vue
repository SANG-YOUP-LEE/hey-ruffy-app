<template>
  <div class="scroll-picker vertical" ref="picker">
    <div class="scroll-picker-list">
      <div 
        class="scroll-picker-item"
        v-for="(option, index) in options"
        :key="option"
        :class="{ light: index === currentIndex }"
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
const currentIndex = ref(0)
let scrollEndTimer = null

// 스크롤 멈추면 중앙 아이템 선택
const handleScrollEnd = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  currentIndex.value = index
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

// 스크롤 이벤트 (실시간 처리 최소화)
const handleScroll = () => {
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(handleScrollEnd, 120)
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
    list.scrollTo({ top: startIndex * itemHeight, behavior: 'auto' })
  })
  list.addEventListener('scroll', handleScroll)
})
</script>
