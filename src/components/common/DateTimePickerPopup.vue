<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>{{ popupTitle }}</h2>
      </div>
      <div class="title date light"><span>년</span><span>월</span><span>일</span></div>
      <div class="popup_body picker_group">
        <WheelPicker v-model="localValue.year" :options="years" />
        <WheelPicker v-model="localValue.month" :options="months" />
        <WheelPicker v-model="localValue.day" :options="days" />
      </div>
      <div class="popup_btm">
        <button @click="confirmSelection" class="p_basic">확인</button>
        <button @click="$emit('close')" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import WheelPicker from './WheelPicker.vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'start' },   // start or end
  minDate: { type: Object, default: () => ({}) } // 종료일용 최소 시작일
})
const emit = defineEmits(['update:modelValue', 'close'])

const localValue = ref({ ...props.modelValue })

// 오늘 날짜
const today = new Date()
const baseYear = today.getFullYear()
const baseMonth = today.getMonth() + 1
const baseDay = today.getDate()

// 종료일이면 시작일 이후를 최소값으로 지정
const minYear = computed(() => {
  return props.mode === 'end' && props.minDate.year
    ? parseInt(props.minDate.year)
    : baseYear
})

const minMonth = computed(() => {
  return props.mode === 'end' && props.minDate.month
    ? parseInt(props.minDate.month)
    : baseMonth
})

const minDay = computed(() => {
  return props.mode === 'end' && props.minDate.day
    ? parseInt(props.minDate.day)
    : baseDay
})

const popupTitle = computed(() => {
  return props.mode === 'end' ? '다짐 종료일 지정' : '다짐 시작일 지정'
})

// 연도 옵션
const years = computed(() => {
  return Array.from({ length: 50 }, (_, i) => minYear.value + i).map(String)
})

// 월 옵션
const months = computed(() => {
  const selectedYear = parseInt(localValue.value.year) || minYear.value
  const startMonth = selectedYear === minYear.value ? minMonth.value : 1
  return Array.from({ length: 12 - startMonth + 1 }, (_, i) => String(startMonth + i))
})

// 일 옵션
const days = ref([])

const updateDays = () => {
  const y = parseInt(localValue.value.year) || minYear.value
  const m = parseInt(localValue.value.month) || minMonth.value
  const lastDay = new Date(y, m, 0).getDate()
  const startDay = (y === minYear.value && m === minMonth.value) ? minDay.value : 1
  const newDays = Array.from({ length: lastDay - startDay + 1 }, (_, i) => String(startDay + i))
  days.value = newDays

  // 유효하지 않은 날짜 자동 보정
  if (!newDays.includes(localValue.value.day)) {
    localValue.value.day = newDays[0]
  }
}

watch([() => localValue.value.year, () => localValue.value.month], () => {
  // 월 값 보정
  if (!months.value.includes(localValue.value.month)) {
    localValue.value.month = months.value[0]
  }
  updateDays()
}, { immediate: true })

// 연도 변경 시 월·일 값 보정
watch(() => localValue.value.year, () => {
  if (!months.value.includes(localValue.value.month)) {
    localValue.value.month = months.value[0]
  }
  updateDays()
})

const confirmSelection = () => {
  emit('update:modelValue', { ...localValue.value })
  emit('close')
}
</script>