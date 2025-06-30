<template>
  <div class="frequency-selector">
    <div class="question">얼마나 자주 반복해야 하나요?</div>
    <div class="tabs">
      <button
        :class="['tab', selected === 'daily' ? 'active' : '']"
        @click="select('daily')"
      >
        일별
      </button>
      <button
        :class="['tab', selected === 'weekly' ? 'active' : '']"
        @click="select('weekly')"
      >
        주별
      </button>
      <button
        :class="['tab', selected === 'monthly' ? 'active' : '']"
        @click="select('monthly')"
      >
        월별
      </button>
    </div>

    <!-- 일별: 시간 선택 -->
    <div v-if="selected === 'daily'" class="time-select">
      <div class="time-row">
        <label>시작 시간</label>
        <input type="time" v-model="startTime" />
      </div>
      <div class="time-row">
        <label>종료 시간</label>
        <input type="time" v-model="endTime" />
      </div>
    </div>

    <!-- 주별: 요일 선택 -->
    <div v-if="selected === 'weekly'" class="day-buttons">
      <button
        class="day-btn"
        :class="{ selected: isAllDaysSelected }"
        @click="toggleAllDays"
        type="button"
      >
        매일
      </button>
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

    <!-- 월별: 추후 구현 -->
    <div v-if="selected === 'monthly'" class="monthly-placeholder">
      <p>월별 기능은 곧 추가될 예정이에요.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineExpose } from 'vue'

const selected = ref('daily') // 기본값: 일별
const days = ['월', '화', '수', '목', '금', '토', '일']
const selectedDays = ref([])
const startTime = ref('')
const endTime = ref('')

function select(mode) {
  selected.value = mode
  // 탭 바뀔 때 값 초기화
  if (mode !== 'weekly') {
    selectedDays.value = []
  }
  if (mode !== 'daily') {
    startTime.value = ''
    endTime.value = ''
  }
}

function toggleDay(day) {
  if (selectedDays.value.includes(day)) {
    selectedDays.value = selectedDays.value.filter(d => d !== day)
  } else {
    selectedDays.value.push(day)
  }
}

function toggleAllDays() {
  if (isAllDaysSelected.value) {
    selectedDays.value = []
  } else {
    selectedDays.value = [...days]
  }
}

const isAllDaysSelected = computed(() => {
  return days.every(d => selectedDays.value.includes(d))
})

defineExpose({
  getSelectedData: () => ({
    mode: selected.value,
    days: selected.value === 'weekly' ? selectedDays.value : [],
    startTime: selected.value === 'daily' ? startTime.value : '',
    endTime: selected.value === 'daily' ? endTime.value : ''
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
  margin-bottom: 1rem;
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
}

.tab.active {
  background-color: #2d80cc;
  color: #fff;
}

.day-buttons {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.6rem;
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
}

.day-btn.selected {
  background-color: #2d80cc;
  color: #fff;
}

.time-select {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.time-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1.2rem;
  color: #2d80cc;
}
.time-row input[type="time"] {
  margin-top: 0.5rem;
  padding: 0.4rem 1rem;
  border: 1px solid #ccc;
  border-radius: 0.6rem;
  font-size: 1.2rem;
}
</style>
