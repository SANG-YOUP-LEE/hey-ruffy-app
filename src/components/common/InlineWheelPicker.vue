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

const selectedIndex = ref(-1)

// 초기 설정
onMounted(() => {
  const initialIndex = props.items.findIndex((item) => item === props.modelValue)
  selectedIndex.value = initialIndex >= 0 ? initialIndex : -1
})

// 외부에서 modelValue가 바뀌었을 때 selectedIndex도 함께 바꿈
watch(() => props.modelValue, (val) => {
  const i = props.items.findIndex((item) => item === val)
  selectedIndex.value = i >= 0 ? i : -1
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
  emit('update:modelValue', props.items[index])
}

// 중앙 정렬 패딩 계산
const paddingOffset = computed(() => {
  return (props.containerHeight - props.itemHeight) / 2
})
</script>
