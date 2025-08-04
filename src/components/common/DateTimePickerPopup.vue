<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>{{ popupTitle }}</h2>
      </div>
      <div class="title date light"><span>년</span><span>월</span><span>일</span></div>
      <div class="popup_body picker_group">
        <VueScrollPicker
          v-model="localValue.year"
          :options="years"
          :drag-sensitivity="3"
          :touch-sensitivity="3"
          :scroll-sensitivity="2"
        />
        <VueScrollPicker
          v-model="localValue.month"
          :options="months"
          :drag-sensitivity="3"
          :touch-sensitivity="3"
          :scroll-sensitivity="2"
        />
        <VueScrollPicker
          v-model="localValue.day"
          :options="days"
          :drag-sensitivity="3"
          :touch-sensitivity="3"
          :scroll-sensitivity="2"
        />
      </div>
      <div class="popup_btm">
        <button @click="confirmSelection" class="p_basic">확인</button>
        <button @click="handleCancel" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const preventScroll = (e) => e.preventDefault()
const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden'
  document.body.addEventListener('touchmove', preventScroll, { passive: false })
}
const unlockBodyScroll = () => {
  document.body.style.overflow = ''
  document.body.removeEventListener('touchmove', preventScroll)
}

onMounted(lockBodyScroll)
onBeforeUnmount(unlockBodyScroll)

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'start' },
  minDate: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'close'])

const localValue = ref({ ...props.modelValue }) // 원본 유지용
const skipEmit = ref(true) // 초기 emit 방지

const today = new Date()
const baseYear = today.getFullYear()
const baseMonth = today.getMonth() + 1
const baseDay = today.getDate()

const minYear = computed(() =>
  props.mode === 'end' && props.minDate.year
    ? parseInt(props.minDate.year)
    : baseYear
)
const minMonth = computed(() =>
  props.mode === 'end' && props.minDate.month
    ? parseInt(props.minDate.month)
    : baseMonth
)
const minDay = computed(() =>
  props.mode === 'end' && props.minDate.day
    ? parseInt(props.minDate.day)
    : baseDay
)

const popupTitle = computed(() =>
  props.mode === 'end' ? '다짐 종료일 지정' : '다짐 시작일 지정'
)

const years = computed(() =>
  Array.from({ length: 50 }, (_, i) => String(minYear.value + i))
)

const months = computed(() => {
  const selectedYear = parseInt(localValue.value.year)
  const y = isNaN(selectedYear) ? minYear.value : selectedYear
  const startMonth = y === minYear.value ? minMonth.value : 1
  return Array.from({ length: 12 - startMonth + 1 }, (_, i) => String(startMonth + i))
})

const days = ref([])

const updateDays = () => {
  const y = parseInt(localValue.value.year)
  const m = parseInt(localValue.value.month)

  if (isNaN(y) || isNaN(m)) {
    days.value = []
    return
  }

  const lastDay = new Date(y, m, 0).getDate()
  const startDay = (y === minYear.value && m === minMonth.value) ? minDay.value : 1
  const newDays = Array.from({ length: lastDay - startDay + 1 }, (_, i) => String(startDay + i))
  days.value = newDays

  if (!newDays.includes(localValue.value.day)) {
    localValue.value.day = newDays[newDays.length - 1]
  }

  if (!skipEmit.value) {
    nextTick(() => {
      emit('update:modelValue', { ...localValue.value })
    })
  }
}

// 초기 날짜가 비어있을 경우 기본 세팅
onMounted(() => {
  const val = localValue.value
  if (!val.year) localValue.value.year = String(minYear.value)
  if (!val.month) localValue.value.month = String(minMonth.value)
  if (!val.day) localValue.value.day = String(minDay.value)
  updateDays()
  nextTick(() => { skipEmit.value = false })
})

watch(
  [() => localValue.value.year, () => localValue.value.month],
  () => {
    if (!months.value.includes(localValue.value.month)) {
      localValue.value.month = months.value[0]
    }
    updateDays()
  }
)

const confirmSelection = () => {
  emit('update:modelValue', { ...localValue.value })
  emit('close')
}

const handleCancel = () => {
  emit('close') // 값은 그대로 두고 팝업만 닫기
}
</script>
