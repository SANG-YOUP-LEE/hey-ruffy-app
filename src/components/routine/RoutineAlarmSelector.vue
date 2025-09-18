<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 alarm">
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isOn" :label="''" />
          <span class="toggle-text" @click="onClickLabel">알람 설정</span>
        </div>
        <span class="txt disabled">알람 먼저 허용하기</span>
      </div>
      <div v-if="showDataFixed" class="data_fixed">
        <div class="alarm-time">{{ formattedAlarm }}</div>
        <a class="txt" @click="onClickLabel">알람 수정하기</a>
      </div>
    </div>

    <AlarmPickerNative
      :open="showNativePicker"
      :initial="initialForPicker"
      @selected="onPicked"
      @cancel="onCancelPick"
      @closed="onPickerClosed"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ToggleSwitch from '@/components/common/ToggleSwitch.vue'
import AlarmPickerNative from '@/components/common/AlarmPickerNative.vue'

const props = defineProps({
  routineId: { type: [String, Number], default: null },
  routineTitle: { type: String, default: '알람' },
  bodyText: { type: String, default: '헤이러피 알람' },
  modelValue: { type: [Object, String, null], default: null }
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

const showNativePicker = ref(false)
const showNativePickerKey = ref(0)
const hadTimeBeforeOpen = ref(false)
const pendingOn = ref(false)

const hasTime = computed(() => {
  const v = inner.value || {}
  return (v.ampm === '오전' || v.ampm === '오후')
    && /^\d{2}$/.test(v.hour || '')
    && /^\d{2}$/.test(v.minute || '')
})

const initialForPicker = computed(() => {
  if (hasTime.value) return { ...inner.value }
  return { ampm:'오전', hour:'10', minute:'00' }
})

const isOn = computed({
  get: () => hasTime.value || pendingOn.value,
  set: (val) => {
    if (val) {
      pendingOn.value = true
      openNative()
    } else {
      pendingOn.value = false
      clearAlarm()
    }
  }
})

const onClickLabel = () => {
  pendingOn.value = true
  openNative()
}

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

function openNative() {
  hadTimeBeforeOpen.value = hasTime.value
  showNativePicker.value = true
  showNativePickerKey.value++
}

function onPicked(v) {
  inner.value = { ...v }
  emit('update:modelValue', inner.value)
  pendingOn.value = false
}

function onCancelPick() {
  if (!hadTimeBeforeOpen.value) {
    clearAlarm()
  }
  pendingOn.value = false
}

function onPickerClosed() {
  showNativePicker.value = false
  pendingOn.value = false
}

function clearAlarm() {
  const empty = { ampm:'', hour:'', minute:'' }
  if (!isEqual(inner.value, empty)) {
    inner.value = empty
    emit('update:modelValue', empty)
  }
}

function parseHHMM(str) {
  const m = String(str || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const minute = m[2]
  if (!(h >= 0 && h <= 23)) return null
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = ((h + 11) % 12) + 1
  return { ampm, hour: String(h12).padStart(2,'0'), minute }
}
function sanitize(v) {
  if (typeof v === 'string') {
    const parsed = parseHHMM(v)
    if (parsed) return parsed
    return { ampm:'', hour:'', minute:'' }
  }
  if (!v) return { ampm:'', hour:'', minute:'' }
  const a = toKoAmpm(v.ampm)
  const h = pad2(v.hour)
  const m = pad2(v.minute)
  return { ampm: a, hour: h, minute: m }
}
function isEqual(a, b) {
  if (!a || !b) return a === b
  const aa = typeof a === 'string' ? sanitize(a) : a
  const bb = typeof b === 'string' ? sanitize(b) : b
  return aa.ampm === bb.ampm && String(aa.hour) === String(bb.hour) && String(aa.minute) === String(bb.minute)
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
</script>
