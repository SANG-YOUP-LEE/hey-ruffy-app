<template>
  <div
    class="wheel-container"
    ref="container"
    @wheel.prevent="onWheel"
    :style="{ height: containerHeight + 'px' }"
  >
    <div
      class="wheel-list"
      :style="{ transform: `translateY(${translateY}px)` }"
      ref="list"
    >
      <div
        v-for="(item, index) in items"
        :key="index"
        :class="['wheel-item', { selected: index === selectedIndex }]"
        :style="{ height: itemHeight + 'px', lineHeight: itemHeight + 'px' }"
        @click="selectIndex(index)"
      >
        {{ item }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from "vue";

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  initialSelectedIndex: {
    type: Number,
    default: 0,
  },
  itemHeight: {
    type: Number,
    default: 40,
  },
  visibleCount: {
    type: Number,
    default: 3,
  },
});

const emit = defineEmits(["update:selectedIndex"]);

const container = ref(null);
const list = ref(null);

const selectedIndex = ref(props.initialSelectedIndex);
const translateY = ref(0);

const containerHeight = computed(() => props.itemHeight * props.visibleCount);

// 초기 위치 설정
onMounted(() => {
  updateTranslateY();
});

watch(selectedIndex, () => {
  updateTranslateY();
  emit("update:selectedIndex", selectedIndex.value);
});

function updateTranslateY() {
  const centerIndex = Math.floor(props.visibleCount / 2);
  translateY.value = (centerIndex - selectedIndex.value) * props.itemHeight;
}

function onWheel(e) {
  e.preventDefault();
  const delta = e.deltaY;
  if (delta > 0 && selectedIndex.value < props.items.length - 1) {
    selectedIndex.value++;
  } else if (delta < 0 && selectedIndex.value > 0) {
    selectedIndex.value--;
  }
}

function selectIndex(index) {
  if (index >= 0 && index < props.items.length) {
    selectedIndex.value = index;
  }
}
</script>

<style scoped>
.wheel-container {
  overflow: hidden;
  width: 100%;
  user-select: none;
  border-radius: 0.8rem;
  background-color: #eee;
  position: relative;
}

.wheel-list {
  transition: transform 0.3s ease;
}

.wheel-item {
  text-align: center;
  font-weight: 600;
  color: #555;
  cursor: pointer;
}

.wheel-item.selected {
  color: white;
  background-color: #333;
  font-weight: 700;
  border-radius: 0.5rem;
}
</style>
