<template>
  <div class="wheel-overlay">
    <div class="wheel-popup">
      <button class="close_btn" @click="close"><span>팝업 닫기</span></button>
      <h2>{{ title }}</h2>

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

      <button class="pop_btm" @click="confirm">확인</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: String,
  items: {
    type: Array,
    required: true
  },
  modelValue: [String, Number],
  itemHeight: {
    type: Number,
    default: 40
  }
})

const emit = defineEmits(['update:modelValue', 'close', 'confirm'])

const selectedIndex = ref(0)

onMounted(() => {
  const initialIndex = props.items.findIndex(
    (item) => item === props.modelValue
  )
  if (initialIndex >= 0) selectedIndex.value = initialIndex

  document.body.classList.add('popup-open')
  document.body.addEventListener('touchmove', preventTouch, { passive: false })
})

onUnmounted(() => {
  document.body.classList.remove('popup-open')
  document.body.removeEventListener('touchmove', preventTouch)
})

const preventTouch = (e) => {
  e.preventDefault()
}

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

const onTouchEnd = () => {
  // Nothing for now
}

const select = (index) => {
  selectedIndex.value = index
}

const confirm = () => {
  const selectedItem = props.items[selectedIndex.value]
  emit('update:modelValue', selectedItem)
  emit('confirm', selectedItem)
  emit('close')
}

const close = () => {
  emit('close')
}
</script>
