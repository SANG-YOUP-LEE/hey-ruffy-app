<template>
  <teleport to="body">
    <div class="sp" :class="{ open: show }" :style="{ zIndex: String(zIndex) }">
      <div v-if="dim" class="sp_overlay" @click="$emit('close')"></div>
      <div class="sp_panel" :style="{ width, height: 'calc(var(--vh, 1vh) * 100)' }">
        <slot />
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  width: { type: String, default: '100%' },
  dim: { type: Boolean, default: false },
  zIndex: { type: [Number, String], default: 1200 }
})
defineEmits(['close'])

const setOpen = v => document.documentElement.classList.toggle('sp-open', v)
watch(() => props.show, v => setOpen(v), { immediate: true })
onBeforeUnmount(() => setOpen(false))
</script>
