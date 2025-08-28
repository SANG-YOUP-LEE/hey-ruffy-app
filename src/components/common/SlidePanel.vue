<template>
  <teleport to="body">
    <div class="sp" :style="{ zIndex: String(zIndex) }">
      <transition name="sp-fade">
        <div v-if="show && dim" class="sp_overlay" @click="emit('close')"></div>
      </transition>
      <transition name="sp-slide">
        <div v-if="show" class="sp_panel" :style="{ width, height: 'calc(var(--vh, 1vh) * 100)' }">
          <slot />
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  width: { type: String, default: '100%' },
  dim: { type: Boolean, default: true },
  zIndex: { type: [Number, String], default: 1200 }
})

const emit = defineEmits(['close']) // ← 선언
</script>
