<template>
  <div class="popup_wrap">
    <div class="popup_tit">
      <h2>다짐을 만들어 볼까요?</h2>
      <p>다짐을 달성할때마다<br />러피의 산책이 총총총 계속됩니다.</p>
    </div>
    
    <!-- 내부 스크롤 영역 -->
    <div class="popup_inner" ref="popupInner">
      <!-- 다짐명 입력 -->
      <RoutineTitleInput ref="titleRef" />
      
      <!-- 다짐 주기 설정 -->
      <RoutineRepeatSelector ref="repeatRef" />
      
      <!-- 시작일·종료일 설정 -->
      <RoutineDateSelector ref="dateRef" />
      
      <!-- 알람 설정 -->
      <RoutineAlarmSelector ref="alarmRef" />
      
      <!-- 러피 선택 -->
      <RoutineRuffySelector ref="ruffyRef" />
      
      <!-- 산책코스 선택 -->
      <RoutineCourseSelector ref="courseRef" />
      
      <!-- 최소달성횟수 선택 -->
      <RoutineGoalCountSelector ref="goalRef" />
      
      <!-- 중요도 선택 -->
      <RoutinePrioritySelector ref="priorityRef" />
      
      <!-- 코멘트 작성 -->
      <RoutineCommentInput ref="commentRef" />
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

import { db } from '@/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

import RoutineTitleInput from '@/components/routine/RoutineTitleInput.vue'
import RoutineRepeatSelector from '@/components/routine/RoutineRepeatSelector.vue'
import RoutineDateSelector from '@/components/routine/RoutineDateSelector.vue'
import RoutineAlarmSelector from '@/components/routine/RoutineAlarmSelector.vue'
import RoutineRuffySelector from '@/components/routine/RoutineRuffySelector.vue'
import RoutineCourseSelector from '@/components/routine/RoutineCourseSelector.vue'
import RoutineGoalCountSelector from '@/components/routine/RoutineGoalCountSelector.vue'
import RoutinePrioritySelector from '@/components/routine/RoutinePrioritySelector.vue'
import RoutineCommentInput from '@/components/routine/RoutineCommentInput.vue'

const titleRef = ref()
const repeatRef = ref()
const dateRef = ref()
const alarmRef = ref()
const ruffyRef = ref()
const courseRef = ref()
const goalRef = ref()
const priorityRef = ref()
const commentRef = ref()

const today = new Date()
const defaultDate = {
  year: today.getFullYear().toString(),
  month: (today.getMonth() + 1).toString(),
  day: today.getDate().toString()
}

const alarmSelectorRef = ref(null)
const startDate = ref({ ...defaultDate })
const endDate = ref({ ...defaultDate })


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
const saveRoutine = async () => {
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) throw new Error('로그인이 필요합니다.')

    const routine = {
      title: titleRef.value.title,
      repeatType: repeatRef.value.selectedTab,
      repeatDays: repeatRef.value.selectedTab === 'daily' ? [...repeatRef.value.selectedDaily] : [],
      repeatWeeks: repeatRef.value.selectedTab === 'weekly' ? repeatRef.value.selectedWeeklyMain : '',
      repeatWeekDays: repeatRef.value.selectedTab === 'weekly' ? [...repeatRef.value.selectedWeeklyDays] : [],
      repeatMonthDays: repeatRef.value.selectedTab === 'monthly' ? [...repeatRef.value.selectedDates] : [],
      startDate: dateRef.value.startDate,
      endDate: dateRef.value.endDate,
      alarmTime: alarmRef.value?.selectedAlarm ?? null,
      ruffy: ruffyRef.value.ruffy,
      course: courseRef.value.course,
      goalCount: goalRef.value.goalCount,
      priority: priorityRef.value.priority,
      colorIndex: priorityRef.value.selectedColor,
      comment: commentRef.value.comment,
      createdAt: serverTimestamp()
    }

    await addDoc(collection(db, 'users', user.uid, 'routines'), routine)
    unlockScroll()
    emit('close')
  } catch (err) {
    console.error('다짐 저장 실패:', err)
    alert('저장에 실패했습니다.')
  }
}

onMounted(() => {
  lockScroll()
})

onBeforeUnmount(() => {
  unlockScroll()
})
</script>


