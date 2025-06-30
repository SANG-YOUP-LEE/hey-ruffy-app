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
  </div>
</template>

<script setup>
import { ref } from 'vue'

const selected = ref('weekday')

function select(mode) {
  selected.value = mode
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
</style>
