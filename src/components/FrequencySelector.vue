<template>
  <div class="frequency-selector">
    <div class="question">얼마나 자주 반복해야 하나요?</div>
    <div class="tabs">
      <button
        :class="['tab', selected === 'daily' ? 'active' : '']"
        @click="select('daily')"
        type="button"
      >
        일별
      </button>
      <button
        :class="['tab', selected === 'weekly' ? 'active' : '']"
        @click="select('weekly')"
        type="button"
      >
        주별
      </button>
      <button
        :class="['tab', selected === 'monthly' ? 'active' : '']"
        @click="select('monthly')"
        type="button"
      >
        월별
      </button>
    </div>

    <!-- 주별 요일 선택 -->
    <div v-if="selected === 'weekly'" class="day-buttons">
      <button
        v-for="day in days"
        :key="day"
        :class="['day-btn', selectedDays.includes(day) ? 'selected' : '']"
        @click="toggleDay(day)"
        type="button"
      >
        {{ day }}
      </button>
    </div>

    <!-- 일별 시간 선택 -->
    <div v-if="selected === 'daily'" class="time-range">
      <div class="time-section">
        <label>시작 시간</label>
        <select v-model="startPeriod">
          <option value="오전">오전</option>
          <option value="오후">오후</option>
        </select>
        <select v-model="startHour">
          <option v-for="h in 12" :key="'sh' + h" :value="h">{{ h }}시</option>
        </select>
        <select v-model="startMinute">
          <option v-for="m in 60" :key="'sm' + m" :value="m">{{ String(m).padStart(2, '0') }}분</option>
        </select>
      </div>
      <div class="time-section">
        <label>종료 시간</label>
        <select v-model="endPeriod">
          <option value="오전">오전</option>
          <option value="오후">오후</option>
        </select>
        <select v-model="endHour">
          <option v-for="h in 12" :key="'eh' + h" :value="h">{{ h }}시</option>
        </select>
        <select v-model="endMinute">
          <option v-for="m in 60" :key="'em' + m" :value="m">{{ String(m).padStart(2, '0') }}분</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineExpose } from 'vue'

const selected = ref('daily')
const days = ['월', '화', '수', '목', '금', '토', '일']
const selectedDays = ref([])

const startPeriod = ref('오전')
const startHour = ref(1)
const startMinute = ref(0)

const endPeriod = ref('오전')
const endHour = ref(1)
const endMinute = ref(0)

function select(mode) {
  selected.value = mode
  if (mode !== 'weekly') selectedDays.value = []
}

function toggleDay(day) {
  if (selectedDays.value.includes(day)) {
    selectedDays.value = selectedDays.value.filter(d => d !== day)
  } else {
    selectedDays.value.push(day)
  }
}

defineExpose({
  getSelectedData: () => ({
    mode: selected.value,
    days: selectedDays.value,
    timeRange: {
      startPeriod: startPeriod.value,
      startHour: startHour.value,
      startMinute: startMinute.value,
      endPeriod: endPeriod.value,
      endHour: endHour.value,
      endMinute: endMinute.value
    }
  })
})
</script>

<style scoped>
.frequency-selector {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 1.2rem;
  padding: 2rem 1.5rem;
  margin-top: 2rem;
  text-align: center;
}

.question {
  font-weight: 700;
  color: #2d80cc;
  margin-bottom: 1.5rem;
  font-size: 1.4rem;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.tab {
  padding: 0.6rem 1.2rem;
  border-radius: 999rem;
  border: 1px solid #2d80cc;
  background-color: #fff;
  color: #2d80cc;
  font-weight: 600;
  font-size: 1.3rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tab.active {
  background-color: #2d80cc;
  color: #fff;
}

.day-buttons {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.day-btn {
  padding: 0.5rem 1rem;
  border-radius: 999rem;
  border: 1px solid #2d80cc;
  background-color: #fff;
  color: #2d80cc;
  font-weight: 600;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.day-btn.selected {
  background-color: #2d80cc;
  color: #fff;
}

.time-range {
  margin-top: 2rem;
  text-align: center;
}

.time-section {
  margin-bottom: 1.5rem;
}

.time-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.6rem;
}

.time-section select {
  margin: 0 0.3rem;
  padding: 0.5rem 0.8rem;
  font-size: 1.2rem;
  border: 1px solid #ccc;
  border-radius: 0.6rem;
  cursor: pointer;
}
</style>

