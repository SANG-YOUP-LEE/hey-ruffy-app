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
  minDate: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'close'])

const localValue = ref({ ...props.modelValue })

// 오늘 날짜
const today = new Date()
const baseYear = today.getFullYear()
const baseMonth = today.getMonth() + 1
const baseDay = today.getDate()

// 안전한 숫자 변환 (빈값만 기본값으로 대체)
const safeNumber = (val, fallback) => {
  return (val === undefined || val === null || val === '') ? fallback : Number(val)
}

const minYear = computed(() => {
  if (props.mode === 'end' && props.minDate.year) {
    return Number(props.minDate.year)
  }
  return baseYear
})

const minMonth = computed(() => {
  const selectedYear = safeNumber(localValue.value.year, minYear.value)
  if (props.mode === 'end' && props.minDate.month) {
    return selectedYear === Number(props.minDate.year) ? Number(props.minDate.month) : 1
  }
  if (props.mode === 'start') {
    return selectedYear === baseYear ? baseMonth : 1
  }
  return 1
})

const minDay = computed(() => {
  const selectedYear = safeNumber(localValue.value.year, minYear.value)
  const selectedMonth = safeNumber(localValue.value.month, minMonth.value)

  if (props.mode === 'end' && props.minDate.day) {
    if (
      selectedYear === Number(props.minDate.year) &&
      selectedMonth === Number(props.minDate.month)
    ) {
      return Number(props.minDate.day)
    }
  }

  if (props.mode === 'start') {
    if (selectedYear === baseYear && selectedMonth === baseMonth) {
      return baseDay
    }
  }
  return 1
})

const popupTitle = computed(() => {
  return props.mode === 'end' ? '다짐 종료일 지정' : '다짐 시작일 지정'
})

const years = computed(() => {
  return Array.from({ length: 50 }, (_, i) => String(minYear.value + i))
})

const months = computed(() => {
  const selectedYear = safeNumber(localValue.value.year, minYear.value)
  const startMonth = selectedYear === minYear.value ? minMonth.value : 1
  return Array.from({ length: 12 - startMonth + 1 }, (_, i) => String(startMonth + i))
})

const days = ref([])

const updateDays = () => {
  const y = safeNumber(localValue.value.year, minYear.value)
  const m = safeNumber(localValue.value.month, minMonth.value)
  const lastDay = new Date(y, m, 0).getDate()
  const startDay = minDay.value

  const newDays = Array.from({ length: lastDay - startDay + 1 }, (_, i) => String(startDay + i))
  days.value = newDays

  // day 값이 없거나 유효하지 않을 때만 보정 (1은 정상 허용)
  if (!localValue.value.day || !newDays.includes(String(localValue.value.day))) {
    localValue.value.day = newDays[0]
  }
}

watch([() => localValue.value.year, () => localValue.value.month], () => {
  if (!months.value.includes(String(localValue.value.month))) {
    localValue.value.month = months.value[0]
  }
  updateDays()
}, { immediate: true })

watch(() => localValue.value.year, () => {
  if (!months.value.includes(String(localValue.value.month))) {
    localValue.value.month = months.value[0]
  }
  updateDays()
})

const confirmSelection = () => {
  emit('update:modelValue', { ...localValue.value })
  emit('close')
}
</script>