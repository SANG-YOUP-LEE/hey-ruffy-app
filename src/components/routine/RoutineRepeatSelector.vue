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
      <div class="s_group">
        <span
          v-for="(btn, index) in dailyButtons"
          :key="index"
          class="d_s_btn"
          :class="{ on_w: selectedDailyIndex === index }"
          @click="selectDailyBtn(index)"
        >{{ btn }}</span>
      </div>
    </div>

    <!-- 주간 상세 -->
    <div class="detail_box weekly" v-show="selectedTab === 'weekly'">
       <div class="s_group">
        <span
          v-for="(btn, index) in weeklyButtons1"
          :key="index"
          class="d_s_btn"
          :class="{ on_w: selectedWeeklyIndex1 === index }"
          @click="selectWeeklyBtn1(index)"
        >{{ btn }}</span>
       </div>
       <div class="s_group">
        <span
          v-for="(btn, index) in weeklyButtons2"
          :key="index"
          class="d_s_btn"
          :class="{ on_w: selectedWeeklyIndex2 === index }"
          @click="selectWeeklyBtn2(index)"
        >{{ btn }}</span>
      </div>
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

const dailyButtons = ['매일','일','월','화','수','목','금','토']
const weeklyButtons1 = ['매주','2주마다','3주마다','4주마다','5주마다']
const weeklyButtons2 = ['일','월','화','수','목','금','토']

const selectedDailyIndex = ref(0)
const selectedWeeklyIndex1 = ref(0)
const selectedWeeklyIndex2 = ref(0)

onMounted(() => {
  selectedTab.value = 'daily'
  selectedDailyIndex.value = 0
  selectedWeeklyIndex1.value = 0
  selectedWeeklyIndex2.value = 0
})

const handleTabClick = (tab) => {
  selectedTab.value = tab
}

const selectDailyBtn = (index) => {
  selectedDailyIndex.value = index
}

const selectWeeklyBtn1 = (index) => {
  selectedWeeklyIndex1.value = index
}

const selectWeeklyBtn2 = (index) => {
  selectedWeeklyIndex2.value = index
}

const toggleDateSelection = (day) => {
  if (selectedDates.value.includes(day)) {
    selectedDates.value = selectedDates.value.filter(d => d !== day)
  } else {
    selectedDates.value.push(day)
  }
}
</script>
