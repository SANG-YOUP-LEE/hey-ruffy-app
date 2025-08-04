<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>{{ popupTitle }}</h2>
      </div>
      <div class="title date light"><span>년</span><span>월</span><span>일</span></div>
      <div class="popup_body picker_group">
        <VueScrollPicker
          :value="localValue.year"
          :options="years"
          @change="(val) => (localValue.year = val)"
        />
        <VueScrollPicker
          :value="localValue.month"
          :options="months"
          @change="(val) => (localValue.month = val)"
        />
        <VueScrollPicker
          :value="localValue.day"
          :options="days"
          @change="(val) => (localValue.day = val)"
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
import { reactive, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

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

const localValue = reactive({
  year: props.modelValue.year || String(minYear.value),
  month: props.modelValue.month || String(minMonth.value),
  day: props.modelValue.day || String(minDay.value)
})

const originalValue = {
  year: props.modelValue.year || '',
  month: props.modelValue.month || '',
  day: props.modelValue.day || ''
}

const popupTitle = computed(() =>
  props.mode === 'end' ? '다짐 종료일 지정' : '다짐 시작일 지정'
)

const years = computed(() =>
  Array.from({ length: 50 }, (_, i) => String(minYear.value + i))
)

const months = computed(() => {
  const y = parseInt(localValue.year)
  const startMonth = y === minYear.value ? minMonth.value : 1
  return Array.from({ length: 12 - startMonth + 1 }, (_, i) => String(startMonth + i))
})

const days = computed(() => {
  const y = parseInt(localValue.year)
  const m = parseInt(localValue.month)
  if (isNaN(y) || isNaN(m)) return []

  const lastDay = new Date(y, m, 0).getDate()
  const startDay = (y === minYear.value && m === minMonth.value) ? minDay.value : 1
  return Array.from({ length: lastDay - startDay + 1 }, (_, i) => String(startDay + i))
})

watch([() => localValue.year, () => localValue.month], () => {
  const currentMonth = localValue.month
  if (!months.value.includes(currentMonth)) {
    localValue.month = months.value[0]
  }
  if (!days.value.includes(localValue.day)) {
    localValue.day = days.value[days.value.length - 1]
  }
})

const confirmSelection = () => {
  emit('update:modelValue', { ...localValue })
  emit('close')
}

const handleCancel = () => {
  localValue.year = originalValue.year
  localValue.month = originalValue.month
  localValue.day = originalValue.day
  emit('close')
}
</script>
