<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>알람 시간 설정</h2>
      </div>

      <div class="title date light">
        <span>오전/오후</span><span>시</span><span>분</span>
      </div>

      <div class="popup_body picker_group">
        <VueScrollPicker
          :key="pickerKey + '-ampm'"
          v-model="localValue.ampm"
          :options="ampmOptions"
          :drag-sensitivity="0.5"
          :touch-sensitivity="1"
          :scroll-sensitivity="1"
        />
        <VueScrollPicker
          :key="pickerKey + '-h'"
          v-model="selectedHour"
          :options="hourLoopOptions"
          :drag-sensitivity="1.4"
          :touch-sensitivity="1.4"
          :scroll-sensitivity="0.7"
        />
        <VueScrollPicker
          :key="pickerKey + '-m'"
          v-model="selectedMinute"
          :options="minuteLoopOptions"
          :drag-sensitivity="1.4"
          :touch-sensitivity="1.4"
          :scroll-sensitivity="0.7"
          :inertia-duration="3000"
          :inertia-factor="0.98"
        />
      </div>

      <div class="popup_btm">
        <button @click="confirmSelection" class="p_basic">확인</button>
        <button @click="$emit('close')" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

/** ---- UI 스크롤 잠금 ---- */
const preventScroll = (e) => { e.preventDefault() }
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

/** ---- 기본 표시값: 오전 10:00 ---- */
const DISPLAY_DEFAULT = { ampm: '오전', hour: '10', minute: '00' }

const props = defineProps({
  modelValue: { type: Object, default: () => ({ ampm: null, hour: null, minute: null }) }
})
const emit = defineEmits(['update:modelValue','close'])

const pad2 = (v) => String(v ?? '').padStart(2, '0')
const toKoAMPM = (v) => (v === 'AM' ? '오전' : v === 'PM' ? '오후' : (v || '오전'))
const normalize = (v) => ({
  ampm: toKoAMPM(v?.ampm ?? DISPLAY_DEFAULT.ampm),
  hour: pad2(v?.hour ?? DISPLAY_DEFAULT.hour),
  minute: pad2(v?.minute ?? DISPLAY_DEFAULT.minute)
})

/** ---- 상태 ---- */
const base = normalize(props.modelValue)
const localValue = ref({ ampm: base.ampm })
const pickerKey = ref(0)

/** ---- 옵션/루프 ---- */
const rawHours   = Array.from({ length: 12 }, (_, i) => pad2(i + 1))
const rawMinutes = Array.from({ length: 60 }, (_, i) => pad2(i))
const loopCount = 100
const hourLoopOptions   = Array.from({ length: rawHours.length   * loopCount }, (_, i) => rawHours[i % 12])
const minuteLoopOptions = Array.from({ length: rawMinutes.length * loopCount }, (_, i) => rawMinutes[i % 60])
const ampmOptions = ['오전', '오후']

const findCenteredIndex = (arr, val) => {
  const target = pad2(val)
  const half = Math.floor(arr.length / 2)
  for (let i = half; i < arr.length; i++) if (arr[i] === target) return i
  for (let i = half - 1; i >= 0; i--) if (arr[i] === target) return i
  return -1
}

/** ---- 초기 선택값(표시값 기준) ---- */
const hourIndex   = findCenteredIndex(hourLoopOptions,   base.hour)
const minuteIndex = findCenteredIndex(minuteLoopOptions, base.minute)
const selectedHour   = ref(hourIndex   !== -1 ? hourLoopOptions[hourIndex]     : DISPLAY_DEFAULT.hour)
const selectedMinute = ref(minuteIndex !== -1 ? minuteLoopOptions[minuteIndex] : DISPLAY_DEFAULT.minute)

/** ---- props 변경 시 보정 ---- */
watch(() => props.modelValue, async (v) => {
  const n = normalize(v)
  localValue.value.ampm = n.ampm
  const hi = findCenteredIndex(hourLoopOptions, n.hour || DISPLAY_DEFAULT.hour)
  const mi = findCenteredIndex(minuteLoopOptions, n.minute || DISPLAY_DEFAULT.minute)
  selectedHour.value   = hi !== -1 ? hourLoopOptions[hi]     : (n.hour   || DISPLAY_DEFAULT.hour)
  selectedMinute.value = mi !== -1 ? minuteLoopOptions[mi]   : (n.minute || DISPLAY_DEFAULT.minute)
  await nextTick()
  pickerKey.value++
}, { immediate: true, deep: true })

/** ---- 마운트 시 ‘오전 10:00’ 강제 정렬 ---- */
onMounted(async () => {
  await nextTick()
  if (!props.modelValue?.hour || !props.modelValue?.minute) {
    localValue.value.ampm = DISPLAY_DEFAULT.ampm
    const hi = findCenteredIndex(hourLoopOptions,   DISPLAY_DEFAULT.hour)
    const mi = findCenteredIndex(minuteLoopOptions, DISPLAY_DEFAULT.minute)
    selectedHour.value   = hi !== -1 ? hourLoopOptions[hi]     : DISPLAY_DEFAULT.hour
    selectedMinute.value = mi !== -1 ? minuteLoopOptions[mi]   : DISPLAY_DEFAULT.minute
    pickerKey.value++
  }
})

/** ---- 확인 ---- */
const confirmSelection = () => {
  const h = pad2(selectedHour.value   || DISPLAY_DEFAULT.hour)
  const m = pad2(selectedMinute.value || DISPLAY_DEFAULT.minute)
  emit('update:modelValue', {
    ampm: localValue.value.ampm || DISPLAY_DEFAULT.ampm,
    hour: h,
    minute: m
  })
  emit('close')
}
</script>
