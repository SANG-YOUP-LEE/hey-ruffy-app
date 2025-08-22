<template>
  <div class="ruffys_item">
    <span class="ruffy01"></span>
    <span class="ruffy02"></span>
    <span class="ruffy03"></span>
    <span class="ruffy04"></span>
  </div>
  <div class="date_scroll">
    <div class="date_fixed_today">
      <span
        class="on"
        :class="{ on: selectedIndex === 0 }"
        @click="selectToday"
      >
        <i>{{ getDayLabel(today) }}</i>{{ today.getDate() }}
      </span>
    </div>
    <div class="date_group">
      <span
        v-for="(date, index) in filteredDateList"
        :key="index"
        :class="{ on: selectedIndex === index + 1 }"
        @click="selectDate(index + 1)"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const emit = defineEmits(['selectDate'])
const props = defineProps({
  selectedDate: { type: Date, required: true }
})

const selectedIndex = ref(0)
const today = new Date()

const dateList = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(today.getDate() + i)
  d.setHours(0,0,0,0)
  return d
})
const filteredDateList = dateList.slice(1)

const getDayLabel = (date) => ['일','월','화','수','목','금','토'][date.getDay()]
const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()

const syncFromProp = () => {
  const idx = dateList.findIndex(d => isSameDay(d, props.selectedDate))
  selectedIndex.value = idx >= 0 ? idx : 0
}

const selectDate = (index) => {
  selectedIndex.value = index
  const selected = dateList[index]
  const now = new Date()
  const isFuture = selected > now && !isSameDay(selected, now)
  emit('selectDate', selected, isFuture)
}

const selectToday = () => { selectDate(0) }

watch(() => props.selectedDate, syncFromProp, { immediate: true })
onMounted(syncFromProp)
</script>
