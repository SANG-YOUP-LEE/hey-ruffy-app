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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'start' }, // 'start' 또는 'end'
  minDate: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue', 'close'])

// 스크롤 잠금
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

// 날짜 상태
const localValue = ref({ year: '', month: '', day: '' })
const originalValue = ref({ year: '', month: '', day: '' })

watch(
  () => props.modelValue,
  (val) => {
    localValue.value = { ...val }
    originalValue.value = { ...val }
    updateDays()
  },
  { immediate: true }
)

const today = new Date()
const baseYear = today.getFullYear()
const baseMonth = today.getMonth() + 1
const baseDay = today.getDate()

const popupTitle = computed(() =>
  props.mode === 'end' ? '다짐 종료일 지정' : '다짐 시작일 지정'
)

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

const years = computed(() =>
  Array.from({ length: 50 }, (_, i) => String(minYear.value + i))
)

const months = computed(() => {
  const y = parseInt(localValue.value.year)
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
}

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
  emit('close') // 저장 없이 닫기만
}
</script>
