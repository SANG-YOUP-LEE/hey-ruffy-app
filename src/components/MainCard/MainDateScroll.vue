<template>
  <div class="date_scroll">
    <div class="date_fixed_today">
      <span class="on" @click="selectToday">
        <i>{{ getDayLabel(today) }}</i>{{ today.getDate() }}
      </span>
    </div>

    <div class="date_group" ref="scroller">
      <span
        v-for="(date, i) in scrollDates"
        :key="i"
        :class="{ on: activeIndex === i && !isSameDay(date, today) }"
        @click="selectFromScroll(date, i)"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const emit = defineEmits(['selectDate'])
const props = defineProps({ selectedDate: { type: Date, required: true } })

const pastDays = 30
const futureDays = 30

const today = new Date()
today.setHours(0,0,0,0)

const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
const getDayLabel = (d)=> ['일','월','화','수','목','금','토'][d.getDay()]
const addDays = (base, n)=> { const d = new Date(base); d.setDate(base.getDate()+n); d.setHours(0,0,0,0); return d }

const scrollDates = computed(() => {
  const future = Array.from({length: futureDays}, (_,i)=> addDays(today, i+1))
  const past   = Array.from({length: pastDays},   (_,i)=> addDays(today, -(i+1)))
  return [...future, ...past]
})

const activeIndex = ref(null)
const scroller = ref(null)

const emitSelection = (date) => {
  const isToday = isSameDay(date, today)
  emit('selectDate', date, date > today && !isToday, isToday)
}

const selectToday = () => { activeIndex.value = null; emitSelection(today) }

const selectFromScroll = (date, i) => {
  activeIndex.value = i
  emitSelection(date)
}

onMounted(async () => {
  await nextTick()
  if (scroller.value) scroller.value.scrollLeft = 0
})
</script>
