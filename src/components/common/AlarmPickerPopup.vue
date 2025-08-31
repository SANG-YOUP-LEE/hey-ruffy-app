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
          v-model="localValue.ampm"
          :options="ampmOptions"
          :drag-sensitivity="0.5"
          :touch-sensitivity="1"
          :scroll-sensitivity="1"
        />
        <VueScrollPicker
          v-model="selectedHour"
          :options="hourLoopOptions"
          :drag-sensitivity="0.3"
          :touch-sensitivity="4"
          :scroll-sensitivity="3"
        />
        <VueScrollPicker
          v-model="selectedMinute"
          :options="minuteLoopOptions"
          :drag-sensitivity="0.3"
          :touch-sensitivity="4"
          :scroll-sensitivity="3"
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
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const preventScroll = (e) => { e.preventDefault() }
const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden'
  document.body.addEventListener('touchmove', preventScroll, { passive: false })
}
const unlockBodyScroll = () => {
  document.body.style.overflow = ''
  document.body.removeEventListener('touchmove', preventScroll)
}

onMounted(() => { lockBodyScroll() })
onBeforeUnmount(() => { unlockBodyScroll() })

const props = defineProps({
  modelValue: { type: Object, default: () => ({ ampm: '오전', hour: '07', minute: '00' }) }
})
const emit = defineEmits(['update:modelValue','close'])

const pad2 = (v) => String(v ?? '').padStart(2, '0')
const toKoAMPM = (v) => (v === 'AM' ? '오전' : v === 'PM' ? '오후' : (v || '오전'))
const normalize = (v) => ({
  ampm: toKoAMPM(v?.ampm),
  hour: pad2(v?.hour ?? '07'),
  minute: pad2(v?.minute ?? '00')
})

const base = normalize(props.modelValue)
const localValue = ref({ ampm: base.ampm })

const rawHours = Array.from({ length: 12 }, (_, i) => pad2(i + 1))
const rawMinutes = Array.from({ length: 60 }, (_, i) => pad2(i))
const loopCount = 100
const hourLoopOptions = Array.from({ length: rawHours.length * loopCount }, (_, i) => rawHours[i % 12])
const minuteLoopOptions = Array.from({ length: rawMinutes.length * loopCount }, (_, i) => rawMinutes[i % 60])
const ampmOptions = ['오전', '오후']

const findCenteredIndex = (arr, val) => {
  const target = pad2(val)
  const half = Math.floor(arr.length / 2)
  for (let i = half; i < arr.length; i++) if (arr[i] === target) return i
  for (let i = half - 1; i >= 0; i--) if (arr[i] === target) return i
  return -1
}

const initHour = base.hour
const initMinute = base.minute
const hourIndex = findCenteredIndex(hourLoopOptions, initHour)
const minuteIndex = findCenteredIndex(minuteLoopOptions, initMinute)

const selectedHour = ref(hourIndex !== -1 ? hourLoopOptions[hourIndex] : '07')
const selectedMinute = ref(minuteIndex !== -1 ? minuteLoopOptions[minuteIndex] : '00')

watch(() => props.modelValue, (v) => {
  const n = normalize(v)
  localValue.value.ampm = n.ampm
  const hi = findCenteredIndex(hourLoopOptions, n.hour)
  const mi = findCenteredIndex(minuteLoopOptions, n.minute)
  selectedHour.value = hi !== -1 ? hourLoopOptions[hi] : n.hour
  selectedMinute.value = mi !== -1 ? minuteLoopOptions[mi] : n.minute
}, { immediate: true, deep: true })

const confirmSelection = () => {
  emit('update:modelValue', {
    ampm: localValue.value.ampm || '오전',
    hour: pad2(selectedHour.value || '07'),
    minute: pad2(selectedMinute.value || '00')
  })
  emit('close')
}
</script>
