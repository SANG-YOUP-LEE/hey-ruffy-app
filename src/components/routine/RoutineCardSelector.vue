<template>
  <div class="form_box_g">
    <h3>다짐카드 디자인을 선택해주세요.</h3>
    <CardSelector v-model="cardSkin" :unique-name="uniqueName || 'routine-card'" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoutineFormStore } from '@/stores/routineForm'
import CardSelector from '@/components/common/CardSelector.vue'

const props = defineProps({
  uniqueName: { type: String, default: '' }
})

const normalize = (v) => {
  const m = String(v || '').match(/(\d{1,2})/)
  if (!m) return ''
  return `option${m[1].padStart(2,'0')}`
}

const form = useRoutineFormStore()
const cardSkin = computed({
  get: () => form.cardSkin,
  set: v => form.setField('cardSkin', normalize(v))
})
</script>
