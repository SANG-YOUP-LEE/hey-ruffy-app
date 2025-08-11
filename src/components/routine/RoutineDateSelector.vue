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
import { ref, watch, computed, onBeforeUnmount, nextTick } from 'vue'
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

// 🔒 자동 오픈 방지용 가드
const suppressAutoOpen = ref(false)

let scrollY = 0
let activePopup = null

const preventTouchMove = (e) => {
  if (activePopup && !e.target.closest(activePopup)) {
    e.preventDefault()
  }
}

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
  const today = new Date()
  return {
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
    day: String(today.getDate())
  }
}

const toggleStartDate = () => {
  isStartDateOn.value = !isStartDateOn.value
}
const toggleEndDate = () => {
  isEndDateOn.value = !isEndDateOn.value
}

watch(isStartDateOn, (val) => {
  if (suppressAutoOpen.value) return  // ✅ 값 주입 중엔 팝업 금지
  if (val) {
    popupMode.value = 'start'
    if (!startDate.value.year) {
      startDate.value = getTodayObject()
    }
    showWarning.value = false
    showDatePopup.value = true
    lockScroll('.com_popup_wrap .popup_inner')
  } else {
    startDate.value = { year: '', month: '', day: '' }
    isEndDateOn.value = false
    endDate.value = { year: '', month: '', day: '' }
  }
})

watch(isEndDateOn, (val) => {
  if (suppressAutoOpen.value) return  // ✅ 값 주입 중엔 팝업 금지
  if (val) {
    if (!startDate.value.year) {
      showWarning.value = true
      isEndDateOn.value = false
    } else {
      popupMode.value = 'end'
      if (!endDate.value.year) {
        endDate.value = { ...startDate.value }
      }
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
    isStartDateOn.value = true
  } else {
    endDate.value = val
    isEndDateOn.value = true
  }
  showDatePopup.value = false
  unlockScroll()
}

const handleCancel = () => {
  if (popupMode.value === 'start') {
    startDate.value = { year: '', month: '', day: '' }
    isStartDateOn.value = false
  } else {
    endDate.value = { year: '', month: '', day: '' }
    isEndDateOn.value = false
  }
  showDatePopup.value = false
  unlockScroll()
}

const resetDates = () => {
  startDate.value = { year: '', month: '', day: '' }
  endDate.value = { year: '', month: '', day: '' }
  isStartDateOn.value = false
  isEndDateOn.value = false
}

const formattedDate = computed(() => {
  if (!startDate.value.year) return ''
  const s = startDate.value
  const e = endDate.value
  const startStr = `${s.year}년 ${s.month}월 ${s.day}일`
  const endStr = e.year ? ` ~ ${e.year}년 ${e.month}월 ${e.day}일` : ''
  return startStr + endStr
})

onBeforeUnmount(unlockScroll)

const setFromRoutine = (routine) => {
  // ✅ 수정모드 초기 주입: 팝업 자동 오픈 차단
  suppressAutoOpen.value = true
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
  showDatePopup.value = false
  nextTick(() => { suppressAutoOpen.value = false })
}

defineExpose({
  startDate,
  endDate,
  setFromRoutine
})
</script>
