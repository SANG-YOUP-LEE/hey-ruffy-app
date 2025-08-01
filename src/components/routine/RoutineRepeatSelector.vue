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
          v-for="(btn, index) in dailyButtonsGroup1"
          :key="'d1-'+index"
          class="d_s_btn"
          :class="{ on_w: selectedDaily.includes(btn), light: selectedDaily.includes(btn) }"
          @click="selectDailyBtn(btn)"
        >{{ btn }}</span>
      </div>
      <div class="s_group">
        <span
          v-for="(btn, index) in dailyButtonsGroup2"
          :key="'d2-'+index"
          class="d_s_btn"
          :class="{ on_w: selectedDaily.includes(btn), light: selectedDaily.includes(btn) }"
          @click="selectDailyBtn(btn)"
        >{{ btn }}</span>
      </div>
    </div>

    <!-- 주간 상세 -->
    <div class="detail_box weekly" v-show="selectedTab === 'weekly'">
       <div class="s_group">
        <span
          v-for="(btn, index) in weeklyButtons1"
          :key="'w1-'+index"
          class="d_s_btn"
          :class="{ on_w: selectedWeekly1 === btn, light: selectedWeekly1 === btn }"
          @click="selectWeeklyBtn1(btn)"
        >{{ btn }}</span>
       </div>
       <div class="s_group">
        <span
          v-for="(btn, index) in weeklyButtons2"
          :key="'w2-'+index"
          class="d_s_btn"
          :class="{ on_w: selectedWeekly2 === btn, light: selectedWeekly2 === btn }"
          @click="selectWeeklyBtn2(btn)"
        >{{ btn }}</span>
       </div>
       <div class="s_group">
        <span
          v-for="(btn, index) in weeklyButtons3"
          :key="'w3-'+index"
          class="d_s_btn"
          :class="{ on_w: selectedWeeklyDays.includes(btn), light: selectedWeeklyDays.includes(btn) }"
          @click="selectWeeklyDay(btn)"
        >{{ btn }}</span>
      </div>
      <div class="s_group">
        <span
          v-for="(btn, index) in weeklyButtons4"
          :key="'w4-'+index"
          class="d_s_btn"
          :class="{ on_w: selectedWeeklyDays.includes(btn), light: selectedWeeklyDays.includes(btn) }"
          @click="selectWeeklyDay(btn)"
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

// 버튼 그룹 데이터
const dailyButtonsGroup1 = ['매일','월','화','수']
const dailyButtonsGroup2 = ['목','금','토','일']

const weeklyButtons1 = ['매주','2주마다','3주마다']
const weeklyButtons2 = ['4주마다','5주마다','6주마다']
const weeklyButtons3 = ['매일','월','화','수']
const weeklyButtons4 = ['목','금','토','일']

// 선택 상태
const selectedDaily = ref([])
const selectedWeekly1 = ref('')
const selectedWeekly2 = ref('')
const selectedWeeklyDays = ref([])

onMounted(() => {
  resetSelections('daily')
})

// 탭 전환 시 초기화
const handleTabClick = (tab) => {
  selectedTab.value = tab
  resetSelections(tab)
}

// daily 선택 로직
const selectDailyBtn = (btn) => {
  if (btn === '매일') {
    if (selectedDaily.value.includes('매일')) {
      selectedDaily.value = ['월']
    } else {
      selectedDaily.value = ['매일','월','화','수','목','금','토','일']
    }
  } else {
    selectedDaily.value = [btn]
  }
}

// weekly 선택 로직
const selectWeeklyBtn1 = (btn) => {
  selectedWeekly1.value = btn
}
const selectWeeklyBtn2 = (btn) => {
  selectedWeekly2.value = btn
}
const selectWeeklyDay = (btn) => {
  if (btn === '매일') {
    if (selectedWeeklyDays.value.includes('매일')) {
      selectedWeeklyDays.value = ['월']
    } else {
      selectedWeeklyDays.value = ['매일','월','화','수','목','금','토','일']
    }
  } else {
    if (selectedWeeklyDays.value.includes('매일')) {
      selectedWeeklyDays.value = [btn]
    } else {
      selectedWeeklyDays.value = [btn]
    }
  }
}

// 월간 선택
const toggleDateSelection = (day) => {
  if (selectedDates.value.includes(day)) {
    selectedDates.value = selectedDates.value.filter(d => d !== day)
  } else {
    selectedDates.value.push(day)
  }
}

// 탭별 초기화
const resetSelections = (tab) => {
  if (tab === 'daily') {
    selectedDaily.value = ['월']
  } else if (tab === 'weekly') {
    selectedWeekly1.value = '매주'
    selectedWeekly2.value = ''
    selectedWeeklyDays.value = ['월']
  } else if (tab === 'monthly') {
    selectedDates.value = []
  }
}
</script>
