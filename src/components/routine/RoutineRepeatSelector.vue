<template>
  <div class="form_box_g limit">
    <h3>얼마나 자주 지켜야 하나요?</h3>
    <div class="tab">
      <button
        id="v_detail01"
        @click="handleTabClick('daily')"
        :class="{ on: selectedTab === 'daily' }"
      >일간</button>

      <button
        id="v_detail02"
        @click="handleTabClick('weekly')"
        :class="{ on: selectedTab === 'weekly' }"
      >주간</button>

      <button
        id="v_detail03"
        @click="handleTabClick('monthly')"
        :class="{ on: selectedTab === 'monthly' }"
      >월간</button>
    </div>

    <!-- 일간 상세 -->
    <div class="detail_box daily" v-show="selectedTab === 'daily'">
      일
    </div>

    <!-- 주간 상세 -->
    <div class="detail_box weekly" v-show="selectedTab === 'weekly'">
      월
    </div>

    <!-- 월간 상세 -->
    <div class="detail_box monthly" v-show="selectedTab === 'monthly'">
      <div class="monthly-grid">
        <span
          class="m_s_btn"
          v-for="day in 31"
          :key="day"
          @click="toggleDateSelection(day)"
          :class="{ light: selectedDates.includes(day) }"
        >
          {{ day }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const selectedTab = ref('daily')
const selectedDates = ref([])

onMounted(() => {
  selectedTab.value = 'daily'
})

const handleTabClick = (tab) => {
  selectedTab.value = tab
}

const toggleDateSelection = (day) => {
  if (selectedDates.value.includes(day)) {
    selectedDates.value = selectedDates.value.filter(d => d !== day)
  } else {
    selectedDates.value.push(day)
  }
}
</script>
