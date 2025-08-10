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

// 프로그램적 변경 가드 + 1회 억제 플래그
const isProgrammatic = ref(false)
const suppressOnce = ref(false)
const withSilent = (fn) => { isProgrammatic.value = true; try { fn() } finally { isProgrammatic.value = false } }

const toggleAlarm = () => {
  isAlarmOn.value = !isAlarmOn.value
}

// 알람 상태 제어의 단일 진입점
watch(isAlarmOn, (val) => {
  if (isProgrammatic.value || suppressOnce.value) {
    suppressOnce.value = false
    return
  }
  if (val) {
    // 팝업 열기 전에 로컬값 준비 (v-model이라 selectedAlarm가 바로 바인딩됨)
    if (!selectedAlarm.value.hour) {
      selectedAlarm.value = { ampm: 'AM', hour: '08', minute: '00' }
    }
    showAlarmPopup.value = true
  } else {
    selectedAlarm.value = { ampm: '', hour: '', minute: '' }
    showDataFixed.value = false
    showAlarmPopup.value = false
  }
})

// 초기화는 토글만 내리면 watch가 나머지 처리
const resetAlarm = () => {
  withSilent(() => { isAlarmOn.value = false })
  // watch를 건너뛰었으니 직접 정리
  selectedAlarm.value = { ampm: '', hour: '', minute: '' }
  showDataFixed.value = false
  showAlarmPopup.value = false
}

const handlePopupClose = () => {
  showAlarmPopup.value = false
  if (selectedAlarm.value.hour) {
    showDataFixed.value = true
    // 사용자가 시간을 확정했다면 토글은 켜진 상태 유지
    withSilent(() => { isAlarmOn.value = true })
  } else {
    // 취소/삭제 등으로 시간이 비어 있으면 토글 내림
    withSilent(() => { isAlarmOn.value = false })
    showDataFixed.value = false
  }
}

const formattedAlarm = computed(() => {
  if (!selectedAlarm.value.hour) return ''
  return `${selectedAlarm.value.ampm} ${selectedAlarm.value.hour}시 ${selectedAlarm.value.minute}분`
})

// 편집 모드에서 값 주입 (팝업/워처 자동 오픈 방지)
const setFromRoutine = (routine) => {
  const hasAlarm = !!(routine?.alarmTime?.ampm && routine.alarmTime.hour && routine.alarmTime.minute)
  withSilent(() => {
    if (hasAlarm) {
      selectedAlarm.value = {
        ampm: routine.alarmTime.ampm,
        hour: routine.alarmTime.hour,
        minute: routine.alarmTime.minute
      }
      isAlarmOn.value = true
      showDataFixed.value = true
      showAlarmPopup.value = false
    } else {
      selectedAlarm.value = { ampm: '', hour: '', minute: '' }
      isAlarmOn.value = false
      showDataFixed.value = false
      showAlarmPopup.value = false
    }
  })
  // ToggleSwitch가 동일 값을 재-emit하더라도 “다음 1회”는 무시
  suppressOnce.value = true
}

// 외부에서 사용할 보조 메서드
const reset = () => resetAlarm()
const closeAll = () => { showAlarmPopup.value = false }

defineExpose({
  selectedAlarm,
  isAlarmOn,
  setFromRoutine,
  reset,
  closeAll
})
</script>
