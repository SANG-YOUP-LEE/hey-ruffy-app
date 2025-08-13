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
      { id: 'a', label: '기본' },
      { id: 'b', label: '나리꽃' },
      { id: 'c', label: '커피눈물' },
      { id: 'd', label: '노란우체국' }
    ])
  },
  name: { type: String, default: 'card-skin' }
})
defineEmits(['update:modelValue'])
</script>
