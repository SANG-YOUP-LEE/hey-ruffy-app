<template>
  <div class="popup_wrap">
    <div class="popup_tit">
      <h2>다짐을 만들어 볼까요?</h2>
      <p>다짐을 달성할때마다<br />러피의 산책이 총총총 계속됩니다.</p>
    </div>

    <!-- 내부 스크롤 영역 -->
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
import { ref, onMounted, onBeforeUnmount } from 'vue'
import RoutineTitleInput from '@/components/routine/RoutineTitleInput.vue'
import RoutineRepeatSelector from '@/components/routine/RoutineRepeatSelector.vue'
import RoutineDateSelector from '@/components/routine/RoutineDateSelector.vue'
import RoutineAlarmSelector from '@/components/routine/RoutineAlarmSelector.vue'
import RoutineRuffySelector from '@/components/routine/RoutineRuffySelector.vue'
import RoutineCourseSelector from '@/components/routine/RoutineCourseSelector.vue'
import RoutineGoalCountSelector from '@/components/routine/RoutineGoalCountSelector.vue'
import RoutinePrioritySelector from '@/components/routine/RoutinePrioritySelector.vue'
import RoutineCommentInput from '@/components/routine/RoutineCommentInput.vue'

const emit = defineEmits(['close'])
let scrollY = 0

// iOS에서 배경 터치 스크롤 차단
const preventTouchMove = (e) => {
  if (!e.target.closest('.popup_wrap')) {
    e.preventDefault()
  }
}

/* 스크롤 잠금 */
const lockScroll = () => {
  scrollY = window.scrollY

  // html, body 모두 차단
  document.documentElement.classList.add('no-scroll')
  document.body.classList.add('no-scroll')

  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.position = 'fixed'

  window.addEventListener('touchmove', preventTouchMove, { passive: false })
}

/* 스크롤 해제 */
const unlockScroll = () => {
  document.documentElement.classList.remove('no-scroll')
  document.body.classList.remove('no-scroll')

  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  document.body.style.overflow = ''

  window.removeEventListener('touchmove', preventTouchMove)
  window.scrollTo(0, scrollY)
}

/* 닫기 버튼 */
const closePopup = () => {
  unlockScroll()
  emit('close')
}

/* 다짐 저장 버튼 */
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

<style>
html.no-scroll,
body.no-scroll {
  overflow: hidden !important;
  height: 100% !important;
  touch-action: none !important;
}
</style>