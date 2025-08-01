<template>
  <div class="scroll-picker vertical" ref="picker">
    <div class="scroll-picker-list">
      <div 
        class="scroll-picker-item"
        v-for="(option, index) in options"
        :key="option"
        :class="{ selected: index === currentIndex }"
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
const currentIndex = ref(0)

// 중앙 아이템 감지 함수
const detectCenterItem = () => {
  const scrollCenter = list.scrollTop + (list.clientHeight / 2)
  const index = Math.round((scrollCenter - itemHeight / 2) / itemHeight)
  currentIndex.value = index
}

// 스크롤 멈췄을 때 가장 가까운 아이템 선택
const handleScrollEnd = () => {
  const index = Math.max(0, Math.min(props.options.length - 1, currentIndex.value))
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

// 스크롤 이벤트 (실시간 감지 + 멈춤 감지)
const handleScroll = () => {
  detectCenterItem()
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
    currentIndex.value = defaultIndex
    nextTick(() => {
      list.scrollTo({ top: defaultIndex * itemHeight, behavior: 'auto' })
    })
  }

  // 스크롤 이벤트 등록
  list.addEventListener('scroll', handleScroll)
})
</script>

<style>
.scroll-picker-item.selected {
  color: #000;
  font-weight: bold;
}
</style>
