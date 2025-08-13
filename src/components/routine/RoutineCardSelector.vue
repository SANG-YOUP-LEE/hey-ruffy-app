<template>
  <div class="form_box_g">
    <h3>다짐카드 디자인을 선택해주세요.</h3>
    <CardSelector v-model="localValue" :unique-name="uniqueName || 'routine-card'" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import CardSelector from '@/components/common/CardSelector.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  uniqueName: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const normalize = (v) => {
  const m = String(v || '').match(/(\d+)/)
  if (!m) return 'option01'
  return `option${m[1].padStart(2,'0')}`
}

const localValue = ref(normalize(props.modelValue))

watch(() => props.modelValue, (v) => {
  const n = normalize(v)
  if (n !== localValue.value) localValue.value = n
})

watch(localValue, (v) => {
  const n = normalize(v)
  if (n !== props.modelValue) emit('update:modelValue', n)
})

const setFromRoutine = (routine) => {
  localValue.value = normalize(routine?.cardSkin)
}

defineExpose({
  cardSkin: localValue,
  setFromRoutine
})
</script>
