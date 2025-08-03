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
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock'
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
const popupInner = ref(null)

/* 닫기 버튼 */
const closePopup = () => {
  if (popupInner.value) enableBodyScroll(popupInner.value)
  emit('close')
}

/* 다짐 저장 버튼 */
const saveRoutine = () => {
  if (popupInner.value) enableBodyScroll(popupInner.value)
  emit('close')
}

/* 큰 팝업 열릴 때 - body 스크롤 차단 */
onMounted(() => {
  if (popupInner.value) {
    disableBodyScroll(popupInner.value, {
      reserveScrollBarGap: true,
      /* 작은 팝업(데이터피커 등) 스크롤 허용 */
      allowTouchMove: (el) => {
        while (el && el !== document.body) {
          if (
            el.classList.contains('popup_inner') ||
            el.classList.contains('date_picker_popup') || 
            el.classList.contains('wheel-container') || 
            el.classList.contains('scrollable')
          ) {
            return true
          }
          el = el.parentElement
        }
        return false
      }
    })
  }
})

/* 닫힐 때 body 스크롤 복원 */
onBeforeUnmount(() => {
  if (popupInner.value) enableBodyScroll(popupInner.value)
  clearAllBodyScrollLocks()
})
</script>