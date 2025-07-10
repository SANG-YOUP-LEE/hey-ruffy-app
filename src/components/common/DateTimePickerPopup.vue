<template>
  <teleport to="body">
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
  minDate: { type: String, default: null } // "2025-07-09"
})

const emit = defineEmits(['close', 'confirm'])

const today = new Date()
const selectedYear = ref(today.getFullYear())
const selectedMonth = ref(today.getMonth() + 1)
const selectedDate = ref(today.getDate())
const selectedAmPm = ref('오전')
const selectedHour = ref(1)
const selectedMinute = ref(0)
const selectedSecond = ref(0)

const parsedMinDate = computed(() => {
  if (!props.minDate) return null
  const [y, m, d] = props.minDate.split('-').map(Number)
  return { year: y, month: m, date: d }
})

const yearList = computed(() => {
  const start = parsedMinDate.value ? parsedMinDate.value.year : 1970
  return Array.from({ length: 100 }, (_, i) => start + i)
})

const monthList = computed(() => {
  const curY = selectedYear.value
  const min = parsedMinDate.value
  const from = (min && curY === min.year) ? min.month : 1
  return Array.from({ length: 12 - from + 1 }, (_, i) => from + i)
})

const dateList = computed(() => {
  const curY = selectedYear.value
  const curM = selectedMonth.value
  const daysInMonth = new Date(curY, curM, 0).getDate()
  const min = parsedMinDate.value
  const from = (min && curY === min.year && curM === min.month) ? min.date : 1
  return Array.from({ length: daysInMonth - from + 1 }, (_, i) => from + i)
})

watch([selectedYear, selectedMonth], () => {
  const dates = dateList.value
  if (!dates.includes(selectedDate.value)) {
    selectedDate.value = dates[0]
  }
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
