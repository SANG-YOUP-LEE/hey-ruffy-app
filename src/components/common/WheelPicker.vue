<template>
  <div class="wheel-overlay" @wheel.prevent="onWheel">
    <div class="wheel-popup">
      <p class="wheel-title">{{ title }}</p>

      <div
        class="wheel-list-container"
        @wheel.passive="false"
        @wheel="onWheel"
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

      <div class="wheel-actions">
        <button @click="$emit('close')">닫기</button>
        <button @click="confirm">확인</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

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
})

const onWheel = (event) => {
  event.preventDefault()
  if (event.deltaY > 0 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++
  } else if (event.deltaY < 0 && selectedIndex.value > 0) {
    selectedIndex.value--
  }
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
</script>
