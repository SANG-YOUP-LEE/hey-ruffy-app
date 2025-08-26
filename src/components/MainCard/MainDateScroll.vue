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
defineProps({ selectedDate: { type: Date, required: true } })

const pastDays = 30
const futureDays = 30

const today = new Date()
today.setHours(0,0,0,0)

const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
const getDayLabel = (d)=> ['일','월','화','수','목','금','토'][d.getDay()]
const addDays = (base, n)=> { const d = new Date(base); d.setDate(base.getDate()+n); d.setHours(0,0,0,0); return d }

const pastAsc = computed(() =>
  Array.from({length: pastDays}, (_,i)=> addDays(today, -(pastDays - i)))
)
const tomorrow = computed(() => addDays(today, 1))
const futureAsc = computed(() =>
  Array.from({length: futureDays-1}, (_,i)=> addDays(today, i+2))
)

const scrollDates = computed(() => [...pastAsc.value, tomorrow.value, ...futureAsc.value])

const activeIndex = ref(null)
const scroller = ref(null)

const emitSelection = (date) => {
  const isToday = isSameDay(date, today)
  emit('selectDate', date, date > today && !isToday, isToday)
}

const selectToday = () => { activeIndex.value = null; emitSelection(today) }
const selectFromScroll = (date, i) => { activeIndex.value = i; emitSelection(date) }

onMounted(async () => {
  await nextTick()
  if (!scroller.value) return
  const pastCount = pastAsc.value.length
  const nodes = scroller.value.children
  let w = 0
  for (let i = 0; i < pastCount && i < nodes.length; i++) w += nodes[i].offsetWidth
  scroller.value.scrollLeft = w
})
</script>
