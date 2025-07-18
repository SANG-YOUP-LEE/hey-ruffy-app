<template>
  <div class="inline-wheel-wrapper">
    <div class="inline-wheel-list" ref="listRef" @scroll="onScroll">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="inline-wheel-item"
        :class="{ selected: index === selectedIndex }"
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
  modelValue: [String, Number]
})

const emit = defineEmits(['update:modelValue'])

const listRef = ref(null)
const selectedIndex = ref(-1) // ✅ -1부터 시작 (선택 없음)
const itemHeight = 40 // px

onMounted(() => {
  const index = props.items.findIndex((i) => i === props.modelValue)
  if (index >= 0) {
    selectedIndex.value = index
    nextTick(() => {
      listRef.value.scrollTop = index * itemHeight
    })
  } else {
    selectedIndex.value = -1
  }
})

watch(() => props.modelValue, (val) => {
  const i = props.items.findIndex((item) => item === val)
  if (i >= 0) {
    selectedIndex.value = i
    listRef.value.scrollTop = i * itemHeight
  } else {
    selectedIndex.value = -1
  }
})

const onScroll = () => {
  const scrollTop = listRef.value.scrollTop
  const index = Math.round(scrollTop / itemHeight)

  if (index !== selectedIndex.value && props.items[index] !== undefined) {
    selectedIndex.value = index
    emit('update:modelValue', props.items[index])
  }
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
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  padding-top: 40px;
  padding-bottom: 40px;
}

.inline-wheel-item {
  height: 40px;
  line-height: 40px;
  text-align: center;
  scroll-snap-align: center;
  font-size: 1rem;
  color: #666;
}

.inline-wheel-item.selected {
  color: #000;
  font-weight: bold;
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
