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

    <!-- 시간 선택 (일별일 경우에만) -->
    <div v-if="selected === 'daily'" class="hour-buttons">
      <button
        :class="['hour-btn', isAllHoursSelected ? 'selected' : '']"
        @click="toggleAllHours"
        type="button"
      >
        매일
      </button>
      <button
        v-for="hour in 24"
        :key="hour"
        :class="['hour-btn', selectedHours.includes(hour) ? 'selected' : '']"
        @click="toggleHour(hour)"
        type="button"
      >
        {{ hour }}시
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineExpose } from 'vue'

const selected = ref('daily')
const selectedHours = ref([])

function select(mode) {
  selected.value = mode
  if (mode !== 'daily') {
    selectedHours.value = []
  }
}

function toggleHour(hour) {
  if (selectedHours.value.includes(hour)) {
    selectedHours.value = selectedHours.value.filter(h => h !== hour)
  } else {
    selectedHours.value.push(hour)
  }
}

function toggleAllHours() {
  if (isAllHoursSelected.value) {
    selectedHours.value = []
  } else {
    selectedHours.value = Array.from({ length: 24 }, (_, i) => i)
  }
}

const isAllHoursSelected = computed(() => selectedHours.value.length === 24)

defineExpose({
  getSelectedData: () => ({
    mode: selected.value,
    hours: selectedHours.value
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

.hour-buttons {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
}

.hour-btn {
  padding: 0.5rem 0.8rem;
  border-radius: 999rem;
  border: 1px solid #2d80cc;
  background-color: #fff;
  color: #2d80cc;
  font-size: 1.2rem;
  transition: all 0.2s ease;
}

.hour-btn.selected {
  background-color: #2d80cc;
  color: #fff;
}
</style>
