<template>
  <div class="frequency-selector">
    <div class="question">얼마나 자주 반복해야 하나요?</div>
    <div class="tabs">
      <button
        :class="['tab', selected === 'weekday' ? 'active' : '']"
        @click="select('weekday')"
      >
        요일별
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

    <!-- 하위 버튼 표시 영역 -->
    <div class="sub-options" v-if="selected === 'weekday'">
      <button
        v-for="(day, index) in weekdays"
        :key="index"
        :class="['day-button', selectedWeekdays.includes(day) ? 'selected' : '']"
        @click="toggleWeekday(day)"
      >
        {{ day }}
      </button>
    </div>
    <div class="sub-options" v-else-if="selected === 'weekly'">
      <select v-model="selectedWeek">
        <option v-for="week in 5" :key="week" :value="week">
          매월 {{ week }}주차
        </option>
      </select>
    </div>
    <div class="sub-options" v-else-if="selected === 'monthly'">
      <select v-model="selectedDay">
        <option v-for="d in 31" :key="d" :value="d">{{ d }}일</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const selected = ref('weekday')
const weekdays = ['월', '화', '수', '목', '금', '토', '일']
const selectedWeekdays = ref([])
const selectedWeek = ref(1)
const selectedDay = ref(1)

function select(mode) {
  selected.value = mode
}

function toggleWeekday(day) {
  if (selectedWeekdays.value.includes(day)) {
    selectedWeekdays.value = selectedWeekdays.value.filter(d => d !== day)
  } else {
    selectedWeekdays.value.push(day)
  }
}
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

.sub-options {
  margin-top: 1.2rem;
}

.day-button {
  padding: 0.4rem 0.9rem;
  margin: 0.2rem;
  border-radius: 0.8rem;
  border: 1px solid #aaa;
  background: #f9f9f9;
  font-size: 1rem;
  cursor: pointer;
}

.day-button.selected {
  background-color: #2d80cc;
  color: white;
  border-color: #2d80cc;
}
</style>

