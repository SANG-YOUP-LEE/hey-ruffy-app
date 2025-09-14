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

// Firestore에서 전체 루틴 읽기
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

const auth = useAuthStore()
const scheduler = useSchedulerStore()

async function fetchAllRoutines(uid) {
  if (!uid) return []
  const colRef = collection(db, 'users', uid, 'routines')
  const snap = await getDocs(colRef)
  const list = []
  snap.forEach(d => list.push({ id: d.id, ...d.data() }))
  return list
}

async function rehydrateAll() {
  const uid = auth.user?.uid
  if (!uid) return
  const list = await fetchAllRoutines(uid)
  await scheduler.rehydrateFromRoutines(list)
}

function attachResumeHandlers() {
  // Cordova/Capacitor
  document.addEventListener('resume', rehydrateAll, false)
  // 웹 환경 대비(가려졌다가 다시 보일 때)
  const onVis = () => {
    if (document.visibilityState === 'visible') rehydrateAll()
  }
  document.addEventListener('visibilitychange', onVis, false)
  return () => {
    document.removeEventListener('resume', rehydrateAll, false)
    document.removeEventListener('visibilitychange', onVis, false)
  }
}

let detach = null

onMounted(async () => {
  await auth.initOnce()

  // 로그인 완료 직후 1회 전체 재하이드레이트
  if (auth.ready && auth.user?.uid) {
    await rehydrateAll()
  }

  // 로그인 상태 변화를 감지해서도 전체 재하이드레이트
  watch(
    () => auth.user?.uid,
    async (uid, prev) => {
      if (uid && uid !== prev) await rehydrateAll()
    },
    { immediate: false }
  )

  // 앱 복귀/가시성 변경 시 재하이드레이트
  detach = attachResumeHandlers()
})

onBeforeUnmount(() => {
  if (detach) detach()
})
</script>
