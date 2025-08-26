<template>
  <div class="date_scroll">
    <div class="date_fixed_today">
      <span
        :class="{ on: isSameDay(selectedDate, today) }"
        @click="selectToday"
      >
        <i>{{ getDayLabel(today) }}</i>{{ today.getDate() }}
      </span>
    </div>

    <div class="date_group">
      <span
        v-for="(date, i) in scrollDates"
        :key="i"
        :class="{ on: isSameDay(selectedDate, date) }"
        @click="selectFromScroll(date)"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const emit = defineEmits(['selectDate'])
const props = defineProps({ selectedDate: { type: Date, required: true } })

const pastDays = 30
const futureDays = 30

const today = new Date()
today.setHours(0,0,0,0)

const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
const getDayLabel = (d)=> ['일','월','화','수','목','금','토'][d.getDay()]

const scrollDates = computed(() => {
  const arr = []
  for (let off = -pastDays; off <= futureDays; off++) {
    const d = new Date(today)
    d.setDate(today.getDate() + off)
    arr.push(d)
  }
  return arr
})

const emitSelection = (date) => {
  const now = new Date(); now.setHours(0,0,0,0)
  const isFuture = date > now && !isSameDay(date, now)
  emit('selectDate', date, isFuture)
}

const selectToday = () => emitSelection(today)
const selectFromScroll = (date) => emitSelection(date)
</script>
