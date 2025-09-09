<template>
  <div class="app-root safe-area">
    <RouterView v-if="auth.ready" />
    <GlobalConfirm />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import GlobalConfirm from '@/components/common/GlobalConfirm.vue'

// ✅ initIOSRoutineScheduler 의존 제거 (정의되지 않아 에러 발생하던 부분 삭제)
const auth = useAuthStore()

onMounted(async () => {
  await auth.initOnce()
  // iOS 스케줄러 관련 호출은 제거
})
</script>
