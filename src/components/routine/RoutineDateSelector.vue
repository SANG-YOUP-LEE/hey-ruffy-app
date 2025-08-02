<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01">
        <ToggleSwitch class="toggle" v-model="isStartDateOn" label="시작일 지정" />
        <ToggleSwitch class="toggle" v-model="isEndDateOn" label="종료일 지정" />
      </div>
    </div>

    <DateTimePickerPopup
      v-if="showDatePopup"
      type="date"
      v-model="selectedDate"
      @close="closeDatePopup"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'

const isStartDateOn = ref(false)
const isEndDateOn = ref(false)
const showDatePopup = ref(false)
const selectedDate = ref({ year: '', month: '', day: '' })

watch(isStartDateOn, (val) => {
  showDatePopup.value = val
})

const closeDatePopup = () => {
  showDatePopup.value = false
  isStartDateOn.value = false
}
</script>