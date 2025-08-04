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
  mode: { type: String, default: 'start' },
  minDate: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['update:modelValue', 'close', 'confirm'])

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

const localValue = ref({ year: '', month: '', day: '' })

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
  () => props.modelValue,
  (val) => {
    localValue.value = {
      year: val?.year || String(minYear.value),
      month: val?.month || String(minMonth.value),
      day: val?.day || String(minDay.value)
    }
    updateDays()
  },
  { immediate: true }
)

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
  emit('confirm') // 확인 완료 알림
  emit('close')
}

const handleCancel = () => {
  emit('close') // 값 반영 없이 단순 닫기
}
</script>
