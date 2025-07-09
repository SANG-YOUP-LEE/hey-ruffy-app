<template>
  <div class="wheel-overlay">
    <div class="wheel-popup">
      <button class="close_btn" @click="$emit('close')"><span>닫기</span></button>
      <h2>{{ title }}</h2>

      <div class="wheel-row">
        <MiniWheelPicker v-if="showYear" title="년" :items="yearList" v-model="selectedYear" />
        <MiniWheelPicker v-if="showMonth" title="월" :items="monthList" v-model="selectedMonth" />
        <MiniWheelPicker v-if="showDate" title="일" :items="dateList" v-model="selectedDate" />
        <MiniWheelPicker v-if="showAmPm" title="오전/오후" :items="ampmList" v-model="selectedAmPm" />
        <MiniWheelPicker v-if="showHour" title="시" :items="hourList" v-model="selectedHour" />
        <MiniWheelPicker v-if="showMinute" title="분" :items="minuteList" v-model="selectedMinute" />
        <MiniWheelPicker v-if="showSecond" title="초" :items="secondList" v-model="selectedSecond" />
      </div>

      <button class="pop_btm" @click="confirm">확인</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import MiniWheelPicker from '@/components/common/MiniWheelPicker.vue'

const props = defineProps({
  title: String,
  showYear: { type: Boolean, default: true },
  showMonth: { type: Boolean, default: true },
  showDate: { type: Boolean, default: true },
  showAmPm: { type: Boolean, default: true },
  showHour: { type: Boolean, default: true },
  showMinute: { type: Boolean, default: true },
  showSecond: { type: Boolean, default: true },
  minDate: { type: String, default: null } // "2025-07-09" 형식으로만
})

const emit = defineEmits(['close', 'confirm'])

// 선택 값들
const today = new Date()
const selectedYear = ref(today.getFullYear())
const selectedMonth = ref(today.getMonth() + 1)
const selectedDate = ref(today.getDate())
const selectedAmPm = ref('오전')
const selectedHour = ref(1)
const selectedMinute = ref(0)
const selectedSecond = ref(0)

// 리스트 계산
const yearList = computed(() =>
  Array.from({ length: 100 }, (_, i) => 1970 + i)
)
const monthList = computed(() =>
  Array.from({ length: 12 }, (_, i) => i + 1)
)

const parsedMinDate = computed(() => {
  if (!props.minDate) return null
  const [y, m, d] = props.minDate.split('-').map(Number)
  return { year: y, month: m, date: d }
})

const dateList = computed(() => {
  const daysInMonth = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  const list = []

  for (let i = 1; i <= daysInMonth; i++) {
    const isBeforeMinDate =
      props.minDate &&
      selectedYear.value === parsedMinDate.value?.year &&
      selectedMonth.value === parsedMinDate.value?.month &&
      i < parsedMinDate.value?.date

    if (isBeforeMinDate) continue
    list.push(i)
  }

  return list
})

const ampmList = ['오전', '오후']
const hourList = computed(() => Array.from({ length: 12 }, (_, i) => i + 1))
const minuteList = computed(() => Array.from({ length: 60 }, (_, i) => i))
const secondList = computed(() => Array.from({ length: 60 }, (_, i) => i))

const confirm = () => {
  emit('confirm', {
    year: selectedYear.value,
    month: selectedMonth.value,
    date: selectedDate.value,
    ampm: selectedAmPm.value,
    hour: selectedHour.value,
    minute: selectedMinute.value,
    second: selectedSecond.value
  })
  emit('close')
}
</script>

<style>
.wheel-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.wheel-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wheel-label {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #555;
}
</style>