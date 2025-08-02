<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01">
        <ToggleSwitch class="toggle" v-model="isStartDateOn" label="시작일 지정" />
        <ToggleSwitch class="toggle" v-model="isEndDateOn" label="종료일 지정" />
      </div>

      <!-- 시작일 휠피커 -->
      <div v-if="isStartDateOn" class="start_date">
        <ScrollPicker
          v-model="selectedYear"
          :options="years"
          label-key="name"
          value-key="value"
        />
        <ScrollPicker
          v-model="selectedMonth"
          :options="months"
          label-key="name"
          value-key="value"
        />
        <ScrollPicker
          v-model="selectedDay"
          :options="days"
          label-key="name"
          value-key="value"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import ScrollPicker from 'vue-scroll-picker'

const isStartDateOn = ref(false)
const isEndDateOn = ref(false)

const currentYear = new Date().getFullYear()

const years = Array.from({ length: 50 }, (_, i) => ({
  name: `${currentYear - 30 + i}년`,
  value: currentYear - 30 + i
}))
const months = Array.from({ length: 12 }, (_, i) => ({
  name: `${i + 1}월`,
  value: i + 1
}))

const days = ref([])

const selectedYear = ref(currentYear)
const selectedMonth = ref(1)
const selectedDay = ref(1)

const updateDays = () => {
  const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  days.value = Array.from({ length: lastDay }, (_, i) => ({
    name: `${i + 1}일`,
    value: i + 1
  }))
}

watch([selectedYear, selectedMonth], updateDays, { immediate: true })
</script>

<style scoped>
.start_date {
  display: flex;
  gap: 8px;
  margin-top: 1rem;
  width: 100%;
}

.scroll-picker {
  width: 100%;
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.scroll-picker-item {
  text-align: center;
  padding: 8px 0;
  cursor: pointer;
}

.scroll-picker-item:hover {
  background-color: #f5f5f5;
}
</style>