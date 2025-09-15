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
import { collection, getDocs, onSnapshot } from 'firebase/firestore'

// ───────────────────────────────────────────
// 기존 스케줄 재설치 헬퍼(유지)
// ───────────────────────────────────────────
const auth = useAuthStore()
const scheduler = useSchedulerStore()

async function fetchAllRoutines(uid) {
  if (!uid) return []
  const snap = await getDocs(collection(db, 'users', uid, 'routines'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

const COOLDOWN_MS = 3000
let running = false
let lastRun = 0

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
  } catch (e) {
    console.warn('[rehydrateAll] failed:', e)
  } finally {
    running = false
  }
}

// ───────────────────────────────────────────
// 실시간 감시(성능 안전장치 포함)
//  - 디바운스(500ms)
//  - 내용 해시가 같으면 스킵
//  - 포그라운드에서만 수행
//  - 3초 쿨다운은 rehydrateAll 내부 공용 사용
// ───────────────────────────────────────────
let unsubRoutines = null
let debTimer = null
let lastHash = ''

function stableSnapshotJSON(list) {
  const pick = (r) => ({
    id: r.id ?? r.routineId ?? '',
    title: r.title ?? '',
    repeatType: r.repeatType ?? '',
    repeatEveryDays: r.repeatEveryDays ?? null,
    repeatWeekDays: Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : [],
    repeatMonthDays: Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : [],
    startDate: r.startDate ?? null,
    endDate: r.endDate ?? null,
    alarmTime: r.alarmTime ?? null,
    rule: r.rule ?? null,
    isPaused: !!r.isPaused,
  })
  return JSON.stringify(list.map(pick).sort((a,b)=>String(a.id).localeCompare(String(b.id))))
}
function djb2(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h)+s.charCodeAt(i); return (h>>>0).toString(16) }

function startRoutinesWatcher(uid) {
  stopRoutinesWatcher()
  if (!uid) return
  const col = collection(db, `users/${uid}/routines`)
  unsubRoutines = onSnapshot(col, (snap) => {
    // 백그라운드 상태면 스킵
    if (document.visibilityState !== 'visible') return

    // 디바운스
    clearTimeout(debTimer)
    debTimer = setTimeout(async () => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const json = stableSnapshotJSON(list)
      const hash = djb2(json)
      if (hash === lastHash) return // 내용 동일 → 스킵

      await scheduler.rehydrateFromRoutines(list)
      lastHash = hash
    }, 500)
  }, (err) => {
    console.warn('[routines watcher] error:', err)
  })
}

function stopRoutinesWatcher() {
  if (unsubRoutines) { try { unsubRoutines() } catch {} }
  unsubRoutines = null
  clearTimeout(debTimer)
  debTimer = null
}

// ───────────────────────────────────────────
// 보조 트리거(기존 유지): 복귀/가시성에서 한 번 더
// ───────────────────────────────────────────
function attachResumeHandlers() {
  const onResume = () => rehydrateAll('resume')
  document.addEventListener('resume', onResume, false)

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
    // 1) 실시간 감시 시작
    startRoutinesWatcher(auth.user.uid)
    // 2) 즉시 1회 재설치(초기 일관성)
    await rehydrateAll('mounted')
  }

  // 로그인 상태 변화 감지: 리스너 재연결 + 1회 재설치
  stopWatch = watch(
    () => auth.user?.uid,
    async (uid, prev) => {
      if (uid === prev) return
      stopRoutinesWatcher()
      if (uid) {
        startRoutinesWatcher(uid)
        await rehydrateAll('auth-change')
      }
    },
    { immediate: false }
  )

  // 복귀/가시성 보조 트리거
  detach = attachResumeHandlers()
})

onBeforeUnmount(() => {
  if (detach) detach()
  if (typeof stopWatch === 'function') stopWatch()
  stopRoutinesWatcher()
})
</script>
