<template> 
  <div class="date_scroll">
    <div class="date_group">
      <span
        v-for="(date, index) in dateList"
        :key="index"
        :class="{ on: selectedIndex === index, on_w_nt: isToday(date) }"
        @click="selectDate(index)"
      >
        <i>{{ getDayLabel(date) }}</i>{{ date.getDate() }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['selectDate'])

const selectedIndex = ref(null)

const today = new Date()

const dateList = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(today.getDate() + i)
  return d
})

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

onMounted(() => {
  selectedIndex.value = dateList.findIndex((date) => isToday(date))
  const selected = dateList[selectedIndex.value]
  emit('selectDate', selected, false) // 오늘은 미래가 아님
})
</script>
