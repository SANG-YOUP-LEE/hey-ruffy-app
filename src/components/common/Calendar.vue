<template>
  <div class="calendar-container" v-if="visible">
    <!-- 헤더 -->
    <div class="calendar-header">
      <button class="prev-btn" @click="goToPrevMonth">
        <img src="https://img.icons8.com/?size=100&id=40217&format=png&color=000000" />
        <span>이전달</span>
      </button>

      <div class="month-year">
        <span class="year" @click="openYearPicker">{{ currentYear }}</span>
        <button class="edit-btn" @click="openYearPicker">
          <img src="https://img.icons8.com/?size=100&id=vwGXRtPWrZSn&format=png&color=000000" />
        </button>

        <span class="month" @click="openMonthPicker">{{ currentMonth + 1 }}월</span>
        <button class="edit-btn" @click="openMonthPicker">
          <img src="https://img.icons8.com/?size=100&id=vwGXRtPWrZSn&format=png&color=000000" />
        </button>
      </div>

      <button class="prev-btn" @click="goToNextMonth">
        <img src="https://img.icons8.com/?size=100&id=7849&format=png&color=000000" />
        <span>다음달</span>
      </button>
    </div>

    <!-- 요일 -->
    <div class="calendar-weekdays">
      <div
        v-for="(w, i) in ['일','월','화','수','목','금','토']"
        :key="i"
        class="weekday"
        :class="{ sunday: i === 0, saturday: i === 6 }"
      >
        {{ w }}
      </div>
    </div>

    <!-- 날짜 -->
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

    <!-- 년도 선택 휠 -->
    <WheelPicker
      v-if="isYearPickerOpen"
      :items="yearList"
      :modelValue="currentYear"
      title="년도 선택"
      @update:modelValue="updateYear"
      @close="isYearPickerOpen = false"
    />

    <!-- 월 선택 휠 -->
    <WheelPicker
      v-if="isMonthPickerOpen"
      :items="monthList"
      :modelValue="currentMonth + 1"
      title="월 선택"
      @update:modelValue="updateMonth"
      @close="isMonthPickerOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import WheelPicker from '@/components/common/WheelPicker.vue'

defineProps({
  visible: Boolean
})

const isYearPickerOpen = ref(false)
const isMonthPickerOpen = ref(false)

const yearList = computed(() =>
  Array.from({ length: 30 }, (_, i) => 2000 + i)
)

const monthList = computed(() =>
  Array.from({ length: 12 }, (_, i) => i + 1)
)

const currentDate = ref(dayjs())

const currentYear = computed(() => currentDate.value.year())
const currentMonth = computed(() => currentDate.value.month())

const updateYear = (year) => {
  currentDate.value = currentDate.value.year(Number(year))
}

const updateMonth = (month) => {
  currentDate.value = currentDate.value.month(Number(month) - 1)
}

const openYearPicker = () => {
  isYearPickerOpen.value = true
}

const openMonthPicker = () => {
  isMonthPickerOpen.value = true
}

const calendarDays = computed(() => {
  const startOfMonth = currentDate.value.startOf('month')
  const endOfMonth = currentDate.value.endOf('month')

  const startDay = startOfMonth.day()
  const totalDays = endOfMonth.date()

  const days = []

  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }

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
  return day?.isSame(dayjs(), 'day')
}
</script>
