<template>
  <div class="toggle-container">
    <div 
      class="toggle-switch" 
      :class="{ on: modelValue }" 
      @click="$emit('update:modelValue', !modelValue)"
    >
      <div class="toggle-circle"></div>
    </div>
    <span class="toggle-label">{{ label }}</span>
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})
defineEmits(['update:modelValue'])
</script>
