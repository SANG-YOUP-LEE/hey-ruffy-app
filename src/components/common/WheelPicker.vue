<template>
  <div class="wheel-wrapper">
    <div class="wheel-container" ref="container" @scroll.passive="handleScroll">
      <div class="spacer" :style="{ height: spacerHeight + 'px' }"></div>
      <div
        v-for="(option, index) in options"
        :key="index"
        class="wheel-item"
        :class="{ selected: index === currentIndex }"
        @click="scrollToIndex(index)"
      >
        {{ option }}
      </div>
      <div class="spacer" :style="{ height: spacerHeight + 'px' }"></div>
    </div>
    <div class="highlight"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const container = ref(null)
const itemHeight = 40
const currentIndex = ref(0)
const spacerHeight = ref(0)
let scrollTimer = null

const updateIndexFromScroll = () => {
  const idx = Math.round(container.value.scrollTop / itemHeight)
  currentIndex.value = idx
  emit('update:modelValue', props.options[idx])
}

const handleScroll = () => {
  // 1) 실시간으로 currentIndex 반영
  updateIndexFromScroll()

  // 2) 스크롤 멈춘 후 부드럽게 중앙 정렬
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    scrollToIndex(Math.round(container.value.scrollTop / itemHeight))
  }, 100)
}
const scrollToIndex = (index) => {
  const start = container.value.scrollTop
  const end = index * itemHeight
  const duration = 300
  let startTime = null

  const animateScroll = (time) => {
    if (!startTime) startTime = time
    const progress = Math.min((time - startTime) / duration, 1)
    const ease = 0.5 - Math.cos(progress * Math.PI) / 2
    container.value.scrollTop = start + (end - start) * ease
    if (progress < 1) {
      requestAnimationFrame(animateScroll)
    }
  }
  requestAnimationFrame(animateScroll)
  currentIndex.value = index
  emit('update:modelValue', props.options[index])
}

onMounted(() => {
  nextTick(() => {
    spacerHeight.value = (container.value.clientHeight - itemHeight) / 2
    const idx = props.options.indexOf(props.modelValue)
    scrollToIndex(idx !== -1 ? idx : 0)
  })
})

watch(() => props.modelValue, (val) => {
  const idx = props.options.indexOf(val)
  if (idx !== -1 && idx !== currentIndex.value) {
    scrollToIndex(idx)
  }
})
</script>