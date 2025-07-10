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
        :style="{
          transform: `translateY(-${selectedIndex * itemHeight}px)`,
          paddingTop: `${(containerHeight - itemHeight) / 2}px`,
          paddingBottom: `${(containerHeight - itemHeight) / 2}px`
        }"
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
const containerHeight = 120 // itemHeight * 3 기준

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
