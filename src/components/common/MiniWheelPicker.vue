<template>
  <div class="mini-wheel-picker">
    <div class="picker-title">{{ title }}</div>
    <div
      class="picker-wheel"
      ref="wheelRef"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @wheel="onWheel"
    >
      <ul :style="wheelStyle">
        <li
          v-for="(item, index) in paddedItems"
          :key="index"
          :class="{ active: index === selectedIndex + paddingCount }"
          @click="onItemClick(index - paddingCount)"
        >
          {{ item }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  items: Array,
  modelValue: [String, Number],
  title: String
})

const emit = defineEmits(['update:modelValue'])

const wheelRef = ref(null)
const itemHeight = 40
const paddingCount = 3
const startY = ref(0)
const deltaY = ref(0)
const isDragging = ref(false)
const selectedIndex = ref(0)

const paddedItems = computed(() => {
  const blanks = Array(paddingCount).fill('')
  return [...blanks, ...props.items, ...blanks]
})

const wheelStyle = computed(() => ({
  transform: `translateY(${-1 * (selectedIndex.value + paddingCount) * itemHeight + deltaY.value}px)`
}))

// 초기 값 반영
watch(() => props.modelValue, (val) => {
  const index = props.items.findIndex((i) => i === val)
  if (index !== -1 && index !== selectedIndex.value) {
    selectedIndex.value = index
  }
}, { immediate: true })

// 🧠 핵심! items 바뀔 때 선택값 유효성 체크
watch(() => props.items, (newItems) => {
  if (!newItems.includes(props.modelValue)) {
    const fallback = newItems[0] || ''
    selectedIndex.value = 0
    emit('update:modelValue', fallback)
  } else {
    const idx = newItems.findIndex(i => i === props.modelValue)
    selectedIndex.value = idx
  }
})

const onTouchStart = (e) => {
  isDragging.value = true
  startY.value = e.touches[0].clientY
  deltaY.value = 0
}

const onTouchMove = (e) => {
  if (!isDragging.value) return
  deltaY.value = e.touches[0].clientY - startY.value
}

const onTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false

  const movedIndex = -Math.round(deltaY.value / itemHeight)
  let newIndex = selectedIndex.value + movedIndex
  if (newIndex < 0) newIndex = 0
  if (newIndex >= props.items.length) newIndex = props.items.length - 1

  selectedIndex.value = newIndex
  deltaY.value = 0
  emit('update:modelValue', props.items[newIndex])
}

const onWheel = (e) => {
  e.preventDefault()
  if (e.deltaY > 0 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++
  } else if (e.deltaY < 0 && selectedIndex.value > 0) {
    selectedIndex.value--
  }
  emit('update:modelValue', props.items[selectedIndex.value])
}

const onItemClick = (index) => {
  if (index < 0 || index >= props.items.length) return
  selectedIndex.value = index
  emit('update:modelValue', props.items[index])
}

onMounted(() => {
  nextTick(() => {
    const index = props.items.findIndex((i) => i === props.modelValue)
    if (index !== -1) selectedIndex.value = index
  })
})
</script>

<style scoped>
.mini-wheel-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
}

.picker-title {
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}

.picker-wheel {
  width: 100%;
  height: 160px;
  overflow: hidden;
  position: relative;
  overscroll-behavior: contain;
}

.picker-wheel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  transition: transform 0.2s ease-out;
}

.picker-wheel li {
  height: 40px;
  line-height: 40px;
  text-align: center;
  color: #999;
  cursor: pointer;
}

.picker-wheel li.active {
  color: #000;
  font-weight: bold;
  font-size: 16px;
}
</style>