<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>알람 시간 설정</h2>
      </div>
      <div class="title date light">
        <span>AM/PM</span><span>시</span><span>분</span>
      </div>
      <div class="popup_body picker_group">
        <VueScrollPicker
          v-model="localValue.ampm"
          :options="ampmOptions"
          :drag-sensitivity="1"
          :touch-sensitivity="1"
          :scroll-sensitivity="1"
        />
        <VueScrollPicker
          v-model="selectedHour"
          :options="hourLoopOptions"
          :drag-sensitivity="3"
          :touch-sensitivity="2"
          :scroll-sensitivity="3"
        />
        <VueScrollPicker
          v-model="selectedMinute"
          :options="minuteLoopOptions"
          :drag-sensitivity="3"
          :touch-sensitivity="2"
          :scroll-sensitivity="4"
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
  modelValue: {
    type: Object,
    default: () => ({ ampm: 'AM', hour: '07', minute: '00' })
  }
})
const emit = defineEmits(['update:modelValue','close'])

const pad2 = (v) => String(v ?? '').padStart(2, '0')

const localValue = ref({
  ampm: props.modelValue.ampm || 'AM'
})

const rawHours = Array.from({ length: 12 }, (_, i) => pad2(i + 1))
const rawMinutes = Array.from({ length: 60 }, (_, i) => pad2(i))
const loopCount = 100
const hourLoopOptions = Array.from({ length: rawHours.length * loopCount }, (_, i) => rawHours[i % 12])
const minuteLoopOptions = Array.from({ length: rawMinutes.length * loopCount }, (_, i) => rawMinutes[i % 60])
const ampmOptions = ['AM', 'PM']

const findCenteredIndex = (arr, val) => {
  const target = pad2(val)
  const half = Math.floor(arr.length / 2)
  for (let i = half; i < arr.length; i++) if (arr[i] === target) return i
  for (let i = half - 1; i >= 0; i--) if (arr[i] === target) return i
  return -1
}

const initHour = pad2(props.modelValue.hour || '07')
const initMinute = pad2(props.modelValue.minute || '00')
const hourIndex = findCenteredIndex(hourLoopOptions, initHour)
const minuteIndex = findCenteredIndex(minuteLoopOptions, initMinute)

const selectedHour = ref(hourIndex !== -1 ? hourLoopOptions[hourIndex] : '07')
const selectedMinute = ref(minuteIndex !== -1 ? minuteLoopOptions[minuteIndex] : '00')

watch(() => props.modelValue, (v) => {
  localValue.value.ampm = v?.ampm || 'AM'
  const h = pad2(v?.hour || '07')
  const m = pad2(v?.minute || '00')
  const hi = findCenteredIndex(hourLoopOptions, h)
  const mi = findCenteredIndex(minuteLoopOptions, m)
  selectedHour.value = hi !== -1 ? hourLoopOptions[hi] : h
  selectedMinute.value = mi !== -1 ? minuteLoopOptions[mi] : m
}, { immediate: true, deep: true })

const confirmSelection = () => {
  emit('update:modelValue', {
    ampm: localValue.value.ampm || 'AM',
    hour: pad2(selectedHour.value || '07'),
    minute: pad2(selectedMinute.value || '00')
  })
  emit('close')
}
</script>
