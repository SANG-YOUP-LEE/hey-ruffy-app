<template>
  <div class="inline-wheel-wrapper">
    <ul class="inline-wheel-list" ref="listRef" @scroll="onScroll">
      <li
        v-for="(item, index) in paddedItems"
        :key="index"
        class="inline-wheel-item"
        :class="{ selected: index === selectedIndex + paddingCount }"
      >
        {{ item }}
      </li>
    </ul>
    <div class="highlight-overlay"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  items: Array,
  modelValue: [String, Number],
})

const emit = defineEmits(['update:modelValue'])

const listRef = ref(null)
const itemHeight = 40
const paddingCount = 3

// padding 추가
const paddedItems = computed(() => {
  const padding = Array(paddingCount).fill('')
  return [...padding, ...props.items, ...padding]
})

const selectedIndex = ref(0)

const scrollToIndex = (index) => {
  if (listRef.value) {
    listRef.value.scrollTop = index * itemHeight
  }
}

const onScroll = () => {
  const scrollTop = listRef.value.scrollTop
  const index = Math.round(scrollTop / itemHeight)
  selectedIndex.value = index
  const realIndex = index - paddingCount
  if (props.items[realIndex]) {
    emit('update:modelValue', props.items[realIndex])
  }
}

watch(() => props.modelValue, (val) => {
  const index = props.items.indexOf(val)
  if (index !== -1) {
    scrollToIndex(index + paddingCount)
  }
})

onMounted(() => {
  nextTick(() => {
    const index = props.items.indexOf(props.modelValue)
    if (index !== -1) scrollToIndex(index + paddingCount)
  })
})
</script>
