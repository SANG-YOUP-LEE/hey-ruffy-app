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
import { ref, watch, computed } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import AlarmPickerPopup from '@/components/common/AlarmPickerPopup.vue'

const isAlarmOn = ref(false)
const showAlarmPopup = ref(false)
const selectedAlarm = ref({ ampm: '', hour: '', minute: '' })
const showDataFixed = ref(false)

const toggleAlarm = () => {
  isAlarmOn.value = !isAlarmOn.value
}

watch(isAlarmOn, (val) => {
  if (val) {
    showAlarmPopup.value = true
  } else {
    clearAlarm()
  }
})

const handlePopupClose = () => {
  showAlarmPopup.value = false
  if (selectedAlarm.value.hour) {
    showDataFixed.value = true
  } else {
    isAlarmOn.value = false
  }
}

const resetAlarm = () => {
  clearAlarm()
}

const clearAlarm = () => {
  selectedAlarm.value = { ampm: '', hour: '', minute: '' }
  showDataFixed.value = false
  showAlarmPopup.value = false
}

const formattedAlarm = computed(() => {
  const { ampm, hour, minute } = selectedAlarm.value
  if (!hour) return ''
  return `${ampm} ${hour}시 ${minute}분`
})

const setFromRoutine = (routine) => {
  const alarm = routine?.alarmTime
  if (alarm?.ampm && alarm?.hour && alarm?.minute) {
    selectedAlarm.value = { ...alarm }
    isAlarmOn.value = true
    showDataFixed.value = true
  } else {
    clearAlarm()
    isAlarmOn.value = false
  }
}

defineExpose({
  selectedAlarm,
  setFromRoutine
})
</script>
