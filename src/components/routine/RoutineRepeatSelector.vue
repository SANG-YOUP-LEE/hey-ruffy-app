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
          v-for="btn in dailyIntervalButtons1"
          :key="'di1-'+btn.v"
          class="d_s_btn"
          :class="{ on_w: selectedDailyInterval === btn.v, light: selectedDailyInterval === btn.v }"
          @click="selectDailyInterval(btn.v)"
        >{{ btn.k }}</span>
      </div>
      <div class="s_group">
        <span
          v-for="btn in dailyIntervalButtons2"
          :key="'di2-'+btn.v"
          class="d_s_btn"
          :class="{ on_w: selectedDailyInterval === btn.v, light: selectedDailyInterval === btn.v }"
          @click="selectDailyInterval(btn.v)"
        >{{ btn.k }}</span>
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

const dailyIntervalButtons1 = [{k:'오늘만',v:0},{k:'2일마다',v:2},{k:'3일마다',v:3}]
const dailyIntervalButtons2 = [{k:'4일마다',v:4},{k:'5일마다',v:5},{k:'6일마다',v:6}]
const weeklyButtons1 = ['매주','2주마다','3주마다']
const weeklyButtons2 = ['4주마다','5주마다','6주마다']
const weeklyButtons3 = ['매일','월','화','수']
const weeklyButtons4 = ['목','금','토','일']

const props = defineProps({
  repeatType: { type: String, default: 'daily' },
  daily: { type: [Number, String, null], default: null },
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

// ▶ daily=0(오늘만)도 유지되도록 숫자 변환 로직 보강
const selectedDailyInterval = computed({
  get: () => {
    const n = (props.daily === '' || props.daily == null) ? null : Number(props.daily)
    return Number.isFinite(n) ? n : null
  },
  set: v => {
    const n = (v === '' || v == null) ? null : Number(v)
    emit('update:daily', Number.isFinite(n) ? n : null)
  }
})

const selectedWeeklyMain = computed({
  get: () => props.weeks,
  set: v => emit('update:weeks', v ?? '')
})

/**
 * ✅ 핵심: 편집 진입 시 7개 요일만 저장돼 있어도 '매일'을 자동 ON으로 보이게 함
 * - GET: 요일 7개 모두 있으면 ['매일', ...요일들]로 변환해 UI에 표시
 * - SET: '매일'이 포함되면 저장 값은 7개 요일로 정규화
 */
const selectedWeeklyDays = computed({
  get: () => {
    const arr = Array.isArray(props.weekDays) ? [...props.weekDays] : []
    const all = ['월','화','수','목','금','토','일']
    const hasAll = all.every(d => arr.includes(d))
    return hasAll && !arr.includes('매일') ? ['매일', ...all] : arr
  },
  set: v => {
    const all = ['월','화','수','목','금','토','일']
    if (Array.isArray(v) && v.includes('매일')) {
      emit('update:weekDays', [...all])
    } else {
      const next = Array.isArray(v) ? v.filter(d => d !== '매일') : []
      emit('update:weekDays', next)
    }
  }
})

const selectedDates = computed({
  get: () => props.monthDays,
  set: v => emit('update:monthDays', Array.isArray(v) ? [...v] : [])
})

const handleTabClick = (tab) => {
  selectedTab.value = tab
  if (tab === 'daily') {
    // ❌ 여기서 daily를 null로 초기화하지 않는다 (오늘만=0 유지)
  } else if (tab === 'weekly') {
    selectedWeeklyMain.value = ''
    selectedWeeklyDays.value = []
  } else if (tab === 'monthly') {
    selectedDates.value = []
  }
}

const selectDailyInterval = (n) => {
  selectedDailyInterval.value = Number(n)
}

const selectWeeklyMain = (btn) => {
  selectedWeeklyMain.value = btn
}

const toggleWeeklyDay = (btn) => {
  const cur = [...selectedWeeklyDays.value]
  if (btn === '매일') {
    selectedWeeklyDays.value = cur.includes('매일')
      ? []
      : ['매일','월','화','수','목','금','토','일']
    return
  }
  if (cur.includes(btn)) {
    const next = cur.filter(d => d !== btn)
    selectedWeeklyDays.value = next.includes('매일') && next.length < 8
      ? next.filter(d => d !== '매일')
      : next
  } else {
    cur.push(btn)
    const allDays = ['월','화','수','목','금','토','일']
    const hasAll = allDays.every(d => cur.includes(d))
    if (hasAll && !cur.includes('매일')) cur.unshift('매일')
    selectedWeeklyDays.value = cur
  }
}

/**
 * ✅ 월간 날짜는 최대 3개까지 선택 허용
 * - 4번째부터는 무시(필요하면 토스트 추가)
 */
const toggleDateSelection = (day) => {
  const cur = Array.isArray(selectedDates.value) ? [...selectedDates.value] : []
  if (cur.includes(day)) {
    selectedDates.value = cur.filter(d => d !== day)
    return
  }
  if (cur.length >= 3) {
    return
  }
  selectedDates.value = [...cur, day]
}
</script>
