<template>
  <div class="scroll-picker vertical" ref="picker">
    <div class="scroll-picker-list">
      <div 
        class="scroll-picker-item"
        v-for="(option, index) in options"
        :key="option"
        :class="{ active: index === currentIndex }"
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

// 중앙 아이템 인덱스 계산
const detectCenterItem = () => {
  const center = list.scrollTop + list.clientHeight / 2
  const index = Math.round((center - itemHeight / 2) / itemHeight)
  currentIndex.value = Math.max(0, Math.min(props.options.length - 1, index))
}

// 스크롤 멈췄을 때 가장 가까운 아이템 선택
const handleScrollEnd = () => {
  list.scrollTo({ top: currentIndex.value * itemHeight, behavior: 'smooth' })
  emit('update:modelValue', props.options[currentIndex.value])
}

// 스크롤 이벤트
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

  // 첫 렌더링 시 초기화
  detectCenterItem()
})
</script>

<style>
.scroll-picker-item {
  color: #999;
  transition: color 0.2s;
}

.scroll-picker-item.active {
  color: #fff;        /* 중앙 아이템 폰트 색상 */
  font-weight: bold;  /* 강조 효과 */
}
</style>
