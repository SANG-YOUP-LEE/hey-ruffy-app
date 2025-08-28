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
import { ref, watch, computed, nextTick } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import AlarmPickerPopup from '@/components/common/AlarmPickerPopup.vue'

const model = defineModel({ type: Object, default: () => ({ ampm:'', hour:'', minute:'' }) })

const isAlarmOn = ref(false)
const showAlarmPopup = ref(false)
const showDataFixed = ref(false)
const suppressAutoOpen = ref(false)

const toggleAlarm = () => {
  const next = !isAlarmOn.value
  isAlarmOn.value = next
  if (next) {
    suppressAutoOpen.value = true
    showAlarmPopup.value = true
    nextTick(() => { suppressAutoOpen.value = false })
  }
}

watch(isAlarmOn, (val) => {
  if (suppressAutoOpen.value) return
  if (val) {
    showAlarmPopup.value = true
  } else {
    model.value = { ampm: '', hour: '', minute: '' }
    showDataFixed.value = false
    showAlarmPopup.value = false
  }
})

watch(model, (v) => {
  const hasTime = !!(v && v.hour && v.minute && v.ampm)
  suppressAutoOpen.value = true
  isAlarmOn.value = hasTime
  showDataFixed.value = hasTime
  nextTick(() => { suppressAutoOpen.value = false })
}, { deep: true, immediate: true })

const resetAlarm = () => { isAlarmOn.value = false }

const handlePopupClose = () => {
  showAlarmPopup.value = false
  if (model.value && model.value.hour) {
    isAlarmOn.value = true
    showDataFixed.value = true
  } else {
    isAlarmOn.value = false
    showDataFixed.value = false
  }
}

const formattedAlarm = computed(() => {
  if (!model.value || !model.value.hour) return ''
  return `${model.value.ampm} ${model.value.hour}시 ${model.value.minute}분`
})

const setFromRoutine = (routine) => {
  suppressAutoOpen.value = true
  if (routine?.alarmTime?.ampm && routine.alarmTime.hour && routine.alarmTime.minute) {
    model.value = {
      ampm: routine.alarmTime.ampm,
      hour: routine.alarmTime.hour,
      minute: routine.alarmTime.minute
    }
    isAlarmOn.value = true
    showDataFixed.value = true
  } else {
    model.value = { ampm: '', hour: '', minute: '' }
    isAlarmOn.value = false
    showDataFixed.value = false
  }
  showAlarmPopup.value = false
  nextTick(() => { suppressAutoOpen.value = false })
}

defineExpose({ setFromRoutine })
</script>
