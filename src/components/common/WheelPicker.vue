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
let list
let items
const itemHeight = 30
let scrollEndTimer = null

// 스크롤 중 실시간으로 .light 적용
const handleScrollLive = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  if (items && items.length > 0) {
    items.forEach(item => item.classList.remove('light'))
    if (items[index]) {
      items[index].classList.add('light')
    }
  }
}

// 스크롤 멈춘 뒤 자동 스냅
const handleScrollEnd = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

// 스크롤 이벤트
const handleScroll = () => {
  handleScrollLive()
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(handleScrollEnd, 100)
}

// 클릭 시 스냅 및 .light 적용
const handleClick = (index) => {
  if (items && items.length > 0) {
    items.forEach(item => item.classList.remove('light'))
    if (items[index]) {
      items[index].classList.add('light')
    }
  }
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

onMounted(() => {
  list = picker.value.querySelector('.scroll-picker-list')
  items = picker.value.querySelectorAll('.scroll-picker-item')

  // 초기값 위치 세팅
  const defaultIndex = props.options.indexOf(props.modelValue)
  nextTick(() => {
    const startIndex = defaultIndex !== -1 ? defaultIndex : 0
    list.scrollTo({ top: startIndex * itemHeight, behavior: 'auto' })
    if (items[startIndex]) {
      items[startIndex].classList.add('light')
    }
  })

  // 스크롤 이벤트 등록
  list.addEventListener('scroll', handleScroll)
})
</script>
