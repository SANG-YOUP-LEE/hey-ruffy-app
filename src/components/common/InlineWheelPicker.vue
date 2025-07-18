<template>
  <div class="inline-wheel-wrapper">
    <div class="inline-wheel-list" ref="listRef" @scroll="onScroll">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="inline-wheel-item"
        :class="{ selected: index === selectedIndex }"
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
  updateSelectedIndexFromModel()
})

// ✅ resetKey가 바뀔 때: 스크롤 & 선택 초기화, 이후 자동 onScroll 차단
watch(() => props.resetKey, async () => {
  isResetting.value = true
  selectedIndex.value = -1
  scrollToTop()

  await nextTick()
  selectedIndex.value = -1

  // ✅ 100ms 뒤에 reset 상태 해제 (스크롤 이벤트 차단용)
  setTimeout(() => {
    isResetting.value = false
  }, 100)
})

const onScroll = () => {
  if (isResetting.value) return // 초기화 중엔 무시

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
  selectedIndex.value = index
  emit('update:modelValue', props.items[index])
}
</script>
<style scoped>
.inline-wheel-wrapper {
  height: 120px;
  overflow: hidden;
  position: relative;
}

.inline-wheel-list {
  height: 100%;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  padding-top: 40px;
  padding-bottom: 40px;
}

.inline-wheel-item {
  height: 40px;
  line-height: 40px;
  text-align: center;
  font-size: 1rem;
  color: #666;
  transition: background-color 0.2s;
}

.inline-wheel-item.selected {
  color: #000;
  font-weight: bold;
  background-color: #ffe08a; /* 예시: 노란 배경 */
}

.highlight-overlay {
  position: absolute;
  top: 40px;
  height: 40px;
  left: 0;
  right: 0;
  pointer-events: none;
}
</style>