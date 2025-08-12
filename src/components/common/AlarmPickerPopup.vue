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
          :touch-sensitivity="3"
          :scroll-sensitivity="2"
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
import { ref, onMounted, onBeforeUnmount } from 'vue'

const preventScroll = (e) => {
  e.preventDefault()
}
const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden'
  document.body.addEventListener('touchmove', preventScroll, { passive: false })
}
const unlockBodyScroll = () => {
  document.body.style.overflow = ''
  document.body.removeEventListener('touchmove', preventScroll)
}

onMounted(() => {
  lockBodyScroll()
})
onBeforeUnmount(() => {
  unlockBodyScroll()
})

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ ampm: 'AM', hour: '07', minute: '00' })
  }
})
const emit = defineEmits(['update:modelValue', 'close'])

const localValue = ref({ ...props.modelValue })

// AM/PM 고정
const ampmOptions = ['AM', 'PM']

// 무한 스크롤용 반복 생성
const rawHours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const rawMinutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const loopCount = 100
const hourLoopOptions = Array.from({ length: rawHours.length * loopCount }, (_, i) => rawHours[i % 12])
const minuteLoopOptions = Array.from({ length: rawMinutes.length * loopCount }, (_, i) => rawMinutes[i % 60])

// 중앙값에서 시작
const hourIndex = hourLoopOptions.findIndex((val, i) => i > hourLoopOptions.length / 2 && val === props.modelValue.hour.padStart(2, '0'))
const minuteIndex = minuteLoopOptions.findIndex((val, i) => i > minuteLoopOptions.length / 2 && val === props.modelValue.minute.padStart(2, '0'))

const selectedHour = ref(hourIndex !== -1 ? hourLoopOptions[hourIndex] : '07')
const selectedMinute = ref(minuteIndex !== -1 ? minuteLoopOptions[minuteIndex] : '00')

// 확인 → 안전하게 emit
const confirmSelection = () => {
  emit('update:modelValue', {
    ampm: localValue.value.ampm || 'AM',
    hour: selectedHour.value || '07',
    minute: selectedMinute.value || '00'
  })
  emit('close')
}
</script>
