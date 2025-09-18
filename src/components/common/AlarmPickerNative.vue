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

    <!-- 네이티브 피커는 항상 마운트, open prop으로 여닫기 -->
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

/* 내부 상태 동기화 */
const inner = ref(sanitize(props.modelValue))
watch(() => props.modelValue, v => {
  const nv = sanitize(v)
  if (!isEqual(nv, inner.value)) inner.value = nv
}, { deep: true })
watch(inner, v => {
  const nv = sanitize(v)
  if (!isEqual(nv, props.modelValue)) emit('update:modelValue', nv)
}, { deep: true })

/* 피커 표시 상태 */
const showNativePicker = ref(false)
const hadTimeBeforeOpen = ref(false)

/* 토글 상태는 ref로 직접 관리 */
const isOn = ref(hasTime(inner.value))

/* 토글 값 변화에 반응해서 열기/지우기 */
watch(isOn, (val, prev) => {
  if (val && !prev) {
    // ON으로 바뀌면 무조건 네이티브 피커 오픈
    openNative()
  } else if (!val && prev) {
    // OFF로 바뀌면 값 비우기
    clearAlarm()
  }
})

/* 표시용/초기값 */
const showDataFixed = computed(() => hasTime(inner.value))
const initialForPicker = computed(() => {
  if (hasTime(inner.value)) return { ...inner.value }
  return { ampm:'오전', hour:'10', minute:'00' }
})
const formattedAlarm = computed(() => {
  if (!hasTime(inner.value)) return ''
  const a = inner.value.ampm
  return `${a} ${inner.value.hour}시 ${inner.value.minute}분`
})

/** 라벨 클릭: 토글을 켜고 바로 열기 */
function onClickLabel() {
  if (!isOn.value) isOn.value = true
  // isOn watcher가 openNative() 호출하지만
  // 이미 ON인 상태에서 라벨 눌렀을 때도 열리도록 보장
  if (!showNativePicker.value) openNative()
}

/** 피커 제어 */
function openNative() {
  hadTimeBeforeOpen.value = hasTime(inner.value)
  showNativePicker.value = true
}

function onPicked(v) {
  inner.value = { ...v }
  emit('update:modelValue', inner.value)
  isOn.value = true
}

function onCancelPick() {
  // 신규 케이스라면 OFF로 되돌림
  if (!hadTimeBeforeOpen.value) {
    clearAlarm()
    isOn.value = false
  }
}

function onPickerClosed() {
  showNativePicker.value = false
}

/** OFF = 값 비우기 */
function clearAlarm() {
  const empty = { ampm:'', hour:'', minute:'' }
  if (!isEqual(inner.value, empty)) {
    inner.value = empty
    emit('update:modelValue', empty)
  }
}

/* ---------- helpers ---------- */
function hasTime(v) {
  return (v?.ampm === '오전' || v?.ampm === '오후')
    && /^\d{2}$/.test(v?.hour || '')
    && /^\d{2}$/.test(v?.minute || '')
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
  return /^\d{1,2}$/.test(s) ? s.padStart(2, '0') : ''
}
</script>
