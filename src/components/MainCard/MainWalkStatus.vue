<template>
  <div class="walk-status-popup" :class="computedClass">
    <div class="info">
      <div class="row"><span class="lbl">러피</span><span class="val">{{ ruffy }}</span></div>
      <div class="row"><span class="lbl">코스</span><span class="val">{{ course }}</span></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  ruffy: { type: String, default: '' },
  course: { type: String, default: '' }
})
const computedClass = computed(() => [props.ruffy, props.course].filter(Boolean).join(' '))
</script>
