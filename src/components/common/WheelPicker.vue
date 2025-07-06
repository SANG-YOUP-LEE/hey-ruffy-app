<template>
  <div class="wheel-overlay">
    <div class="wheel-popup">
      <p class="wheel-title">{{ title }}</p>

      <div class="wheel-list-container" @wheel.prevent="onWheel">
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
import { ref, watch, computed, onMounted } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  selected: {
    type: [String, Number],
    default: null
  },
  title: {
    type: String,
    default: '항목 선택'
  }
})

const emit = defineEmits(['close', 'update:selected'])

const itemHeight = 40
const selectedIndex = ref(0)

const onWheel = (e) => {
  if (e.deltaY > 0 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++
  } else if (e.deltaY < 0 && selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

const confirm = () => {
  emit('update:selected', props.items[selectedIndex.value])
  emit('close')
}

const select = (index) => {
  selectedIndex.value = index
}

watch(
  () => props.selected,
  (val) => {
    const idx = props.items.indexOf(val)
    if (idx !== -1) selectedIndex.value = idx
  },
  { immediate: true }
)
</script>
