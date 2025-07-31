<template>
  <div class="form_box_g limit">
    <h3>얼마나 자주 지켜야 하나요?</h3>
    <p>
      <button
        id="v_detail01"
        @click="handleTabClick('daily')"
        class="b_basic"
        :class="{ on: selectedTab === 'daily' }"
      >일간</button>

      <button
        id="v_detail02"
        @click="handleTabClick('weekly')"
        class="b_basic"
        :class="{ on: selectedTab === 'weekly' }"
      >주간</button>

      <button
        id="v_detail03"
        @click="handleTabClick('monthly')"
        class="b_basic"
        :class="{ on: selectedTab === 'monthly' }"
      >월간</button>
    </p>

    <!-- 일간 상세 -->
    <div class="detail_box daily" v-show="selectedTab === 'daily'">
      <WheelPicker
        v-model="selectedInterval"
        :options="['매일','2일마다','3일마다','4일마다','5일마다','6일마다']"
      />
    </div>

    <!-- 주간 상세 -->
    <div class="detail_box weekly" v-show="selectedTab === 'weekly'">
      <WheelPicker
        v-model="selectedWeeklyInterval"
        :options="['2주마다','3주마다','4주마다','5주마다']"
      />
      <p class="check_btn">
        <button
          class="all"
          @click="toggleAllDays"
          :class="{ light: isAllDaysSelected }"
        >매일</button>

        <button
          v-for="d in ['일','월','화','수','목','금','토']"
          :key="d + 'w'"
          @click="toggleDay(d)"
          :class="{ light: routineData.days.includes(d) }"
        >
          {{ d }}
        </button>
      </p>
    </div>

    <!-- 월간 상세 -->
    <div class="detail_box monthly" v-show="selectedTab === 'monthly'">
      <div class="monthly-grid">
        <span
          class="m_s_btn"
          v-for="day in 31"
          :key="day"
          @click="toggleDateSelection(day)"
          :class="{ selected: selectedDates.includes(day) }"
        >
          {{ day }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import WheelPicker from '@/components/common/WheelPicker.vue'

const routineData = reactive({
  days: []
})

const selectedTab = ref('daily')
const selectedDates = ref([])
const isAllDaysSelected = ref(false)
const selectedInterval = ref('3일마다')

onMounted(() => {
  selectedTab.value = 'daily'
  selectedInterval.value = '3일마다' // 기본 중앙값
})

const handleTabClick = (tab) => {
  selectedTab.value = tab
}

const toggleDay = (day) => {
  if (routineData.days.includes(day)) {
    routineData.days = routineData.days.filter(d => d !== day)
  } else {
    routineData.days.push(day)
  }
}

const toggleAllDays = () => {
  if (isAllDaysSelected.value) {
    routineData.days = []
  } else {
    routineData.days = ['일','월','화','수','목','금','토']
  }
  isAllDaysSelected.value = !isAllDaysSelected.value
}

const toggleDateSelection = (day) => {
  if (selectedDates.value.includes(day)) {
    selectedDates.value = selectedDates.value.filter(d => d !== day)
  } else {
    selectedDates.value.push(day)
  }
}

onMounted(() => {
  selectedTab.value = 'daily'
})
</script>
