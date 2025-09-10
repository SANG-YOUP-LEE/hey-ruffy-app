<template>
  <div class="date_scroll">
    <div class="date_fixed_today" ref="todayRef">
      <span class="on" @click="selectToday">
        <i>{{ getDayLabel(today) }}</i>{{ today.getDate() }}
      </span>
    </div>
    <div class="date_group" ref="scroller">
      <span
        v-for="(date, i) in scrollDates"
        :key="i"
        :class="{ on: activeIndex === i }"
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

const scrollDates = computed(() => [
  ...Array.from({length: pastDays}, (_,i)=> addDays(today, -(pastDays - i))),
  today,
  ...Array.from({length: futureDays}, (_,i)=> addDays(today, i+1))
])

const activeIndex = ref(null)
const scroller = ref(null)
const todayRef = ref(null)

const emitSelection = (date) => {
  const isToday = isSameDay(date, today)
  emit('selectDate', date, date > today && !isToday, isToday)
}

const safeLeftPx = () => {
  const wrap = scroller.value.getBoundingClientRect()
  const t = todayRef.value.getBoundingClientRect()
  return Math.round(t.right - wrap.left) + 2
}

const scrollToIndex = (idx, smooth = true) => {
  if (!scroller.value) return
  const el = scroller.value.children[idx]
  if (!el) return
  const snap = -60
  const left = Math.max(0, el.offsetLeft - safeLeftPx() + snap)
  scroller.value.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' })
}

const ensureVisible = (idx) => {
  if (!scroller.value) return
  const wrap = scroller.value.getBoundingClientRect()
  const el = scroller.value.children[idx]
  if (!el) return
  const r = el.getBoundingClientRect()
  const leftGuard = wrap.left + safeLeftPx()
  const rightFade = 32
  if (r.left < leftGuard || r.right > wrap.right - rightFade) scrollToIndex(idx)
}

const selectToday = () => {
  activeIndex.value = null
  emitSelection(today)
  ensureVisible(pastDays)
}

const selectFromScroll = (date, i) => {
  activeIndex.value = i
  emitSelection(date)
  ensureVisible(i)
}

onMounted(async () => {
  await nextTick()
  requestAnimationFrame(() => {
    const tomorrowIdx = pastDays + 1
    scrollToIndex(tomorrowIdx, false)
  })
})
</script>
