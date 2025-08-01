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
let scrollFrame = null
let scrollEndTimer = null

// 실시간 하이라이트 업데이트
const updateHighlight = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  items.forEach(item => item.classList.remove('light'))
  if (items[index]) {
    items[index].classList.add('light')
    emit('update:modelValue', props.options[index])
  }
}

// 스크롤 중 프레임 단위로 하이라이트
const handleScroll = () => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(updateHighlight)

  // 스크롤이 멈춘 뒤 자동 스냅
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(() => {
    const index = Math.round(list.scrollTop / itemHeight)
    list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  }, 120)
}

// 클릭 시 해당 아이템으로 스냅
const handleClick = (index) => {
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
}

onMounted(() => {
  list = picker.value.querySelector('.scroll-picker-list')
  items = picker.value.querySelectorAll('.scroll-picker-item')

  // 초기값 세팅
  const defaultIndex = props.options.indexOf(props.modelValue)
  if (defaultIndex !== -1) {
    nextTick(() => {
      list.scrollTo({ top: defaultIndex * itemHeight, behavior: 'auto' })
    })
  }

  list.addEventListener('scroll', handleScroll)

  nextTick(() => {
    updateHighlight()
  })
})
</script>
