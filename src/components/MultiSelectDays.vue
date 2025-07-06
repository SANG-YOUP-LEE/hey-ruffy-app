<template>
  <div class="multi-select-days">
    <span class="all" :class="{ on: isAllSelected }" @click="toggleAll"
      ><strong>매일</strong></span
    >
    <span
      v-for="day in items"
      :key="day"
      :class="{ on: selected.includes(day) }"
      @click="toggle(day)"
    >
      {{ day }}
    </span>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue"]);

const selected = ref([...props.modelValue]);

watch(
  () => props.modelValue,
  (val) => {
    selected.value = [...val];
  },
);

const isAllSelected = computed(
  () => selected.value.length === props.items.length,
);

function toggle(item) {
  const idx = selected.value.indexOf(item);
  if (idx > -1) {
    selected.value.splice(idx, 1);
  } else {
    selected.value.push(item);
  }
  emit("update:modelValue", selected.value);
}

function toggleAll() {
  if (isAllSelected.value) {
    selected.value = [];
  } else {
    selected.value = [...props.items];
  }
  emit("update:modelValue", selected.value);
}
</script>

<style scoped>
.multi-select-days span {
  display: inline-block;
  width: 2.2rem;
  height: 2.2rem;
  line-height: 2.2rem;
  border-radius: 50%;
  border: 0.1rem solid #eee;
  font-size: 0.9rem;
  text-align: center;
  margin-right: 0.3rem;
  user-select: none;
  cursor: pointer;
  color: #fa606f;
  background: white;
  transition: all 0.2s ease;
}

.multi-select-days span.all {
  font-weight: bold;
  color: #fa606f;
}

.multi-select-days span.on {
  background-color: #fa606f;
  color: white;
  border-color: #fa606f;
}
</style>
