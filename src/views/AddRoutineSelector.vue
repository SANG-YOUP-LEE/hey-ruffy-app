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
      <RoutineDateSelector @open-subpopup="handleSubPopupOpen" @close-subpopup="handleSubPopupClose" />
      <!-- 알람 설정 -->
      <RoutineAlarmSelector @open-subpopup="handleSubPopupOpen" @close-subpopup="handleSubPopupClose" />
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
const popupInner = ref(null)
const isSubPopupOpen = ref(false)

/* 팝업 닫기 */
const closePopup = () => {
  emit('close')
}

/* 다짐 저장하기 */
const saveRoutine = () => {
  emit('close')
}

/* body 스크롤 막기 */
const lockScroll = (e) => {
  if (isSubPopupOpen.value) {
    e.preventDefault()
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  document.addEventListener('touchmove', lockScroll, { passive: false })
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  document.removeEventListener('touchmove', lockScroll)
})

/* 작은 팝업 열릴 때 */
const handleSubPopupOpen = () => {
  isSubPopupOpen.value = true
  if (popupInner.value) {
    popupInner.value.style.overflow = 'hidden'
  }
}

/* 작은 팝업 닫힐 때 */
const handleSubPopupClose = () => {
  isSubPopupOpen.value = false
  if (popupInner.value) {
    popupInner.value.style.overflow = 'auto'
  }
}
</script>