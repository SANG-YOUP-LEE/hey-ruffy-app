<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 date">
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isStartDateOn" :disabled="isOnceMode" />
          <span class="toggle-text" @click="onStartLabelClick">시작일 지정</span>
        </div>
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isEndDateOn" :disabled="isOnceMode" />
          <span class="toggle-text" @click="onEndLabelClick">종료일 지정</span>
        </div>
      </div>

      <div v-if="isOnceMode" class="t_red01">하루만일때는 선택할 수 없어요</div>
      <div v-else-if="showWarning" class="t_red01">먼저 시작일을 지정해 주세요.</div>

      <div v-if="formattedDate" class="data_fixed">
        {{ formattedDate }}
        <a href="#none" class="txt" @click.prevent="resetDates">지정일 취소하기</a>
      </div>
    </div>

    <DateTimePickerPopup
      v-if="showDatePopup"
      :mode="popupMode"
      :minDate="popupMode === 'end' ? start : {}"
      :modelValue="popupMode === 'start' ? start : end"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import DateTimePickerPopup from '@/components/common/DateTimePickerPopup.vue'
import { usePopupUX } from '@/composables/usePopupUX'

const props = defineProps({
  startDate: { type: Object, default: () => ({ year: '', month: '', day: '' }) },
  endDate: { type: Object, default: () => ({ year: '', month: '', day: '' }) },
  repeatType: { type: String, default: 'daily' },
  daily: { type: [Number, String, null], default: null }
})
const emit = defineEmits(['update:startDate', 'update:endDate'])

const { lockScroll, unlockScroll } = usePopupUX(() => {})

const start = computed({
  get: () => props.startDate || { year: '', month: '', day: '' },
  set: v => emit('update:startDate', v || { year: '', month: '', day: '' })
})
const end = computed({
  get: () => props.endDate || { year: '', month: '', day: '' },
  set: v => emit('update:endDate', v || { year: '', month: '', day: '' })
})

const hasStart = computed(() => !!String(start.value?.year || '').trim())
const hasEnd = computed(() => !!String(end.value?.year || '').trim())

const isOnceMode = computed(() => {
  const n = (props.daily === '' || props.daily == null) ? null : Number(props.daily)
  return props.repeatType === 'daily' && n === 0
})

const isStartDateOn = computed({
  get: () => hasStart.value,
  set: on => {
    if (isOnceMode.value) return
    if (on) {
      if (!hasStart.value) start.value = getTodayObject()
      showWarning.value = false
      popupMode.value = 'start'
      showDatePopup.value = true
      lockScroll('.com_popup_wrap .popup_inner')
    } else {
      start.value = { year: '', month: '', day: '' }
      isEndDateOn.value = false
      end.value = { year: '', month: '', day: '' }
    }
  }
})
const isEndDateOn = computed({
  get: () => hasEnd.value,
  set: on => {
    if (isOnceMode.value) return
    if (on) {
      if (!hasStart.value) {
        showWarning.value = true
        return
      }
      if (!hasEnd.value) end.value = { ...start.value }
      showWarning.value = false
      popupMode.value = 'end'
      showDatePopup.value = true
      lockScroll('.com_popup_wrap .popup_inner')
    } else {
      end.value = { year: '', month: '', day: '' }
    }
  }
})

const showWarning = ref(false)
const showDatePopup = ref(false)
const popupMode = ref('start')

const getTodayObject = () => {
  const d = new Date()
  return { year: String(d.getFullYear()), month: String(d.getMonth() + 1), day: String(d.getDate()) }
}

const onStartLabelClick = () => {
  if (isOnceMode.value) return
  isStartDateOn.value = !isStartDateOn.value
}
const onEndLabelClick = () => {
  if (isOnceMode.value) return
  isEndDateOn.value = !isEndDateOn.value
}

const handleConfirm = val => {
  if (popupMode.value === 'start') {
    start.value = val
  } else {
    end.value = val
  }
  showDatePopup.value = false
  unlockScroll()
}
const handleCancel = () => {
  if (popupMode.value === 'start') {
    start.value = { year: '', month: '', day: '' }
  } else {
    end.value = { year: '', month: '', day: '' }
  }
  showDatePopup.value = false
  unlockScroll()
}
const resetDates = () => {
  start.value = { year: '', month: '', day: '' }
  end.value = { year: '', month: '', day: '' }
}
const formattedDate = computed(() => {
  if (!hasStart.value) return ''
  const s = start.value
  const e = end.value
  const sTxt = `${s.year}년 ${s.month}월 ${s.day}일`
  const eTxt = hasEnd.value ? ` ~ ${e.year}년 ${e.month}월 ${e.day}일` : ''
  return sTxt + eTxt
})
</script>
