<template>
  <div class="form_box_g">
    <h3>다짐카드 디자인을 선택해주세요.</h3>
    <CardSelector v-model="proxy" :unique-name="uniqueName || 'routine-card'" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CardSelector from '@/components/common/CardSelector.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  uniqueName: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const normalize = (v) => {
  const m = String(v || '').match(/(\d{1,2})/)
  return m ? `option${m[1].padStart(2,'0')}` : ''
}

const proxy = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', normalize(v))
})
</script>
