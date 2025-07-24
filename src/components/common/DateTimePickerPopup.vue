<template>
  <teleport to="body">
    <div class="wheel-overlay">
      <div class="wheel-popup">
        <button class="close_btn" @click="$emit('close')"><span>닫기</span></button>
        <h2>{{ title }}</h2>

        <div class="wheel-row">
          <MiniWheelPicker
            v-if="showYear"
            title="년"
            :items="yearList"
            :modelValue="selectedYear"
            @update:modelValue="selectedYear = $event"
          />
          <MiniWheelPicker
            v-if="showMonth"
            title="월"
            :items="monthList"
            :modelValue="selectedMonth"
            @update:modelValue="selectedMonth = $event"
          />
          <MiniWheelPicker
            v-if="showDate"
            title="일"
            :items="dateList"
            :modelValue="selectedDate"
            @update:modelValue="selectedDate = $event"
          />
          <MiniWheelPicker
            v-if="showAmPm"
            title="오전/오후"
            :items="ampmList"
            :modelValue="selectedAmPm"
            @update:modelValue="selectedAmPm = $event"
          />
          <MiniWheelPicker
            v-if="showHour"
            title="시"
            :items="hourList"
            :modelValue="selectedHour"
            @update:modelValue="selectedHour = $event"
          />
          <MiniWheelPicker
            v-if="showMinute"
            title="분"
            :items="minuteList"
            :modelValue="selectedMinute"
            @update:modelValue="selectedMinute = $event"
          />
          <MiniWheelPicker
            v-if="showSecond"
            title="초"
            :items="secondList"
            :modelValue="selectedSecond"
            @update:modelValue="selectedSecond = $event"
          />
        </div>

        <button class="pop_btm" @click="confirm">확인</button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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
  minDate: { type: String, default: null },
  maxDate: { type: String, default: null },
  initialDate: { type: Object, default: null }
})

const emit = defineEmits(['close', 'confirm'])

const today = new Date()

// 선택된 값들
const selectedYear = ref(today.getFullYear())
const selectedMonth = ref(today.getMonth() + 1)
const selectedDate = ref(today.getDate())
const selectedAmPm = ref('오전')
const selectedHour = ref(1)
const selectedMinute = ref('00')
const selectedSecond = ref('00')

watch(
  () => props.initialDate,
  (d) => {
    if (!d) return
    selectedYear.value = d.year || today.getFullYear()
    selectedMonth.value = d.month || today.getMonth() + 1
    selectedDate.value = d.date || today.getDate()
    selectedAmPm.value = d.ampm || '오전'
    selectedHour.value = d.hour || 1
    selectedMinute.value = d.minute != null ? String(d.minute).padStart(2, '0') : '00'
    selectedSecond.value = d.second != null ? String(d.second).padStart(2, '0') : '00'
  },
  { immediate: true }
)

// 최소 날짜 파싱
const parsedMinDate = computed(() => {
  if (!props.minDate) return null
  const [y, m, d] = props.minDate.split('-').map(Number)
  return { year: y, month: m, date: d }
})

// 년 리스트
const yearList = computed(() => {
  const start = parsedMinDate.value?.year || 1970
  return Array.from({ length: 100 }, (_, i) => start + i)
})

// 월 리스트
const monthList = computed(() => {
  const y = selectedYear.value
  const min = parsedMinDate.value
  const from = (min && y === min.year) ? min.month : 1
  return Array.from({ length: 12 - from + 1 }, (_, i) => from + i)
})

// 일 리스트
const dateList = computed(() => {
  const y = selectedYear.value
  const m = selectedMonth.value
  const max = new Date(y, m, 0).getDate()
  const min = parsedMinDate.value
  const from = (min && y === min.year && m === min.month) ? min.date : 1
  return Array.from({ length: max - from + 1 }, (_, i) => from + i)
})

watch([selectedYear, selectedMonth], () => {
  const maxDate = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  if (selectedDate.value > maxDate) {
    selectedDate.value = maxDate
  }
})

// 시간 관련 리스트
const ampmList = ['오전', '오후']
const hourList = computed(() => Array.from({ length: 12 }, (_, i) => i + 1))
const minuteList = computed(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')))
const secondList = computed(() => Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')))

const confirm = () => {
  const result = {
    year: selectedYear.value,
    month: selectedMonth.value,
    date: selectedDate.value || 1,
    ampm: selectedAmPm.value,
    hour: selectedHour.value,
    minute: selectedMinute.value,
    second: selectedSecond.value
  }
    if (props.maxDate) {
    const [maxY, maxM, maxD] = props.maxDate.split('-').map(Number)
    const selected = new Date(result.year, result.month - 1, result.date)
    const max = new Date(maxY, maxM - 1, maxD)

    if (selected > max) {
      alert('시작일은 종료일보다 앞서야 해요!')
      return
    }
  }
  
  console.log('[📌 confirm emit fired]', result)
  emit('confirm', result)
  emit('close')
}
</script>

<style scoped>
.wheel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
}
.wheel-popup {
  background: white;
  margin: 100px auto;
  padding: 20px;
  width: fit-content;
  border-radius: 8px;
}
.wheel-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 20px 0;
}
.pop_btm {
  width: 100%;
  padding: 10px;
  background: black;
  color: white;
  border: none;
  border-radius: 4px;
}
</style>
