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

      <div v-if="formattedDate" :class="{ data_fixed: formattedDate }">
        {{ formattedDate }}
        <a href="#none" class="txt" @click.prevent="resetDates">지정일 취소하기</a> 
      </div>
    </div>

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
import { ref, watch, computed } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'

const isStartDateOn = ref(false)
const isEndDateOn = ref(false)
const showDatePopup = ref(false)
const popupMode = ref('start')

const selectedStartDate = ref({ year: '', month: '', day: '' })
const selectedEndDate = ref({ year: '', month: '', day: '' })
const showWarning = ref(false)

// 텍스트 클릭으로 토글 변경
const toggleStartDate = () => {
  isStartDateOn.value = !isStartDateOn.value
}
const toggleEndDate = () => {
  isEndDateOn.value = !isEndDateOn.value
}

// 시작일 토글
watch(isStartDateOn, (val) => {
  if (val) {
    popupMode.value = 'start'
    showDatePopup.value = true
    showWarning.value = false
  } else {
    selectedStartDate.value = { year: '', month: '', day: '' }
    isEndDateOn.value = false
    selectedEndDate.value = { year: '', month: '', day: '' }
  }
})

// 종료일 토글
watch(isEndDateOn, (val) => {
  if (val) {
    if (!selectedStartDate.value.year) {
      showWarning.value = true
      isEndDateOn.value = false
    } else {
      popupMode.value = 'end'
      showDatePopup.value = true
      showWarning.value = false
    }
  } else {
    selectedEndDate.value = { year: '', month: '', day: '' }
  }
})

const closeDatePopup = () => {
  showDatePopup.value = false
  if (popupMode.value === 'start' && !selectedStartDate.value.year) {
    isStartDateOn.value = false
  }
  if (popupMode.value === 'end' && !selectedEndDate.value.year) {
    isEndDateOn.value = false
  }
}

const selectedDateModel = computed({
  get() {
    return popupMode.value === 'start' ? selectedStartDate.value : selectedEndDate.value
  },
  set(val) {
    if (popupMode.value === 'start') {
      selectedStartDate.value = val
    } else {
      selectedEndDate.value = val
    }
  }
})

const formattedDate = computed(() => {
  if (!selectedStartDate.value.year) return ''
  const start = `${selectedStartDate.value.year}년 ${selectedStartDate.value.month}월 ${selectedStartDate.value.day}일`
  const end = selectedEndDate.value.year
    ? ` ~ ${selectedEndDate.value.year}년 ${selectedEndDate.value.month}월 ${selectedEndDate.value.day}일`
    : ''
  return start + end
})

const resetDates = () => {
  selectedStartDate.value = { year: '', month: '', day: '' }
  selectedEndDate.value = { year: '', month: '', day: '' }
  isStartDateOn.value = false
  isEndDateOn.value = false
}
</script>
