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

      <!-- ✅ 키 리마운트 제거 -->
      <RoutineDateSelector ref="dateRef" />
      <RoutineAlarmSelector ref="alarmRef" />

      <div v-if="errorMessage" class="warn-message t_red01">{{ errorMessage }}</div>

      <div class="off_walk">
        <label class="checkbox-label">
          <input type="checkbox" v-model="isWalkModeOff" />
          <span class="checkmark"></span>
          <span>{{ isWalkModeOff ? '다시 산책하고 싶다면 해제해주세요. ' : '산책 없이 다짐하고 싶어요.' }}</span>
        </label>
      </div>

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
import { ref, onMounted, computed, onBeforeUnmount, nextTick, getCurrentInstance } from 'vue'


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


// ── 디버그: 팝업이 몇 번 렌더되는지 추적
defineOptions({ name: 'AddRoutineSelector' })
const __arsInst = getCurrentInstance()
onMounted(() => {
  console.log('[ARS] mounted uid=', __arsInst?.uid, ' parent=', __arsInst?.parent?.type?.name)
})

const props = defineProps({
  routineToEdit: { type: Object, default: null }
})

const emit = defineEmits(['close','save'])

const isEditMode = computed(() => props.routineToEdit !== null)
const isWalkModeOff = ref(false)
const errorMessage = ref('')

// ✅ 키 리마운트용 상태 제거
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
  if (!e.target.closest('.popup_wrap')) e.preventDefault()
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

const validateRoutine = () => {
  if (!titleRef.value?.title || titleRef.value.title.trim() === '') {
    errorMessage.value = '다짐 제목을 입력해주세요.'
    return false
  }
  if (!repeatRef.value?.selectedTab) {
    errorMessage.value = '반복 주기를 선택해주세요.'
    return false
  }
  const selectedTab = repeatRef.value.selectedTab
  if (selectedTab === 'daily') {
    if (!repeatRef.value.selectedDaily || repeatRef.value.selectedDaily.length === 0) {
      errorMessage.value = '일간 반복의 최소 횟수를 선택해주세요.'
      return false
    }
  }
  if (selectedTab === 'weekly') {
    if (!repeatRef.value.selectedWeeklyMain) {
      errorMessage.value = '주간 반복 주기를 선택해주세요.'
      return false
    }
    if (!repeatRef.value.selectedWeeklyDays || repeatRef.value.selectedWeeklyDays.length === 0) {
      errorMessage.value = '요일을 하나 이상 선택해주세요.'
      return false
    }
  }
  if (selectedTab === 'monthly') {
    if (!repeatRef.value.selectedDates || repeatRef.value.selectedDates.length === 0) {
      errorMessage.value = '반복할 날짜를 선택해주세요.'
      return false
    }
  }
  const selectedColor = priorityRef.value?.selectedColor ?? null
  if (selectedColor === null) {
    errorMessage.value = '다짐 색상을 선택해주세요.'
    return false
  }
  errorMessage.value = ''
  return true
}

const saveRoutine = async () => {
  errorMessage.value = ''
  if (!validateRoutine()) return
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) throw new Error('로그인이 필요합니다.')

    const safeAlarm = (alarmRef.value && alarmRef.value.isAlarmOn === false)
      ? null
      : (alarmRef.value?.selectedAlarm ?? null)
    const safeEndDate = (dateRef.value && dateRef.value.isEndDateOn === false /* hasEndDate -> isEndDateOn 으로 노출됐음 */
      ? null
      : (dateRef.value?.endDate ?? null))

    const routine = {
      title: titleRef.value.title,
      repeatType: repeatRef.value.selectedTab,
      repeatDays: repeatRef.value.selectedTab === 'daily' ? [...repeatRef.value.selectedDaily] : [],
      repeatWeeks: repeatRef.value.selectedTab === 'weekly' ? repeatRef.value.selectedWeeklyMain : '',
      repeatWeekDays: repeatRef.value.selectedTab === 'weekly' ? [...repeatRef.value.selectedWeeklyDays] : [],
      repeatMonthDays: repeatRef.value.selectedTab === 'monthly' ? [...repeatRef.value.selectedDates] : [],
      startDate: dateRef.value.startDate,
      endDate: safeEndDate,
      alarmTime: safeAlarm,
      ruffy: isWalkModeOff.value ? null : ruffyRef.value.ruffy,
      course: isWalkModeOff.value ? null : courseRef.value.course,
      goalCount: isWalkModeOff.value ? null : goalRef.value.goalCount,
      colorIndex: priorityRef.value.selectedColor,
      comment: commentRef.value.comment
    }

    if (isEditMode.value && props.routineToEdit?.id) {
      routine.updatedAt = serverTimestamp()
      await updateDoc(doc(db, 'users', user.uid, 'routines', props.routineToEdit.id), routine)
      emit('save', { id: props.routineToEdit.id, ...routine })
    } else {
      routine.createdAt = serverTimestamp()
      const colRef = collection(db, 'users', user.uid, 'routines')
      const docRef = await addDoc(colRef, routine)
      emit('save', { id: docRef.id, ...routine })
    }

    unlockScroll()
    emit('close')
  } catch (err) {
    console.error('다짐 저장 실패:', err)
    alert('저장에 실패했습니다.')
  }
}

// 신규 생성 초기화
const hardResetDateAndAlarm = () => {
  dateRef.value?.reset?.()
  alarmRef.value?.reset?.()
}

// 편집 모드 세팅
const applyFromRoutine = () => {
  titleRef.value?.setFromRoutine?.(props.routineToEdit)
  repeatRef.value?.setFromRoutine?.(props.routineToEdit)
  dateRef.value?.setFromRoutine?.(props.routineToEdit)
  alarmRef.value?.setFromRoutine?.(props.routineToEdit)
  ruffyRef.value?.setFromRoutine?.(props.routineToEdit)
  courseRef.value?.setFromRoutine?.(props.routineToEdit)
  goalRef.value?.setFromRoutine?.(props.routineToEdit)
  priorityRef.value?.setFromRoutine?.(props.routineToEdit)
  commentRef.value?.setFromRoutine?.(props.routineToEdit)
}

onMounted(() => {
  lockScroll()

  // ✅ 키 바꾸지 말고, 모드별로 메서드 호출만
  nextTick(() => {
    if (props.routineToEdit) {
      applyFromRoutine()
    } else {
      hardResetDateAndAlarm()
    }
  })
})

onBeforeUnmount(() => {
  unlockScroll()
})
</script>
