<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 date">
        <!-- 시작일 -->
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isStartDateOn" />
          <span class="toggle-text" @click="openStartDate">시작일 지정</span>
        </div>

        <!-- 종료일 -->
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isEndDateOn" />
          <span class="toggle-text" @click="openEndDate">종료일 지정</span>
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
      :minDate="popupMode === 'end' ? selectedStartDate : {}"
      v-model="tempDateModel"
      @confirm="applyDateSelection"
      @close="cancelDateSelection"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onBeforeUnmount } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'

const selectedStartDate = reactive({ year: '', month: '', day: '' })
const selectedEndDate = reactive({ year: '', month: '', day: '' })

const tempStartDate = ref({ year: '', month: '', day: '' })
const tempEndDate = ref({ year: '', month: '', day: '' })

const showDatePopup = ref(false)
const popupMode = ref('start')

const isStartDateOn = ref(false)
const isEndDateOn = ref(false)

const showWarning = ref(false)

let scrollY = 0
let activePopup = null

const preventTouchMove = (e) => {
  if (activePopup && !e.target.closest(activePopup)) {
    e.preventDefault()
  }
}

const lockScroll = (popupSelector) => {
  activePopup = popupSelector
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
  activePopup = null
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

const isDateEmpty = (obj) => {
  return !obj.year || !obj.month || !obj.day
}

const openStartDate = () => {
  popupMode.value = 'start'
  tempStartDate.value = { ...selectedStartDate }
  showDatePopup.value = true
  lockScroll('.com_popup_wrap .popup_inner')
}

const openEndDate = () => {
  if (isDateEmpty(selectedStartDate)) {
    showWarning.value = true
    isEndDateOn.value = false
    return
  }
  popupMode.value = 'end'
  tempEndDate.value = { ...selectedEndDate }
  showDatePopup.value = true
  lockScroll('.com_popup_wrap .popup_inner')
}

const applyDateSelection = () => {
  if (popupMode.value === 'start') {
    Object.assign(selectedStartDate, tempStartDate.value)
    isStartDateOn.value = true
  } else {
    Object.assign(selectedEndDate, tempEndDate.value)
    isEndDateOn.value = true
  }
  showDatePopup.value = false
  unlockScroll()
}

const cancelDateSelection = () => {
  showDatePopup.value = false
  unlockScroll()
  if (popupMode.value === 'start' && isDateEmpty(selectedStartDate)) {
    isStartDateOn.value = false
  }
  if (popupMode.value === 'end' && isDateEmpty(selectedEndDate)) {
    isEndDateOn.value = false
  }
}

const tempDateModel = computed({
  get() {
    return popupMode.value === 'start' ? tempStartDate.value : tempEndDate.value
  },
  set(val) {
    if (popupMode.value === 'start') {
      tempStartDate.value = val
    } else {
      tempEndDate.value = val
    }
  }
})

const formattedDate = computed(() => {
  if (isDateEmpty(selectedStartDate)) return ''
  const start = `${selectedStartDate.year}년 ${selectedStartDate.month}월 ${selectedStartDate.day}일`
  const end = !isDateEmpty(selectedEndDate)
    ? ` ~ ${selectedEndDate.year}년 ${selectedEndDate.month}월 ${selectedEndDate.day}일`
    : ''
  return start + end
})

const resetDates = () => {
  Object.assign(selectedStartDate, { year: '', month: '', day: '' })
  Object.assign(selectedEndDate, { year: '', month: '', day: '' })
  isStartDateOn.value = false
  isEndDateOn.value = false
}

onBeforeUnmount(() => {
  unlockScroll()
})
</script>
