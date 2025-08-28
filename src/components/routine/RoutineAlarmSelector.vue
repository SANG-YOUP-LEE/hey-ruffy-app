<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 alarm">
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isOn" :label="''" />
          <span class="toggle-text" @click="openPopup">알람 설정</span>
        </div>
        <a href="#none" class="txt">알람 먼저 허용하기</a>
      </div>

      <div v-if="showDataFixed" class="data_fixed">
        <div class="alarm-time">{{ formattedAlarm }}</div>
        <a href="#none" class="txt" @click.prevent="clearAlarm">알람 삭제 하기</a>
      </div>
    </div>

    <AlarmPickerPopup
      v-if="showAlarmPopup"
      v-model="model"
      @close="closePopup"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import AlarmPickerPopup from '@/components/common/AlarmPickerPopup.vue'

const model = defineModel({ type: Object, default: () => ({ ampm:'', hour:'', minute:'' }) })

const showAlarmPopup = ref(false)

const hasTime = computed(() => {
  const v = model.value || {}
  return !!(v.ampm && v.hour && v.minute)
})

const isOn = computed({
  get: () => hasTime.value,
  set: (val) => {
    if (val) {
      showAlarmPopup.value = true
    } else {
      model.value = { ampm:'', hour:'', minute:'' }
    }
  }
})

const showDataFixed = computed(() => hasTime.value)

const formattedAlarm = computed(() => {
  if (!hasTime.value) return ''
  return `${model.value.ampm} ${model.value.hour}시 ${model.value.minute}분`
})

const openPopup = () => { showAlarmPopup.value = true }
const closePopup = () => { showAlarmPopup.value = false }
const clearAlarm = () => { model.value = { ampm:'', hour:'', minute:'' } }

const setFromRoutine = (routine) => {
  if (routine?.alarmTime?.ampm && routine.alarmTime.hour && routine.alarmTime.minute) {
    model.value = {
      ampm: routine.alarmTime.ampm,
      hour: routine.alarmTime.hour,
      minute: routine.alarmTime.minute
    }
  } else {
    model.value = { ampm:'', hour:'', minute:'' }
  }
  showAlarmPopup.value = false
}

defineExpose({ setFromRoutine })
</script>
