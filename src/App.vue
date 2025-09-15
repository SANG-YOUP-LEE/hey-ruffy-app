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

/* ──────────────────────────────────────────
 * iOS 네이티브 브리지 호출 (notify)
 * - purgeAll: 모든 예약/도착 알림 제거 (네이티브에 구현되어 있으면 호출됨)
 *   (네이티브에 아직 없으면 무시되지만, 안전하게 호출해도 문제 없음)
 * ────────────────────────────────────────── */
const iosNotify = (payload) => {
  try { window.webkit?.messageHandlers?.notify?.postMessage(payload) } catch {}
}

/* ──────────────────────────────────────────
 * 중복 실행 방지 (쿨다운)
 * ────────────────────────────────────────── */
const COOLDOWN_MS = 3000
let running = false
let lastRun = 0

/* ──────────────────────────────────────────
 * Firestore 루틴 전체 로드 → 스케줄러 리하이드레이트
 * ────────────────────────────────────────── */
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
    await scheduler.rehydrateFromRoutines(list, auth.user.uid)
    lastRun = Date.now()
    // console.debug('[rehydrateAll]', reason, 'count=', list.length)
  } catch (e) {
    console.warn('[rehydrateAll] failed:', e)
  } finally {
    running = false
  }
}

/* ──────────────────────────────────────────
 * 계정 전환/로그아웃 시: 이전 사용자 로컬 알림/캐시 정리
 *  - 우선 네이티브 purgeAll 호출 (있으면 전량 제거)
 *  - 필요한 경우 여기서 사용자별 캐시 키도 정리 가능
 * ────────────────────────────────────────── */
async function cleanupForPrevUser(prevUid) {
  try {
    // iOS 네이티브 쪽 전체 purge (존재하지 않으면 무시됨)
    iosNotify({ action: 'purgeAll' })

    // (선택) 사용자별 로컬 키 정리 필요 시 여기서 처리
    // ex) localStorage.removeItem(`rfy_last_hydrate_ms__u_${prevUid}`)
    //     localStorage.removeItem(`rfy_last_routines_hash__u_${prevUid}`)
  } catch (e) {
    console.warn('[cleanupForPrevUser] failed:', e)
  }
}

/* ──────────────────────────────────────────
 * 앱 복귀/가시성 변경 시 재하이드레이트
 * ────────────────────────────────────────── */
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
let lastUid = null

onMounted(async () => {
  await auth.initOnce()

  // 로그인 완료 직후 1회
  if (auth.ready && auth.user?.uid) {
    lastUid = auth.user.uid
    await rehydrateAll('mounted')
  }

  // 로그인 상태 변화 감지 (계정 전환/로그아웃/로그인)
  stopWatch = watch(
    () => auth.user?.uid || null,
    async (uid, prev) => {
      // prev가 정확하지 않을 수 있으므로 lastUid로 보정
      const prevUid = lastUid

      // ✅ 계정 전환/로그아웃: 이전 사용자 정리
      if (prevUid && uid !== prevUid) {
        await cleanupForPrevUser(prevUid)
      }

      if (uid) {
        // 새 사용자로 리하이드레이트
        lastUid = uid
        await rehydrateAll('auth-change')
      } else {
        // 완전 로그아웃
        lastUid = null
      }
    },
    { immediate: false }
  )

  // 복귀/가시성 핸들러
  detach = attachResumeHandlers()
})

onBeforeUnmount(() => {
  if (detach) detach()
  if (typeof stopWatch === 'function') stopWatch()
})
</script>
