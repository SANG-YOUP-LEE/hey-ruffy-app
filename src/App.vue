<template>
  <div class="app-root safe-area">
    <RouterView v-if="auth.ready" />
    <GlobalConfirm />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSchedulerStore } from '@/stores/scheduler'
import GlobalConfirm from '@/components/common/GlobalConfirm.vue'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

const auth = useAuthStore()
const scheduler = useSchedulerStore()

/* ── 중복 실행 방지 ───────────────────────────────────── */
const COOLDOWN_MS = 3000
let running = false
let lastRun = 0

async function fetchAllRoutines(uid) {
  if (!uid) return []
  const snap = await getDocs(collection(db, 'users', uid, 'routines'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function rehydrateAll(reason = 'ui') {
  if (running) return
  const now = Date.now()
  if (now - lastRun < COOLDOWN_MS) return

  const uid = auth.user?.uid
  if (!uid) return

  running = true
  try {
    const list = await fetchAllRoutines(uid)
    await scheduler.rehydrateFromRoutines(list)
    lastRun = Date.now()
    // console.debug('[rehydrateAll]', reason, 'count=', list.length)
  } catch (e) {
    console.warn('[rehydrateAll] failed:', e)
  } finally {
    running = false
  }
}

/* ── 앱 복귀/가시성 변경 시 재하이드레이트 ───────────── */
function attachResumeHandlers() {
  // Cordova/Capacitor
  const onResume = () => rehydrateAll('resume')
  document.addEventListener('resume', onResume, false)

  // 웹뷰 가리기/보이기
  const onVis = () => {
    if (document.visibilityState === 'visible') rehydrateAll('visibility')
  }
  document.addEventListener('visibilitychange', onVis, false)

  return () => {
    document.removeEventListener('resume', onResume, false)
    document.removeEventListener('visibilitychange', onVis, false)
  }
}

let detach = null
let stopWatch = null

onMounted(async () => {
  await auth.initOnce()

  // 로그인 완료 직후 1회
  if (auth.ready && auth.user?.uid) {
    await rehydrateAll('mounted')
  }

  // 로그인 상태 변화 감지
  stopWatch = watch(
    () => auth.user?.uid,
    async (uid, prev) => {
      if (uid && uid !== prev) await rehydrateAll('auth-change')
    },
    { immediate: false }
  )

  // 복귀/가시성
  detach = attachResumeHandlers()
})

onBeforeUnmount(() => {
  if (detach) detach()
  if (typeof stopWatch === 'function') stopWatch()
})
</script>
