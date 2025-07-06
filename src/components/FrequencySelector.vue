<template>
  <div class="p_group">
    <h3>얼마나 자주 반복해야 하나요?</h3>
    <div class="input_set">
      <!-- 주기 설정 탭 -->
      <div class="button" id="repeatTab">
        <a
          href="#none"
          class="tab_button"
          :class="{ on: selectedType === 'daily' }"
          @click.prevent="selectTab('daily')"
          data-type="daily"
          >요일별</a
        >
        <a
          href="#none"
          class="tab_button"
          :class="{ on: selectedType === 'weekly' }"
          @click.prevent="selectTab('weekly')"
          data-type="weekly"
          >주별</a
        >
        <a
          href="#none"
          class="tab_button"
          :class="{ on: selectedType === 'monthly' }"
          @click.prevent="selectTab('monthly')"
          data-type="monthly"
          >월별</a
        >
      </div>

      <div class="repeat_content" id="repeatContent">
        <!-- 요일 별 -->
        <div class="repeat_section daily" v-show="selectedType === 'daily'">
          <div class="inner_set" style="margin-bottom: 1rem">
            <NativeWheel
              :items="dailyRepeatOptions"
              :initialSelectedIndex="dailyRepeatSelectedIndex"
              @update:selectedIndex="dailyRepeatSelectedIndex = $event"
              style="max-width: 100%"
            />
          </div>
          <!-- 멀티셀렉트 삭제 -->
        </div>

        <!-- 주간 별 -->
        <div class="repeat_section weekly" v-show="selectedType === 'weekly'">
          <div class="inner_set" style="margin-bottom: 1rem; max-width: 100%">
            <NativeWheel
              :items="weeklyItems"
              :initialSelectedIndex="weeklyWheelSelectedIndex"
              @update:selectedIndex="weeklyWheelSelectedIndex = $event"
              style="max-width: 100%"
            />
          </div>
          <div class="inner_set" style="margin-top: 1rem; max-width: 100%">
            <span
              class="all"
              :class="{ on: isWeeklyAllSelected }"
              @click="toggleWeeklyAll"
              ><strong>매일</strong></span
            >
            <span
              v-for="day in dailyDays"
              :key="'weekly-' + day"
              :class="{ on: weeklySelected.includes(day) }"
              @click="toggleWeekly(day)"
              >{{ day }}</span
            >
          </div>
        </div>

        <!-- 월 별 -->
        <div class="repeat_section monthly" v-show="selectedType === 'monthly'">
          <div class="inner_set" style="margin-bottom: 1rem">
            <NativeWheel
              :items="monthlyItems"
              :initialSelectedIndex="monthlyWheelSelectedIndex"
              @update:selectedIndex="onMonthlyWheelChange"
              style="max-width: 100%"
            />
          </div>
          <div class="inner_set">
            <span
              v-for="day in monthlyDays"
              :key="'monthly-' + day"
              :class="{ on: monthlySelected.includes(day) }"
              @click="toggleMonthly(day)"
              >{{ day }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import NativeWheel from "./NativeWheel.vue";

// 탭 선택 상태
const selectedType = ref("daily");

// --- daily (요일별) 상태 관리 ---
const dailyRepeatOptions = [
  "매일",
  "2일마다",
  "3일마다",
  "4일마다",
  "5일마다",
  "6일마다",
];
const dailyRepeatSelectedIndex = ref(0);

// --- weekly (주별) 상태 관리 ---
const dailyDays = ["월", "화", "수", "목", "금", "토", "일"];
const weeklySelected = ref([]);
const weeklyItems = ["2주차", "3주차", "4주차", "5주차"];
const weeklyWheelSelectedIndex = ref(1); // 기본 3주차 선택
const isWeeklyAllSelected = computed(
  () => weeklySelected.value.length === dailyDays.length,
);

function toggleWeekly(day) {
  const idx = weeklySelected.value.indexOf(day);
  if (idx > -1) weeklySelected.value.splice(idx, 1);
  else weeklySelected.value.push(day);
}

function toggleWeeklyAll() {
  if (isWeeklyAllSelected.value) weeklySelected.value = [];
  else weeklySelected.value = [...dailyDays];
}

// --- monthly (월별) 상태 관리 ---
const monthlyItems = [
  "매월",
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];
const monthlyWheelSelectedIndex = ref(0); // 기본 "매월" 선택

const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthlyDays = ref(
  Array.from({ length: daysInMonth[0] }, (_, i) => `${i + 1}일`),
);
const monthlySelected = ref([]);

function toggleMonthly(day) {
  const idx = monthlySelected.value.indexOf(day);
  if (idx > -1) monthlySelected.value.splice(idx, 1);
  else monthlySelected.value.push(day);
}

function onMonthlyWheelChange(index) {
  monthlyWheelSelectedIndex.value = index;
  if (index === 0) {
    monthlyDays.value = Array.from({ length: 31 }, (_, i) => `${i + 1}일`);
  } else {
    const monthIdx = index - 1; // 1월이 인덱스 1
    monthlyDays.value = Array.from(
      { length: daysInMonth[monthIdx] },
      (_, i) => `${i + 1}일`,
    );
    monthlySelected.value = monthlySelected.value.filter(
      (d) => parseInt(d) <= daysInMonth[monthIdx],
    );
  }
}

// 탭 선택 함수
function selectTab(type) {
  selectedType.value = type;
}

// 선택 데이터 외부 노출
function getSelectedData() {
  return {
    mode: selectedType.value,
    dailyRepeatOption: dailyRepeatOptions[dailyRepeatSelectedIndex.value],
    weeklySelected: weeklySelected.value,
    weeklyWheelSelectedIndex: weeklyWheelSelectedIndex.value,
    monthlySelected: monthlySelected.value,
    monthlyWheelSelectedIndex: monthlyWheelSelectedIndex.value,
  };
}

defineExpose({ getSelectedData });
</script>

<style scoped>
.button {
  width: 100%;
  text-align: center;
}

.tab_button {
  width: 33.33%;
  display: inline-block;
  padding: 0.8rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #438edb;
  text-decoration: none;
  border: 1px solid #438edb;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.tab_button.on {
  background-color: #438edb;
  color: #fff;
}

.repeat_section.weekly > * {
  margin: 0 auto;
  max-width: 100%; /* 넓게 */
}

.repeat_section.monthly .inner_set span {
  display: inline-block;
  width: 2.2rem;
  height: 2.2rem;
  line-height: 2.2rem;
  font-size: 0.9rem;
  border-radius: 50%;
  border: 0.1rem solid #eee;
  margin: 0 0.2rem 0.2rem 0;
  text-align: center;
  cursor: pointer;
}

.repeat_section.monthly .inner_set span.on {
  background-color: #fa606f;
  color: #fff;
  border-color: #fa606f;
}
</style>
