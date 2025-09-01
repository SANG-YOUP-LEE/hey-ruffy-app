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
      v-model="inner"
      @close="closePopup"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import AlarmPickerPopup from '@/components/common/AlarmPickerPopup.vue'
import { scheduleOnIOS, cancelOnIOS } from '@/utils/iosNotify'

const props = defineProps({
  routineId: { type: [String, Number], default: null },
  routineTitle: { type: String, default: '알람' },
  bodyText: { type: String, default: '헤이러피 알람' },
  modelValue: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue'])

const inner = ref(sanitize(props.modelValue))

watch(() => props.modelValue, v => {
  const nv = sanitize(v)
  if (!isEqual(nv, inner.value)) inner.value = nv
}, { deep: true })

watch(inner, v => {
  const nv = sanitize(v)
  if (!isEqual(nv, props.modelValue)) emit('update:modelValue', nv)
}, { deep: true })

const showAlarmPopup = ref(false)

const hasTime = computed(() => {
  const v = inner.value || {}
  return (v.ampm === '오전' || v.ampm === '오후')
    && /^\d{2}$/.test(v.hour || '')
    && /^\d{2}$/.test(v.minute || '')
})

const isOn = computed({
  get: () => hasTime.value,
  set: (val) => {
    if (val) showAlarmPopup.value = true
    else clearAlarm()
  }
})

const showDataFixed = computed(() => hasTime.value)

const displayAmpm = computed(() => {
  const a = (inner.value?.ampm || '').toString()
  if (a === 'AM') return '오전'
  if (a === 'PM') return '오후'
  return a
})

const formattedAlarm = computed(() => {
  if (!hasTime.value) return ''
  return `${displayAmpm.value} ${inner.value.hour}시 ${inner.value.minute}분`
})

const openPopup = () => { showAlarmPopup.value = true }

const closePopup = () => {
  showAlarmPopup.value = false
  if (hasTime.value) scheduleDailyNow()
}

const clearAlarm = () => {
  const empty = { ampm:'', hour:'', minute:'' }
  if (!isEqual(inner.value, empty)) {
    inner.value = empty
    emit('update:modelValue', empty)
  }
  const id = alarmId()
  if (id) cancelOnIOS(String(id))
}

function scheduleDailyNow() {
  if (!hasTime.value) return
  const hm = to24h(inner.value)
  if (!hm) return
  const id = String(alarmId() || 'inline')

  // 중복/이전 등록 제거 후 재등록
  cancelOnIOS(id)
  scheduleOnIOS({
    id,
    name: props.routineTitle || 'HeyRuffy',
    repeatMode: 'daily',
    alarm: { hour: hm.hour24, minute: hm.minute }
  })
}

function alarmId() {
  return props.routineId ?? null
}

function sanitize(v) {
  if (!v) return { ampm:'', hour:'', minute:'' }
  const a = toKoAmpm(v.ampm)
  const h = pad2(v.hour)
  const m = pad2(v.minute)
  return { ampm: a, hour: h, minute: m }
}
function isEqual(a, b) {
  if (!a || !b) return a === b
  return a.ampm === b.ampm && String(a.hour) === String(b.hour) && String(a.minute) === String(b.minute)
}
function toKoAmpm(a) {
  if (a === 'PM' || a === '오후') return '오후'
  if (a === 'AM' || a === '오전') return '오전'
  return ''
}
function pad2(n) {
  const s = String(n ?? '').trim()
  if (!/^\d{1,2}$/.test(s)) return ''
  return s.padStart(2, '0')
}
function to24h({ ampm, hour, minute }) {
  if (!(ampm === '오전' || ampm === '오후')) return null
  if (!/^\d{2}$/.test(hour || '') || !/^\d{2}$/.test(minute || '')) return null
  let h = Number(hour)
  const m = Number(minute)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  if (h < 1 || h > 12 || m < 0 || m > 59) return null
  if (ampm === '오후' && h < 12) h += 12
  if (ampm === '오전' && h === 12) h = 0
  return { hour24: h, minute: m }
}
</script>
