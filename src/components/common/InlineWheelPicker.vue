<template>
  <div class="inline-wheel-wrapper">
    <div class="inline-wheel-list" ref="listRef" @scroll="onScroll">
      <div
        v-for="(item, index) in paddedItems"
        :key="index"
        class="inline-wheel-item"
        :class="{ selected: index === selectedIndex + paddingCount }"
        @click="handleItemClick(index - paddingCount)"
      >
        {{ item }}
      </div>
    </div>
    <div class="highlight-overlay"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  modelValue: [String, Number],
  resetKey: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const listRef = ref(null)
const itemHeight = 40 // 2.5rem
const paddingCount = 3
const selectedIndex = ref(-1)
const isResetting = ref(false)
const isUserClicking = ref(false)

// ✅ 위아래에 padding 추가된 리스트
const paddedItems = computed(() => {
  const padding = Array(paddingCount).fill('')
  return [...padding, ...props.items, ...padding]
})

const scrollToIndex = (index) => {
  if (listRef.value) {
    const offset = (index + paddingCount) * itemHeight
    const centerOffset = offset - (listRef.value.clientHeight / 2) + (itemHeight / 2)
    listRef.value.scrollTop = centerOffset
  }
}

const scrollToTop = () => {
  listRef.value.scrollTop = 0
}

const updateSelectedIndexFromModel = () => {
  const i = props.items.findIndex((item) => item === props.modelValue)
  if (i >= 0) {
    selectedIndex.value = i
    scrollToIndex(i)
  } else {
    selectedIndex.value = -1
  }
}

onMounted(() => {
  updateSelectedIndexFromModel()
})

watch(() => props.modelValue, () => {
  if (isUserClicking.value) {
    isUserClicking.value = false
    return
  }
  if (!isResetting.value) updateSelectedIndexFromModel()
})

watch(() => props.resetKey, async () => {
  isResetting.value = true
  selectedIndex.value = -1
  scrollToTop()

  await nextTick()
  updateSelectedIndexFromModel()

  setTimeout(() => {
    isResetting.value = false
  }, 100)
})

const onScroll = () => {
  if (isResetting.value) return
  const scrollTop = listRef.value.scrollTop
  const index = Math.round(scrollTop / itemHeight) - paddingCount

  if (
    index >= 0 &&
    index < props.items.length &&
    index !== selectedIndex.value
  ) {
    selectedIndex.value = index
    emit('update:modelValue', props.items[index])
  }
}

const handleItemClick = (index) => {
  if (index < 0 || index >= props.items.length) return
  isUserClicking.value = true
  selectedIndex.value = index
  emit('update:modelValue', props.items[index])
}
</script>
