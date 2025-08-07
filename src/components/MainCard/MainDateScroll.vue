<template>
  <div class="date_scroll">
    <div class="date_fixed_today">
      <span
        class="on_w_nt"
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
import { ref, onMounted } from 'vue'

const emit = defineEmits(['selectDate'])

const selectedIndex = ref(0)

const today = new Date()

const dateList = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(today.getDate() + i)
  return d
})

const filteredDateList = dateList.slice(1)

const getDayLabel = (date) => {
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return days[date.getDay()]
}

const isToday = (date) => {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

const selectDate = (index) => {
  selectedIndex.value = index
  const selected = dateList[index]
  const now = new Date()
  const isFuture = selected > now && !isToday(selected)
  emit('selectDate', selected, isFuture)
}

const selectToday = () => {
  selectedIndex.value = 0
  emit('selectDate', today, false)
}

onMounted(() => {
  selectedIndex.value = 0
  emit('selectDate', today, false)
})
</script>
