<template>
  <div class="card-selector custom-radio-group">
    <label
      v-for="opt in options"
      :key="opt.id"
      class="card-item"
      tabindex="0"
      @keydown.enter.prevent="$emit('update:modelValue', opt.id)"
    >
      <div
        class="design"
        :class="{ selected: modelValue === opt.id }"
        @click.stop="$emit('update:modelValue', opt.id)"
      ></div>

      <span class="custom-radio" @click.stop="$emit('update:modelValue', opt.id)">
        <input
          type="radio"
          :name="name"
          :value="opt.id"
          :checked="modelValue === opt.id"
          @change="$emit('update:modelValue', opt.id)"
        />
        <span class="circle"></span>
      </span>

      <span
        class="name"
        :class="{ on: modelValue === opt.id }"
        @click.stop="$emit('update:modelValue', opt.id)"
      >
        {{ opt.label }}
      </span>
    </label>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: {
    type: Array,
    default: () => ([
      { id: 'a', label: '기본카드 A' },
      { id: 'b', label: '기본카드 B' },
      { id: 'c', label: '기본카드 C' },
      { id: 'd', label: '기본카드 D' },
      { id: 'e', label: '기본카드 E' }
    ])
  },
  name: { type: String, default: 'card-skin' }
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.card-selector {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  align-items: start;
}
.card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.design {
  width: 120px;
  height: 72px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: #f6f7fb;
}
.design.selected {
  border-color: #111;
}
.name {
  font-size: 0.92rem;
  line-height: 1.2;
}
.name.on {
  font-weight: 600;
}
@media (max-width: 860px) {
  .card-selector {
    grid-template-columns: repeat(3, 1fr);
  }
  .design {
    width: 100%;
  }
}
@media (max-width: 520px) {
  .card-selector {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
