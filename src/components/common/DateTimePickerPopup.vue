<template>
  <div class="wheel-overlay">
  <div class="wheel-popup">
    <!-- 닫기 버튼 -->
    <button class="close_btn" @click="$emit('close')">닫기</button>
    <h2>{{ title }}</h2>

    <div class="wheel-row">
      <div class="wheel-col" v-if="showYear">
        <p class="wheel-label">년</p>
        <WheelPicker :items="yearList" v-model="selectedYear" />
      </div>
      <div class="wheel-col" v-if="showMonth">
        <p class="wheel-label">월</p>
        <WheelPicker :items="monthList" v-model="selectedMonth" />
      </div>
      <div class="wheel-col" v-if="showDate">
        <p class="wheel-label">일</p>
        <WheelPicker :items="dateList" v-model="selectedDate" />
      </div>
      <div class="wheel-col" v-if="showAmPm">
        <p class="wheel-label">오전/오후</p>
        <WheelPicker :items="ampmList" v-model="selectedAmPm" />
      </div>
      <div class="wheel-col" v-if="showHour">
        <p class="wheel-label">시</p>
        <WheelPicker :items="hourList" v-model="selectedHour" />
      </div>
      <div class="wheel-col" v-if="showMinute">
        <p class="wheel-label">분</p>
        <WheelPicker :items="minuteList" v-model="selectedMinute" />
      </div>
    </div>

    <button class="pop_btm" @click="confirm">확인</button>
  </div>
</div>=
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import WheelPicker from '@/components/common/WheelPicker.vue'

const props = defineProps({
  title: String,
  showYear: { type: Boolean, default: true },
  showMonth: { type: Boolean, default: true },
  showDate: { type: Boolean, default: true },
  showAmPm: { type: Boolean, default: true },
  showHour: { type: Boolean, default: true },
  showMinute: { type: Boolean, default: true },
  showSecond: { type: Boolean, default: true }
})

const emit = defineEmits(['close', 'confirm'])

// 리스트 항목들
const yearList = computed(() =>
  Array.from({ length: 100 }, (_, i) => 1970 + i)
)
const monthList = computed(() =>
  Array.from({ length: 12 }, (_, i) => i + 1)
)
const dateList = computed(() =>
  Array.from({ length: 31 }, (_, i) => i + 1)
)
const ampmList = ['오전', '오후']
const hourList = computed(() =>
  Array.from({ length: 12 }, (_, i) => i + 1)
)
const minuteList = computed(() =>
  Array.from({ length: 60 }, (_, i) => i)
)
const secondList = computed(() =>
  Array.from({ length: 60 }, (_, i) => i)
)

// 선택된 값들
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedDate = ref(new Date().getDate())
const selectedAmPm = ref('오전')
const selectedHour = ref(1)
const selectedMinute = ref(0)
const selectedSecond = ref(0)

// 확인 버튼 눌렀을 때 결과 emit
const confirm = () => {
  emit('confirm', {
    year: selectedYear.value,
    month: selectedMonth.value,
    date: selectedDate.value,
    ampm: selectedAmPm.value,
    hour: selectedHour.value,
    minute: selectedMinute.value,
    second: selectedSecond.value
  })
  emit('close')
}
</script>

<style>
.wheel-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wheel-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wheel-label {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: #555;
}
</style>