<template>
  <div class="calendar-container" v-if="visible">
    <div class="calendar-header">
      <button class="prev-btn" @click="goToPrevMonth">
        <img src="https://img.icons8.com/?size=100&id=40217&format=png&color=000000" />
        <span>이전달</span>
      </button>
      <div class="month-year">
        <span class="year">{{ currentYear }}</span>
        <button class="edit-btn" @click="openYearPicker">
          <img src="https://img.icons8.com/?size=100&id=vwGXRtPWrZSn&format=png&color=000000" />
        </button>
        <span class="month">{{ currentMonth + 1 }}월</span>
        <button class="edit-btn" @click="openMonthPicker">
          <img src="https://img.icons8.com/?size=100&id=vwGXRtPWrZSn&format=png&color=000000" />
        </button>
      </div>
      <button class="prev-btn" @click="goToNextMonth">
        <img src="https://img.icons8.com/?size=100&id=7849&format=png&color=000000" />
        <span>다음달</span>
      </button>
    </div>

    <div class="calendar-weekdays">
      <div
        class="weekday"
        v-for="(w, i) in ['일','월','화','수','목','금','토']"
        :key="i"
        :class="{ sunday: i === 0, saturday: i === 6 }"
      >
        {{ w }}
      </div>
    </div>

    <div class="calendar-grid">
      <div
        v-for="(day, index) in calendarDays"
        :key="index"
        :class="[
          'day',
          { empty: !day },
          index % 7 === 0 ? 'sunday' : '',
          index % 7 === 6 ? 'saturday' : '',
          day && isToday(day) ? 'today' : ''
        ]"
      >
        {{ day ? day.date() : '' }}
      </div>
    </div>
  </div>

  <WheelPicker
    v-if="isYearPickerOpen"
    :items="yearList"
    v-model:selected="tempSelected"
    title="년도 선택"
    @close="applyYear"
  />

  <WheelPicker
    v-if="isMonthPickerOpen"
    :items="monthList"
    v-model:selected="tempSelected"
    title="월 선택"
    @close="applyMonth"
  />
</template>

<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import WheelPicker from '@/components/common/WheelPicker.vue'

defineProps({
  visible: Boolean
})

const applyYear = () => {
  currentDate.value = currentDate.value.year(Number(tempSelected.value))
  isYearPickerOpen.value = false
}

const applyMonth = () => {
  currentDate.value = currentDate.value.month(Number(tempSelected.value) - 1)
  isMonthPickerOpen.value = false
}
const isYearPickerOpen = ref(false)
const isMonthPickerOpen = ref(false)

const yearList = computed(() =>
  Array.from({ length: 30 }, (_, i) => 2000 + i)
)

const monthList = computed(() =>
  Array.from({ length: 12 }, (_, i) => i + 1)
)

const tempSelected = ref(null)
const openYearPicker = () => {
  tempSelected.value = currentYear.value
  isYearPickerOpen.value = true
}

const openMonthPicker = () => {
  tempSelected.value = currentMonth.value + 1
  isMonthPickerOpen.value = true
}

const currentDate = ref(dayjs())

const currentYear = computed(() => currentDate.value.year())
const currentMonth = computed(() => currentDate.value.month())

const calendarDays = computed(() => {
  const startOfMonth = currentDate.value.startOf('month')
  const endOfMonth = currentDate.value.endOf('month')

  const startDay = startOfMonth.day()
  const totalDays = endOfMonth.date()

  const days = []

  // 앞에 비어있는 칸
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }

  // 날짜 채우기 (dayjs 객체로)
  for (let d = 1; d <= totalDays; d++) {
    days.push(currentDate.value.date(d))
  }

  return days
})

const goToPrevMonth = () => {
  currentDate.value = currentDate.value.subtract(1, 'month')
}

const goToNextMonth = () => {
  currentDate.value = currentDate.value.add(1, 'month')
}

const isToday = (day) => {
  if (!day) return false
  return day.isSame(dayjs(), 'day')
}
</script>
