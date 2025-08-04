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

    <!-- 작은 팝업 -->
    <DateTimePickerPopup
      v-if="showDatePopup"
      :mode="popupMode"
      :minDate="popupMode === 'end' ? selectedStartDate : {}"
      v-model="selectedDateModel"
      @close="closeDatePopup"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'

const props = defineProps({
  startDate: { type: Object, default: () => ({ year:'', month:'', day:'' }) },
  endDate: { type: Object, default: () => ({ year:'', month:'', day:'' }) }
})
const emit = defineEmits(['update:startDate', 'update:endDate'])

const isStartDateOn = ref(false)
const isEndDateOn = ref(false)
const showDatePopup = ref(false)
const popupMode = ref('start')

const selectedStartDate = reactive({ ...props.startDate })
const selectedEndDate = reactive({ ...props.endDate })
const showWarning = ref(false)

let scrollY = 0
let activePopup = null

const preventTouchMove = (e) => {
  // 자식 팝업 영역 외부는 스크롤 차단
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
  if (val) {
    popupMode.value = 'start'
    if (!selectedStartDate.year) {
      Object.assign(selectedStartDate, getTodayObject())
    }
    showDatePopup.value = true
    showWarning.value = false
    lockScroll('.com_popup_wrap .popup_inner')
  } else {
    Object.assign(selectedStartDate, { year: '', month: '', day: '' })
    isEndDateOn.value = false
    Object.assign(selectedEndDate, { year: '', month: '', day: '' })
  }
})

watch(isEndDateOn, (val) => {
  if (val) {
    if (!selectedStartDate.year) {
      showWarning.value = true
      isEndDateOn.value = false
    } else {
      popupMode.value = 'end'
      if (!selectedEndDate.year) {
        Object.assign(selectedEndDate, { ...selectedStartDate })
      }
      showDatePopup.value = true
      showWarning.value = false
      lockScroll('.com_popup_wrap .popup_inner')
    }
  } else {
    Object.assign(selectedEndDate, { year: '', month: '', day: '' })
  }
})

const closeDatePopup = () => {
  showDatePopup.value = false
  unlockScroll()

  //시작일 모드일 때 취소 누르면 selectedStartDate를 초기화
  if (popupMode.value === 'start') {
    Object.assign(selectedStartDate, { year: '', month: '', day: '' })
    isStartDateOn.value = false
  }

  // 종료일도 마찬가지
  if (popupMode.value === 'end') {
    Object.assign(selectedEndDate, { year: '', month: '', day: '' })
    isEndDateOn.value = false
  }
}

const selectedDateModel = computed({
  get() {
    return popupMode.value === 'start' ? selectedStartDate : selectedEndDate
  },
  set(val) {
    if (popupMode.value === 'start') {
      Object.assign(selectedStartDate, val)
    } else {
      Object.assign(selectedEndDate, val)
    }
  }
})

const formattedDate = computed(() => {
  if (!selectedStartDate.year) return ''
  const start = `${selectedStartDate.year}년 ${selectedStartDate.month}월 ${selectedStartDate.day}일`
  const end = selectedEndDate.year
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

