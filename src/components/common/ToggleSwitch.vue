<template>
  <div class="toggle-container">
    <div
      class="toggle-switch"
      :class="{ on: modelValue }"
      role="switch"
      :aria-checked="modelValue ? 'true' : 'false'"
      :aria-label="label || 'toggle'"
      tabindex="0"
      @click="toggle"
      @keydown.space.prevent="toggle"
      @keydown.enter.prevent="toggle"
    >
      <div class="toggle-circle"></div>
    </div>
    <span class="toggle-label" v-if="label">{{ label }}</span>
  </div>
</template>

<script setup>
const props = defineProps({
  label: { type: String, default: '' },     // required 해제
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

function toggle() {
  emit('update:modelValue', !props.modelValue)
}
</script>