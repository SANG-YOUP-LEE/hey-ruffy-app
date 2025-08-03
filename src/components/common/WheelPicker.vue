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
  updateIndexFromScroll()
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    scrollToIndex(Math.round(container.value.scrollTop / itemHeight))
  }, 100)
}

const scrollToIndex = (index) => {
  if (index < 0 || index >= props.options.length) return
  container.value.scrollTop = index * itemHeight
  currentIndex.value = index
  emit('update:modelValue', props.options[index])
}

const forceScrollEvent = () => {
  requestAnimationFrame(() => {
    updateIndexFromScroll()
  })
}

onMounted(() => {
  nextTick(() => {
    spacerHeight.value = (container.value.clientHeight - itemHeight) / 2
    const idx = props.options.indexOf(props.modelValue)
    scrollToIndex(idx !== -1 ? idx : 0)
    forceScrollEvent()
  })
})

watch(() => props.modelValue, (val) => {
  const idx = props.options.indexOf(val)
  if (idx !== -1 && idx !== currentIndex.value) {
    nextTick(() => {
      scrollToIndex(idx)
      forceScrollEvent()
    })
  }
})
</script>