<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 date">
        <!-- 시작일 -->
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isStartDateOn" />
          <span class="toggle-text" @click="toggleStartDate">시작일 지정</span>
        </div>

        <!-- 종료일 -->
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isEndDateOn" />
          <span class="toggle-text" @click="toggleEndDate">종료일 지정</span>
        </div>
      </div>

      <div v-if="showWarning" class="t_red01">
        먼저 시작일을 지정해 주세요.
      </div>

      <div v-if="formattedDate" class="data_fixed">
        {{ formattedDate }}
        <a href="#none" class="txt" @click.prevent="resetDates">지정일 취소하기</a>
      </div>
    </div>

    <DateTimePickerPopup
      v-if="showDatePopup"
      :mode="popupMode"
      :minDate="popupMode === 'end' ? startDate : {}"
      :modelValue="popupMode === 'start' ? startDate : endDate"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'

const props = defineProps({
  startDate: { type: Object, default: () => ({ year: '', month: '', day: '' }) },
  endDate: { type: Object, default: () => ({ year: '', month: '', day: '' }) }
})
const emit = defineEmits(['update:startDate', 'update:endDate'])

const isStartDateOn = ref(false)
const isEndDateOn = ref(false)
const showWarning = ref(false)
const showDatePopup = ref(false)
const popupMode = ref('start')

const startDate = ref({ ...props.startDate })
const endDate = ref({ ...props.endDate })

// 프로그램적 세팅 가드 + 1회 억제 플래그
const isProgrammatic = ref(false)
const suppressStartOnce = ref(false)
const suppressEndOnce = ref(false)
const withSilent = (fn) => { isProgrammatic.value = true; try { fn() } finally { isProgrammatic.value = false } }

let scrollY = 0
let activePopup = null
const preventTouchMove = (e) => { if (activePopup && !e.target.closest(activePopup)) e.preventDefault() }
const lockScroll = (selector) => {
  activePopup = selector
  scrollY = window.scrollY
  document.documentElement.classList.add('no-scroll')
  document.body.classList.add('no-scroll')
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.width = '100%'
  window.addEventListener('touchmove', preventTouchMove, { passive: false })
}
const unlockScroll = () => {
  activePopup = null
  document.documentElement.classList.remove('no-scroll')
  document.body.classList.remove('no-scroll')
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.width = ''
  window.removeEventListener('touchmove', preventTouchMove)
  window.scrollTo(0, scrollY)
}

const getTodayObject = () => {
  const d = new Date()
  return { year: String(d.getFullYear()), month: String(d.getMonth() + 1), day: String(d.getDate()) }
}

const toggleStartDate = () => { isStartDateOn.value = !isStartDateOn.value }
const toggleEndDate = () => { isEndDateOn.value = !isEndDateOn.value }

watch(isStartDateOn, (val) => {
  // 프로그램적 변경이거나, 다음 1회 억제일 때는 팝업 열지 않음
  if (isProgrammatic.value || suppressStartOnce.value) { suppressStartOnce.value = false; return }
  if (val) {
    popupMode.value = 'start'
    if (!startDate.value.year) startDate.value = getTodayObject()
    showWarning.value = false
    showDatePopup.value = true
    lockScroll('.com_popup_wrap .popup_inner')
  } else {
    startDate.value = { year: '', month: '', day: '' }
    // 시작일 OFF면 종료일도 함께 OFF
    withSilent(() => { isEndDateOn.value = false })
    endDate.value = { year: '', month: '', day: '' }
  }
})

watch(isEndDateOn, (val) => {
  if (isProgrammatic.value || suppressEndOnce.value) { suppressEndOnce.value = false; return }
  if (val) {
    if (!startDate.value.year) {
      showWarning.value = true
      withSilent(() => { isEndDateOn.value = false })
    } else {
      popupMode.value = 'end'
      if (!endDate.value.year) endDate.value = { ...startDate.value }
      showWarning.value = false
      showDatePopup.value = true
      lockScroll('.com_popup_wrap .popup_inner')
    }
  } else {
    endDate.value = { year: '', month: '', day: '' }
  }
})

const handleConfirm = (val) => {
  if (popupMode.value === 'start') {
    startDate.value = val
    withSilent(() => { isStartDateOn.value = true })
    emit('update:startDate', startDate.value)
  } else {
    endDate.value = val
    withSilent(() => { isEndDateOn.value = true })
    emit('update:endDate', endDate.value)
  }
  showDatePopup.value = false
  unlockScroll()
}

const handleCancel = () => {
  if (popupMode.value === 'start') {
    startDate.value = { year: '', month: '', day: '' }
    withSilent(() => { isStartDateOn.value = false })
    emit('update:startDate', startDate.value)
  } else {
    endDate.value = { year: '', month: '', day: '' }
    withSilent(() => { isEndDateOn.value = false })
    emit('update:endDate', endDate.value)
  }
  showDatePopup.value = false
  unlockScroll()
}

const resetDates = () => {
  withSilent(() => {
    startDate.value = { year: '', month: '', day: '' }
    endDate.value = { year: '', month: '', day: '' }
    isStartDateOn.value = false
    isEndDateOn.value = false
  })
  emit('update:startDate', startDate.value)
  emit('update:endDate', endDate.value)
}

const formattedDate = computed(() => {
  if (!startDate.value.year) return ''
  const s = startDate.value, e = endDate.value
  const startStr = `${s.year}년 ${s.month}월 ${s.day}일`
  const endStr = e.year ? ` ~ ${e.year}년 ${e.month}월 ${e.day}일` : ''
  return startStr + endStr
})

onBeforeUnmount(unlockScroll)

// 편집 주입: 토글 재-emit로 인한 자동 팝업 방지
const setFromRoutine = (routine) => {
  withSilent(() => {
    if (routine?.startDate) {
      startDate.value = routine.startDate
      isStartDateOn.value = true
    } else {
      startDate.value = { year: '', month: '', day: '' }
      isStartDateOn.value = false
    }
    if (routine?.endDate) {
      endDate.value = routine.endDate
      isEndDateOn.value = true
    } else {
      endDate.value = { year: '', month: '', day: '' }
      isEndDateOn.value = false
    }
  })
  // 👉 ToggleSwitch가 같은 값을 다시 emit해도 "다음 1회"는 무시
  suppressStartOnce.value = true
  suppressEndOnce.value = true
}

// 신규 생성 초기화
const reset = () => { resetDates() }

// 외부 강제 닫기
const closeAll = () => { showDatePopup.value = false; unlockScroll() }

defineExpose({
  startDate,
  endDate,
  isStartDateOn,
  isEndDateOn,
  setFromRoutine,
  reset,
  closeAll
})
</script>
