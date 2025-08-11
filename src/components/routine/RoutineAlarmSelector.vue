<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 alarm">
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isAlarmOn" :label="''" />
          <span class="toggle-text" @click="toggleAlarm">알람 설정</span>
        </div>
        <a href="#none" class="txt">알람 먼저 허용하기</a>
      </div>

      <!-- 알람 시간과 삭제 버튼 -->
      <div v-if="showDataFixed" class="data_fixed">
        <div class="alarm-time">
          {{ formattedAlarm }}
        </div>
        <a href="#none" class="txt" @click.prevent="resetAlarm">알람 삭제 하기</a>
      </div>
    </div>

    <!-- 알람 피커 팝업 -->
    <AlarmPickerPopup
      v-if="showAlarmPopup"
      v-model="selectedAlarm"
      @close="handlePopupClose"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import AlarmPickerPopup from '@/components/common/AlarmPickerPopup.vue'

const isAlarmOn = ref(false)
const showAlarmPopup = ref(false)
const selectedAlarm = ref({ ampm: '', hour: '', minute: '' })
const showDataFixed = ref(false)

// ✅ 자동 오픈 방지용 가드
const suppressAutoOpen = ref(false)

const toggleAlarm = () => {
  isAlarmOn.value = !isAlarmOn.value
}

// 🔁 이 watch가 알람 상태 전체를 제어하는 유일한 통로가 되도록 유지
watch(isAlarmOn, (val) => {
  if (suppressAutoOpen.value) return // ✅ 값 주입 중에는 팝업 열지 않음
  if (val) {
    showAlarmPopup.value = true
  } else {
    selectedAlarm.value = { ampm: '', hour: '', minute: '' }
    showDataFixed.value = false
    showAlarmPopup.value = false
  }
})

// ✅ 수정: 알람 초기화는 오직 watch 트리거로
const resetAlarm = () => {
  isAlarmOn.value = false
}

const handlePopupClose = () => {
  showAlarmPopup.value = false
  if (selectedAlarm.value.hour) {
    showDataFixed.value = true
  } else {
    isAlarmOn.value = false
  }
}

const formattedAlarm = computed(() => {
  if (!selectedAlarm.value.hour) return ''
  return `${selectedAlarm.value.ampm} ${selectedAlarm.value.hour}시 ${selectedAlarm.value.minute}분`
})

const setFromRoutine = (routine) => {
  // ✅ 수정 모드 값 주입 중 자동 오픈 차단
  suppressAutoOpen.value = true
  if (
    routine?.alarmTime &&
    routine.alarmTime.ampm &&
    routine.alarmTime.hour &&
    routine.alarmTime.minute
  ) {
    selectedAlarm.value = {
      ampm: routine.alarmTime.ampm,
      hour: routine.alarmTime.hour,
      minute: routine.alarmTime.minute
    }
    isAlarmOn.value = true
    showDataFixed.value = true
  } else {
    selectedAlarm.value = { ampm: '', hour: '', minute: '' }
    isAlarmOn.value = false
    showDataFixed.value = false
  }
  showAlarmPopup.value = false
  nextTick(() => { suppressAutoOpen.value = false })
}

defineExpose({
  selectedAlarm,
  setFromRoutine
})
</script>
