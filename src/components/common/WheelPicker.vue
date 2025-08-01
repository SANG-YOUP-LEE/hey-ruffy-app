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
let highlightOffset = 0

// 글자 크기 + 투명도 효과 적용
const updateFontEffects = () => {
  const items = picker.value.querySelectorAll('.scroll-picker-item')
  const center = list.scrollTop + list.clientHeight / 2 - highlightOffset

  items.forEach((item, i) => {
    const itemCenter = i * itemHeight + itemHeight / 2
    const distance = Math.abs(itemCenter - center)

    // 중앙 가까울수록 글자 크기 커지고(최대 1.2rem), 멀어질수록 작아짐(최소 0.8rem)
    const size = Math.max(0.8, 1.2 - distance / 100)
    // 중앙 가까울수록 불투명, 멀어질수록 흐려짐
    const opacity = Math.max(0.3, 1 - distance / 60)

    item.style.fontSize = `${size}rem`
    item.style.opacity = opacity
  })
}

// 스크롤 멈췄을 때 가장 가까운 아이템 선택
const handleScrollEnd = () => {
  const index = Math.round(list.scrollTop / itemHeight)
  list.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[index])
}

// 스크롤 이벤트 (효과 적용 + 멈춤 감지)
const handleScroll = () => {
  updateFontEffects()
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

  // 하이라이트 요소 높이를 동적으로 계산
  const highlightEl = picker.value.querySelector('.scroll-picker::after')
  const highlightHeight = 30 // 기본값
  // 가상요소는 직접 접근 불가 → CSS 값 그대로 사용 (또는 별도 요소로 두면 읽기 가능)
  highlightOffset = highlightHeight / 2

  // 초기값 위치 세팅
  const defaultIndex = props.options.indexOf(props.modelValue)
  if (defaultIndex !== -1) {
    nextTick(() => {
      list.scrollTo({ top: defaultIndex * itemHeight, behavior: 'auto' })
      updateFontEffects()
    })
  } else {
    updateFontEffects()
  }

  // 스크롤 이벤트 등록
  list.addEventListener('scroll', handleScroll)
})
</script>
