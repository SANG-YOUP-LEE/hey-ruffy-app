<template>
  <div
    class="inline-wheel-container"
    @wheel.passive="false"
    @wheel="onWheel"
    @touchstart="onTouchStart"
    @touchmove.prevent="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div
      class="inline-wheel-list"
      :style="{
        transform: `translateY(-${selectedIndex * itemHeight}px)`,
        paddingTop: `${paddingOffset}px`,
        paddingBottom: `${paddingOffset}px`
      }"
    >
      <div
        v-for="(item, index) in items"
        :key="index"
        class="inline-wheel-item"
        :class="{ selected: index === selectedIndex }"
        :style="{ height: itemHeight + 'px', lineHeight: itemHeight + 'px' }"
        @click="select(index)"
      >
        {{ item }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  modelValue: [String, Number],
  itemHeight: {
    type: Number,
    default: 40
  },
  containerHeight: {
    type: Number,
    default: 96 // rem 기준 6rem = 96px
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedIndex = ref(0)

onMounted(() => {
  const initialIndex = props.items.findIndex(
    (item) => item === props.modelValue
  )
  if (initialIndex >= 0) selectedIndex.value = initialIndex
})

const onWheel = (event) => {
  event.preventDefault()
  if (event.deltaY > 0 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++
  } else if (event.deltaY < 0 && selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

let touchStartY = 0
const onTouchStart = (e) => {
  touchStartY = e.touches[0].clientY
}
const onTouchMove = (e) => {
  const deltaY = e.touches[0].clientY - touchStartY
  if (deltaY > 10 && selectedIndex.value > 0) {
    selectedIndex.value--
    touchStartY = e.touches[0].clientY
  } else if (deltaY < -10 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++
    touchStartY = e.touches[0].clientY
  }
}
const onTouchEnd = () => {}

const select = (index) => {
  selectedIndex.value = index
}

watch(selectedIndex, (newVal) => {
  emit('update:modelValue', props.items[newVal])
})

// 중앙 정렬을 위한 padding 계산
const paddingOffset = computed(() => {
  return (props.containerHeight - props.itemHeight) / 2
})
</script>

<style scoped>
.inline-wheel-container {
  overflow: hidden;
  height: 6rem;
  position: relative;
  width: 100%;
}
.inline-wheel-list {
  transition: transform 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.inline-wheel-item {
  text-align: center;
  font-size: 1rem;
  color: #a333;
  user-select: none;
  width: 100%;
}
.inline-wheel-item.selected {
  font-weight: bold;
  color: #333;
  border-radius: 1rem;
  background-color: #ffed71;
}
</style>