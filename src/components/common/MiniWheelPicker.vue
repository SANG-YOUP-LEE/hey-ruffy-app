<template>
  <div class="mini-wheel">
    <p class="wheel-title">{{ title }}</p>

    <div
      class="wheel-list-container"
      @wheel.passive="false"
      @wheel="onWheel"
      @touchstart="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div
        class="wheel-list"
        :style="{ transform: `translateY(-${selectedIndex * itemHeight}px)` }"
      >
        <div
          v-for="(item, index) in items"
          :key="index"
          class="wheel-item"
          :class="{ selected: index === selectedIndex }"
          :style="{ height: itemHeight + 'px', lineHeight: itemHeight + 'px' }"
          @click="select(index)"
        >
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  title: String,
  items: { type: Array, required: true },
  modelValue: [String, Number],
  itemHeight: { type: Number, default: 40 }
})

const emit = defineEmits(['update:modelValue'])

const selectedIndex = ref(0)

onMounted(() => {
  const idx = props.items.findIndex((i) => i === props.modelValue)
  if (idx >= 0) selectedIndex.value = idx
})

watch(selectedIndex, (idx) => {
  emit('update:modelValue', props.items[idx])
})

const onWheel = (event) => {
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
const select = (idx) => {
  selectedIndex.value = idx
}
</script>

<style scoped>
.mini-wheel {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 4.8rem;
  flex-shrink: 0;
}

.wheel-title {
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 0.5rem;
  text-align: center;
  white-space: nowrap;
}

.wheel-list-container {
  height: 6rem;
  overflow: hidden;
  position: relative;
  width: 100%;
  border-radius: 0.5rem;
  background: #f9f9f9;
}

.wheel-list {
  transition: transform 0.15s ease-out;
}

.wheel-item {
  text-align: center;
  font-size: 1rem;
  color: #999;
  user-select: none;
}

.wheel-item.selected {
  color: #000;
  font-weight: bold;
  font-size: 1.1rem;
}
</style>