<template>
  <div class="form_box_g">
    <h3>다짐을 표현할 색상을 선택해주세요.</h3>
    <div class="color_selecter">
      <ColorSelector v-model="colorIndex" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoutineFormStore } from '@/stores/routineForm'
import ColorSelector from '@/components/common/ColorSelector.vue'

const form = useRoutineFormStore()
const colorIndex = computed({
  get: () => form.colorIndex,
  set: v => form.setField('colorIndex', Number.isFinite(+v) ? +v : null)
})
</script>
