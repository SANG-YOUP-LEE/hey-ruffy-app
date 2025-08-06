<template>
  <div class="popup_wrap">
    <div class="popup_tit">
      <h2>{{ isEditMode ? '다짐을 수정할까요?' : '다짐을 만들어 볼까요?' }}</h2>
      <p>
        <template v-if="isEditMode">
          다짐을 변경해보아요.<br />
          러피의 산책을 이어갑니다.
        </template>
        <template v-else>
          다짐을 달성할 때마다<br />
          러피의 산책이 총총총 계속됩니다.
        </template>
      </p>
    </div>

    <div class="popup_inner" ref="popupInner">
      <RoutineTitleInput ref="titleRef" />
      <RoutineRepeatSelector ref="repeatRef" />
      <RoutineDateSelector ref="dateRef" />
      <RoutineAlarmSelector ref="alarmRef" />

      <!-- 산책모드 토글 -->
      <div class="off_walk">
        <label class="checkbox-label">
          <input type="checkbox" v-model="isWalkModeOff" />
          <span class="checkmark"></span>
          <span>{{ isWalkModeOff ? '산책 모드 끄기 해제' : '산책 모드 끄기' }}</span>
        </label>
      </div>

      <!-- 산책 관련 -->
      <div class="walk_group" v-show="!isWalkModeOff">
        <RoutineRuffySelector ref="ruffyRef" />
        <RoutineCourseSelector ref="courseRef" />
        <RoutineGoalCountSelector ref="goalRef" />
      </div>

      <RoutinePrioritySelector ref="priorityRef" />
      <RoutineCommentInput ref="commentRef" />
    </div>

    <div class="popup_btm">
      <button class="b_basic" @click="saveRoutine">다짐 저장하기</button>
    </div>

    <div class="close_btn_wrap">
      <div class="close_btn" @click="closePopup"><span>닫기</span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'

import { db } from '@/firebase'
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
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

const props = defineProps({
  routineToEdit: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const isEditMode = computed(() => props.routineToEdit !== null)
const isWalkModeOff = ref(false)

const titleRef = ref()
const repeatRef = ref()
const dateRef = ref()
const alarmRef = ref()
const ruffyRef = ref()
const courseRef = ref()
const goalRef = ref()
const priorityRef = ref()
const commentRef = ref()

let scrollY = 0

const preventTouchMove = (e) => {
  if (!e.target.closest('.popup_wrap')) {
    e.preventDefault()
  }
}

const lockScroll = () => {
  scrollY = window.scrollY
  document.documentElement.classList.add('no-scroll')
  document.body.classList.add('no-scroll')
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.position = 'fixed'
  window.addEventListener('touchmove', preventTouchMove, { passive: false })
}

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

const closePopup = () => {
  unlockScroll()
  emit('close')
}

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
      ruffy: isWalkModeOff.value ? null : ruffyRef.value.ruffy,
      course: isWalkModeOff.value ? null : courseRef.value.course,
      goalCount: isWalkModeOff.value ? null : goalRef.value.goalCount,
      colorIndex: priorityRef.value.selectedColor,
      comment: commentRef.value.comment,
    }

    if (isEditMode.value && props.routineToEdit?.id) {
      routine.updatedAt = serverTimestamp()
      await updateDoc(doc(db, 'users', user.uid, 'routines', props.routineToEdit.id), routine)
    } else {
      routine.createdAt = serverTimestamp()
      await addDoc(collection(db, 'users', user.uid, 'routines'), routine)
    }

    unlockScroll()
    emit('close')
  } catch (err) {
    console.error('다짐 저장 실패:', err)
    alert('저장에 실패했습니다.')
  }
}

onMounted(() => {
  lockScroll()
  if (props.routineToEdit) {
    titleRef.value.setFromRoutine?.(props.routineToEdit)
    repeatRef.value.setFromRoutine?.(props.routineToEdit)
    dateRef.value.setFromRoutine?.(props.routineToEdit)
    alarmRef.value.setFromRoutine?.(props.routineToEdit)
    ruffyRef.value.setFromRoutine?.(props.routineToEdit)
    courseRef.value.setFromRoutine?.(props.routineToEdit)
    goalRef.value.setFromRoutine?.(props.routineToEdit)
    priorityRef.value.setFromRoutine?.(props.routineToEdit)
    commentRef.value.setFromRoutine?.(props.routineToEdit)
  }
})

onBeforeUnmount(() => {
  unlockScroll()
})
</script>




