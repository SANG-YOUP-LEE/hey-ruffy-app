<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 alarm">
        <ToggleSwitch class="toggle" v-model="isAlarmOn" label="알람 설정" />
        <a href="#none" class="txt">알람 먼저 허용하기</a>
      </div>

      <!-- 알람 시간과 삭제 버튼 -->
      <div class="data_fixed" v-if="showDataFixed">
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

watch(isAlarmOn, (val) => {
  if (val) {
    showAlarmPopup.value = true
  } else {
    showAlarmPopup.value = false
  }
})

const handlePopupClose = () => {
  showAlarmPopup.value = false
  // 알람이 선택되어 있으면 data_fixed 표시
  if (selectedAlarm.value.hour) {
    showDataFixed.value = true
  }
}

const resetAlarm = () => {
  selectedAlarm.value = { ampm: '', hour: '', minute: '' }
  showDataFixed.value = false
  isAlarmOn.value = false
}

const formattedAlarm = computed(() => {
  if (!selectedAlarm.value.hour) return ''
  return `${selectedAlarm.value.ampm} ${selectedAlarm.value.hour}시 ${selectedAlarm.value.minute}분`
})
</script>