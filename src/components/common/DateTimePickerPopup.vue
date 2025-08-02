<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>다짐 시작일 지정</h2>
      </div>
      <div class="title date light"><span>년</span><span>월</span><span>일</span></div>
      <div class="popup_body picker_group">
        <WheelPicker v-model="localValue.year" :options="years" />
        <WheelPicker v-model="localValue.month" :options="months" />
        <WheelPicker v-model="localValue.day" :options="days" />
      </div>
      <div class="popup_btm">
        <button @click="confirmSelection" class="p_basic">확인</button>
        <button @click="$emit('close')" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import WheelPicker from './WheelPicker.vue'

const props = defineProps({
  type: { type: String, default: 'date' },
  modelValue: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'close'])

const localValue = ref({ ...props.modelValue })

// 오늘 날짜
const today = new Date()
const todayYear = today.getFullYear()
const todayMonth = today.getMonth() + 1
const todayDay = today.getDate()

// 연도 옵션 (오늘 기준 이후만)
const years = computed(() => {
  return Array.from({ length: 50 }, (_, i) => todayYear + i).map(String)
})

// 월 옵션 (올해면 오늘 월 이후만, 아니면 1~12)
const months = computed(() => {
  const selectedYear = parseInt(localValue.value.year) || todayYear
  const startMonth = selectedYear === todayYear ? todayMonth : 1
  return Array.from({ length: 12 - startMonth + 1 }, (_, i) => String(startMonth + i))
})

// 일 옵션 (올해+이번달이면 오늘 이후만, 아니면 1~마지막날)
const days = ref([])
watch([() => localValue.value.year, () => localValue.value.month], () => {
  const y = parseInt(localValue.value.year) || todayYear
  const m = parseInt(localValue.value.month) || todayMonth
  const lastDay = new Date(y, m, 0).getDate()
  const startDay = (y === todayYear && m === todayMonth) ? todayDay : 1
  days.value = Array.from({ length: lastDay - startDay + 1 }, (_, i) => String(startDay + i))
}, { immediate: true })

const confirmSelection = () => {
  emit('update:modelValue', localValue.value)
  emit('close')
}
</script>