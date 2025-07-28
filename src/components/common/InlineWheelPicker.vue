<template>
  <div class="inline-wheel-wrapper">
    <div class="inline-wheel-list" ref="listRef" @scroll="onScroll">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="inline-wheel-item"
        :class="{ selected: item === props.modelValue }"
        @click="handleItemClick(index)"
      >
        {{ item }}
      </div>
    </div>
    <div class="highlight-overlay"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

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
const selectedIndex = ref(-1)
const isResetting = ref(false)
const isUserClicking = ref(false)

const itemHeight = 40

const scrollToIndex = (index) => {
  if (listRef.value) {
    listRef.value.scrollTop = index * itemHeight
  }
}

const scrollToTop = () => {
  if (listRef.value) {
    listRef.value.scrollTop = 0
  }
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
    return // 클릭 시에는 scrollToIndex 하지 않음
  }
   updateSelectedIndexFromModel()
  if (isResetting.value) {
    // resetKey로 인해 초기화될 경우에도 scrollToIndex 하지 않음
    return
  }

  updateSelectedIndexFromModel()
})

// ✅ 탭 전환 시: 초기화 (선택 제거 + 스크롤 맨 위)
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
  const index = Math.round(scrollTop / itemHeight)

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
  isUserClicking.value = true
  selectedIndex.value = index
  emit('update:modelValue', props.items[index])
}
</script>
