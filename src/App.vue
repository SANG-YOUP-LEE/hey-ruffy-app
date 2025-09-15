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

const auth = useAuthStore()
const scheduler = useSchedulerStore()

/* ── 공용: 한 번 재설치 ───────────────────────────────── */
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
    console.log('[rehydrateAll]', reason, 'count=', list.length)
    await scheduler.rehydrateFromRoutines(list)
    lastRun = Date.now()
  } catch (e) {
    console.warn('[rehydrateAll] failed:', e)
  } finally {
    running = false
  }
}

/* ── 실시간 감시(메타데이터 포함, 가드 완화) ───────────── */
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
  return JSON.stringify(
    list.map(pick).sort((a,b)=>String(a.id).localeCompare(String(b.id)))
  )
}
function djb2(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h)+s.charCodeAt(i); return (h>>>0).toString(16) }

function startRoutinesWatcher(uid) {
  stopRoutinesWatcher()
  if (!uid) return
  const col = collection(db, `users/${uid}/routines`)

  // 메타데이터 변경도 수신해서 최초 로컬캐시→서버 동기 흐름을 모두 잡음
  unsubRoutines = onSnapshot(
    col,
    { includeMetadataChanges: true },
    (snap) => {
      // 디바운스(짧게)
      clearTimeout(debTimer)
      debTimer = setTimeout(async () => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const json = stableSnapshotJSON(list)
        const hash = djb2(json)

        // 로깅: 문제 재현 시 콘솔로 상태 확인
        const meta = snap.metadata || {}
        console.log(
          '[routines watcher] size=', list.length,
          'fromCache=', !!meta.fromCache,
          'hasPendingWrites=', !!meta.hasPendingWrites,
          'hash=', hash, 'prevHash=', lastHash
        )

        if (hash === lastHash) return
        lastHash = hash

        try {
          await scheduler.rehydrateFromRoutines(list)
          console.log('[routines watcher] rehydrated.')
        } catch (e) {
          console.warn('[routines watcher] rehydrate failed:', e)
        }
      }, 300)
    },
    (err) => {
      console.warn('[routines watcher] error:', err)
    }
  )
}

function stopRoutinesWatcher() {
  if (unsubRoutines) { try { unsubRoutines() } catch {} }
  unsubRoutines = null
  clearTimeout(debTimer)
  debTimer = null
}

/* ── 보조 트리거(유지) ───────────────────────────────── */
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

  // 디버그용 수동 트리거 노출
  window.__rehydrate = (tag='manual') => rehydrateAll(tag)

  if (auth.ready && auth.user?.uid) {
    startRoutinesWatcher(auth.user.uid)  // ← 먼저 연결
    await rehydrateAll('mounted')        // ← 즉시 한 번
  }

  // 로그인 상태 변화 → 리스너 재연결 + 즉시 한 번
  stopWatch = watch(
    () => auth.user?.uid,
    async (uid, prev) => {
      if (uid === prev) return
      stopRoutinesWatcher()
      lastHash = '' // 사용자 바뀌면 해시 리셋
      if (uid) {
        startRoutinesWatcher(uid)
        await rehydrateAll('auth-change')
      }
    },
    { immediate: false }
  )

  // 복귀/가시성(백업 트리거)
  detach = attachResumeHandlers()
})

onBeforeUnmount(() => {
  if (detach) detach()
  if (typeof stopWatch === 'function') stopWatch()
  stopRoutinesWatcher()
})
</script>
