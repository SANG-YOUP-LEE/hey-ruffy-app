<template>
  <div class="app-root safe-area">
    <RouterView v-if="auth.ready" />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { initIOSRoutineScheduler } from '@/utils/iosRoutineScheduler'

let stopIOSWatch = null
let unwatchAuth = null
const auth = useAuthStore()

function startScheduler(user) {
  if (stopIOSWatch) { stopIOSWatch(); stopIOSWatch = null }
  if (user && user.uid) stopIOSWatch = initIOSRoutineScheduler(user.uid)
}

onMounted(async () => {
  await auth.initOnce()
  startScheduler(auth.user)
  unwatchAuth = watch(() => auth.user, (u) => startScheduler(u))
})

onBeforeUnmount(() => {
  if (unwatchAuth) { unwatchAuth(); unwatchAuth = null }
  if (stopIOSWatch) { stopIOSWatch(); stopIOSWatch = null }
})
</script>