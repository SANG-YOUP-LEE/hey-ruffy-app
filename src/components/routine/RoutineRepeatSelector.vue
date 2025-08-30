<template>
  <div class="form_box_g">
    <h3>얼마나 자주 지켜야 하나요?</h3>

    <div class="tab">
      <button id="v_detail01" @click="handleTabClick('daily')" :class="{ on: selectedTab === 'daily' }">일간</button>
      <button id="v_detail02" @click="handleTabClick('weekly')" :class="{ on: selectedTab === 'weekly' }">주간</button>
      <button id="v_detail03" @click="handleTabClick('monthly')" :class="{ on: selectedTab === 'monthly' }">월간</button>
    </div>

    <div class="detail_box daily" v-show="selectedTab === 'daily'">
      <div class="s_group">
        <span
          v-for="btn in dailyButtonsGroup1"
          :key="'d1-'+btn"
          class="d_s_btn"
          :class="{ on_w: selectedDaily.includes(btn), light: selectedDaily.includes(btn) }"
          @click="selectDailyBtn(btn)"
        >{{ btn }}</span>
      </div>
      <div class="s_group">
        <span
          v-for="btn in dailyButtonsGroup2"
          :key="'d2-'+btn"
          class="d_s_btn"
          :class="{ on_w: selectedDaily.includes(btn), light: selectedDaily.includes(btn) }"
          @click="selectDailyBtn(btn)"
        >{{ btn }}</span>
      </div>
    </div>

    <div class="detail_box weekly" v-show="selectedTab === 'weekly'">
      <div class="s_group">
        <span
          v-for="btn in weeklyButtons1"
          :key="'w1-'+btn"
          class="d_s_btn"
          :class="{ on_w: selectedWeeklyMain === btn, light: selectedWeeklyMain === btn }"
          @click="selectWeeklyMain(btn)"
        >{{ btn }}</span>
      </div>
      <div class="s_group">
        <span
          v-for="btn in weeklyButtons2"
          :key="'w2-'+btn"
          class="d_s_btn"
          :class="{ on_w: selectedWeeklyMain === btn, light: selectedWeeklyMain === btn }"
          @click="selectWeeklyMain(btn)"
        >{{ btn }}</span>
      </div>
      <div class="s_group_wrap">
        <div class="s_group">
          <span
            v-for="btn in weeklyButtons3"
            :key="'w3-'+btn"
            class="d_s_btn"
            :class="{ on_w: selectedWeeklyDays.includes(btn), light: selectedWeeklyDays.includes(btn) }"
            @click="toggleWeeklyDay(btn)"
          >{{ btn }}</span>
        </div>
        <div class="s_group">
          <span
            v-for="btn in weeklyButtons4"
            :key="'w4-'+btn"
            class="d_s_btn"
            :class="{ on_w: selectedWeeklyDays.includes(btn), light: selectedWeeklyDays.includes(btn) }"
            @click="toggleWeeklyDay(btn)"
          >{{ btn }}</span>
        </div>
      </div>
    </div>

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
import { computed } from 'vue'

const dailyButtonsGroup1 = ['매일','월','화','수']
const dailyButtonsGroup2 = ['목','금','토','일']
const weeklyButtons1 = ['매주','2주마다','3주마다']
const weeklyButtons2 = ['4주마다','5주마다','6주마다']
const weeklyButtons3 = ['매일','월','화','수']
const weeklyButtons4 = ['목','금','토','일']

const props = defineProps({
  repeatType: { type: String, default: 'daily' },
  daily: { type: Array, default: () => [] },
  weeks: { type: String, default: '' },
  weekDays: { type: Array, default: () => [] },
  monthDays: { type: Array, default: () => [] }
})
const emit = defineEmits([
  'update:repeatType','update:daily','update:weeks','update:weekDays','update:monthDays'
])

const selectedTab = computed({
  get: () => props.repeatType || 'daily',
  set: v => emit('update:repeatType', v)
})
const selectedDaily = computed({
  get: () => props.daily,
  set: v => emit('update:daily', Array.isArray(v) ? [...v] : [])
})
const selectedWeeklyMain = computed({
  get: () => props.weeks,
  set: v => emit('update:weeks', v ?? '')
})
const selectedWeeklyDays = computed({
  get: () => props.weekDays,
  set: v => emit('update:weekDays', Array.isArray(v) ? [...v] : [])
})
const selectedDates = computed({
  get: () => props.monthDays,
  set: v => emit('update:monthDays', Array.isArray(v) ? [...v] : [])
})

const handleTabClick = (tab) => {
  selectedTab.value = tab
  if (tab === 'daily') {
    selectedDaily.value = []
  } else if (tab === 'weekly') {
    selectedWeeklyMain.value = ''
    selectedWeeklyDays.value = []
  } else if (tab === 'monthly') {
    selectedDates.value = []
  }
}

const selectDailyBtn = (btn) => {
  const cur = [...selectedDaily.value]
  if (btn === '매일') {
    selectedDaily.value = cur.includes('매일') ? [] : ['매일','월','화','수','목','금','토','일']
    return
  }
  if (cur.includes(btn)) {
    const next = cur.filter(d => d !== btn)
    selectedDaily.value = next.includes('매일') && next.length < 8 ? next.filter(d => d !== '매일') : next
  } else {
    cur.push(btn)
    const allDays = ['월','화','수','목','금','토','일']
    const hasAll = allDays.every(d => cur.includes(d))
    if (hasAll && !cur.includes('매일')) cur.unshift('매일')
    selectedDaily.value = cur
  }
}

const selectWeeklyMain = (btn) => {
  selectedWeeklyMain.value = btn
}

const toggleWeeklyDay = (btn) => {
  const cur = [...selectedWeeklyDays.value]
  if (btn === '매일') {
    selectedWeeklyDays.value = cur.includes('매일') ? [] : ['매일','월','화','수','목','금','토','일']
    return
  }
  if (cur.includes(btn)) {
    const next = cur.filter(d => d !== btn)
    selectedWeeklyDays.value = next.includes('매일') && next.length < 8 ? next.filter(d => d !== '매일') : next
  } else {
    cur.push(btn)
    const allDays = ['월','화','수','목','금','토','일']
    const hasAll = allDays.every(d => cur.includes(d))
    if (hasAll && !cur.includes('매일')) cur.unshift('매일')
    selectedWeeklyDays.value = cur
  }
}

const toggleDateSelection = (day) => {
  const cur = [...selectedDates.value]
  selectedDates.value = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day]
}
</script>