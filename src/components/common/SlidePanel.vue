<template>
  <teleport to="body">
    <transition name="sp-slide" appear>
      <div v-if="show" class="sp" :style="{ zIndex: String(zIndex) }">
        <transition name="sp-fade" appear>
          <div v-if="dim" class="sp_overlay" @click="$emit('close')"></div>
        </transition>
        <div class="sp_panel" :style="{ width, height: 'calc(var(--vh, 1vh) * 100)' }">
          <slot />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed } from 'vue'
defineProps({
  show: { type: Boolean, default: false },
  width: { type: String, default: '100%' },
  dim: { type: Boolean, default: true },
  zIndex: { type: [Number, String], default: 1200 }
})
</script>
