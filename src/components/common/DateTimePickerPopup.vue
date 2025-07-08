<template>
  <div class="wheel-overlay">
    <div class="wheel-popup">
      <!-- 닫기 버튼 -->
      <button class="close_btn" @click="$emit('close')">닫기</button>

      <!-- 타이틀 -->
      <h2>{{ title }}</h2>

      <!-- 휠 영역: 일단 텍스트로 자리만 잡기 -->
      <div v-if="showYear">[ 년 WheelPicker 자리 ]</div>
      <div v-if="showMonth">[ 월 WheelPicker 자리 ]</div>
      <div v-if="showDate">[ 일 WheelPicker 자리 ]</div>
      <div v-if="showAmPm">[ 오전/오후 WheelPicker 자리 ]</div>
      <div v-if="showHour">[ 시 WheelPicker 자리 ]</div>
      <div v-if="showMinute">[ 분 WheelPicker 자리 ]</div>
      <div v-if="showSecond">[ 초 WheelPicker 자리 ]</div>

      <!-- 확인 버튼 -->
      <button class="pop_btm" @click="confirm">확인</button>
    </div>
  </div>
</template>

<script setup>
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

const confirm = () => {
  emit('confirm', {}) // 일단 빈 값 emit, 2단계에서 연결할 예정
  emit('close')
}
</script>