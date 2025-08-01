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
const itemHeight = 30
let scrollEndTimer = null

// 스크롤 멈췄을 때 가장 가까운 아이템 선택
const handleScrollEnd = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}
const highlightFont = () => {
  const items = picker.value.querySelectorAll('.scroll-picker-item')
  const center = list.scrollTop + list.clientHeight / 2

  items.forEach((item, i) => {
    const itemCenter = i * itemHeight + itemHeight / 2
    if (Math.abs(itemCenter - center) < itemHeight / 2) {
      item.style.color = '#fff'  // 중앙 아이템 글자색 흰색
    } else {
      item.style.color = '#999'  // 나머지 기본 색상
    }
  })
}

list.addEventListener('scroll', highlightFont)
  
// 스크롤 이벤트 (멈춤 감지)
const handleScroll = () => {
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(handleScrollEnd, 100)
}

// 아이템 클릭 시 해당 위치로 스냅
const handleClick = (index) => {
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

onMounted(() => {
  list = picker.value.querySelector('.scroll-picker-list')

  // 초기값 위치 세팅
  const defaultIndex = props.options.indexOf(props.modelValue)
  if (defaultIndex !== -1) {
    nextTick(() => {
      list.scrollTo({ top: defaultIndex * itemHeight, behavior: 'auto' })
    })
  }

  // 스크롤 이벤트 등록
  list.addEventListener('scroll', handleScroll)
})
</script>
