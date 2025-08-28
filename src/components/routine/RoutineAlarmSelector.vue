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

      <div v-if="showDataFixed" class="data_fixed">
        <div class="alarm-time">{{ formattedAlarm }}</div>
        <a href="#none" class="txt" @click.prevent="resetAlarm">알람 삭제 하기</a>
      </div>
    </div>

    <AlarmPickerPopup
      v-if="showAlarmPopup"
      v-model="model"
      @close="handlePopupClose"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import AlarmPickerPopup from '@/components/common/AlarmPickerPopup.vue'

const model = defineModel({ type: Object, default: () => ({ ampm:'', hour:'', minute:'' }) })

const isAlarmOn = ref(false)
const showAlarmPopup = ref(false)
const showDataFixed = ref(false)

const toggleAlarm = () => {
  if (!isAlarmOn.value) {
    isAlarmOn.value = true
    showAlarmPopup.value = true
  } else {
    resetAlarm()
  }
}

watch(isAlarmOn, v => {
  if (v) showAlarmPopup.value = true
  else resetAlarm()
})

const resetAlarm = () => {
  isAlarmOn.value = false
  model.value = { ampm:'', hour:'', minute:'' }
  showDataFixed.value = false
  showAlarmPopup.value = false
}

const handlePopupClose = () => {
  showAlarmPopup.value = false
  const hasTime = !!(model.value.ampm && model.value.hour && model.value.minute)
  if (!hasTime) resetAlarm()
  else {
    isAlarmOn.value = true
    showDataFixed.value = true
  }
}

const formattedAlarm = computed(() => {
  if (!model.value.hour) return ''
  return `${model.value.ampm} ${model.value.hour}시 ${model.value.minute}분`
})
</script>
