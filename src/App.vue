<template>
  <div class="app-root safe-area">
    <RouterView />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import { onMounted, onBeforeUnmount } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { initIOSRoutineScheduler } from '@/utils/iosRoutineScheduler'

// iOS 스케줄러 구독 핸들
let stopIOSWatch = null
let unsubAuth = null

function startScheduler(user) {
  // 기존 구독 정리
  if (stopIOSWatch) { stopIOSWatch(); stopIOSWatch = null }

  // 로그인된 유저가 있으면 iOS 스케줄러 시작
  if (user && user.uid) {
    stopIOSWatch = initIOSRoutineScheduler(user.uid)
  }
}

onMounted(() => {
  const auth = getAuth()

  // 앱 부팅 시 현재 사용자 기준으로 시작
  startScheduler(auth.currentUser)

  // 로그인/로그아웃/계정 전환 대응
  unsubAuth = onAuthStateChanged(auth, (user) => {
    startScheduler(user)
  })
})

onBeforeUnmount(() => {
  if (unsubAuth) { unsubAuth(); unsubAuth = null }
  if (stopIOSWatch) { stopIOSWatch(); stopIOSWatch = null }
})
</script>
