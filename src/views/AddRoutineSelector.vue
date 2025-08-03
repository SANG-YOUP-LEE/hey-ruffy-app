<template>
  <div class="popup_wrap">
    <div class="popup_tit">
      <h2>다짐을 만들어 볼까요?</h2>
      <p>다짐을 달성할때마다<br />러피의 산책이 총총총 계속됩니다.</p>
    </div>

    <div class="popup_inner" ref="popupInner">
      <!-- 다짐명 입력 -->
      <RoutineTitleInput />
      <!-- 다짐 주기 설정 -->
      <RoutineRepeatSelector />
      <!-- 시작일·종료일 설정 -->
      <RoutineDateSelector />
      <!-- 알람 설정 -->
      <RoutineAlarmSelector />
      <!-- 러피 선택 -->
      <RoutineRuffySelector />
      <!-- 산책코스 선택 -->
      <RoutineCourseSelector />
      <!-- 최소달성횟수 선택 -->
      <RoutineGoalCountSelector />
      <!-- 중요도 선택 -->
      <RoutinePrioritySelector />
      <!-- 코멘트 작성 -->
      <RoutineCommentInput />
    </div>

    <div class="popup_btm">
      <button class="b_basic" @click="saveRoutine">다짐 저장하기</button>
    </div>

    <!-- 닫기 버튼 -->
    <div class="close_btn_wrap">
      <div class="close_btn" @click="closePopup"><span>닫기</span></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['close'])
let scrollY = 0

const preventScroll = (e) => {
  // 팝업 영역 외부 터치 시 스크롤 차단
  if (!e.target.closest('.popup_wrap')) {
    e.preventDefault()
  }
}

/* 스크롤 잠금 */
const lockScroll = () => {
  scrollY = window.scrollY

  // iOS 크롬 대응
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.overflow = 'hidden'
  document.body.style.touchAction = 'none'
  document.documentElement.style.overflow = 'hidden'
  document.documentElement.style.touchAction = 'none'

  // iOS 크롬 스크롤 완전 차단
  window.addEventListener('touchmove', preventScroll, { passive: false })
  window.addEventListener('wheel', preventScroll, { passive: false })
}

/* 스크롤 해제 */
const unlockScroll = () => {
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  document.body.style.overflow = ''
  document.body.style.touchAction = ''
  document.documentElement.style.overflow = ''
  document.documentElement.style.touchAction = ''

  window.removeEventListener('touchmove', preventScroll)
  window.removeEventListener('wheel', preventScroll)

  window.scrollTo(0, scrollY)
}

const closePopup = () => {
  unlockScroll()
  emit('close')
}

const saveRoutine = () => {
  unlockScroll()
  emit('close')
}

onMounted(() => {
  lockScroll()
})

onBeforeUnmount(() => {
  unlockScroll()
})
</script>