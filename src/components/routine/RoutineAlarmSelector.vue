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

    <!-- 네이티브 피커: 필요할 때만 mount -->
    <AlarmPickerNative
      v-if="showNativePicker"
      :key="showNativePickerKey"
      :initial="initialForPicker"
      @selected="onPicked"
      @cancel="onCancelPick"
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
  modelValue: { type: [Object, String, null], default: null } // "HH:mm" 허용
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

const hasTime = computed(() => {
  const v = inner.value || {}
  return (v.ampm === '오전' || v.ampm === '오후')
    && /^\d{2}$/.test(v.hour || '')
    && /^\d{2}$/.test(v.minute || '')
})

/** 피커 초기값 전략:
 *  - 수정하기(이미 값 있음): 그 값으로 시작
 *  - 새 알람(없음): 현재 시각(분 00)로 시작  ※ 10:00 고정 원하면 아래에서 바꿔도 됨
 */
const initialForPicker = computed(() => {
  if (hasTime.value) {
    return { ...inner.value } // 현재 값 그대로
  } else {
    // 현재 시각을 오전/오후 + 12h로 변환
    const now = new Date()
    const H = now.getHours(), M = now.getMinutes()
    const ampm = H < 12 ? '오전' : '오후'
    let h12 = H % 12; if (h12 === 0) h12 = 12
    return { ampm, hour: String(h12).padStart(2,'0'), minute: '00' } // 분을 00으로 정렬
    // return { ampm:'오전', hour:'10', minute:'00' } // ← 기본 10:00로 시작하고 싶으면 이 줄로 교체
  }
})

const isOn = computed({
  get: () => hasTime.value,
  set: (val) => {
    if (val) openNative(/* fresh */ !hasTime.value)
    else clearAlarm()
  }
})
const onClickLabel = () => {
  // 텍스트 클릭: 토글이 OFF면 ON → 자동으로 피커 열림, ON이면 수정 모드로 열기
  if (!isOn.value) isOn.value = true
  else openNative(false)
}

function openNative(isFresh) {
  // 새 알람 시작일 때는 이전 값 누수 방지(현재는 initialForPicker가 현재시각으로 생성)
  showNativePicker.value = true
  // 강제 remount로 초기값 확실히 반영
  showNativePickerKey.value++
}

function onPicked(v) {
  inner.value = { ...v }
  showNativePicker.value = false
}

function onCancelPick() {
  // 취소 시: 기존에 값 없던 경우면 토글을 다시 OFF로
  if (!hasTime.value) isOn.value = false
  showNativePicker.value = false
}

function clearAlarm() {
  const empty = { ampm:'', hour:'', minute:'' }
  if (!isEqual(inner.value, empty)) {
    inner.value = empty
    emit('update:modelValue', empty)
  }
}

/* ---------- helpers ---------- */
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
function toKoAmpm(a) { if (a === 'PM' || a === '오후') return '오후'; if (a === 'AM' || a === '오전') return '오전'; return '' }
function pad2(n) { const s = String(n ?? '').trim(); if (!/^\d{1,2}$/.test(s)) return ''; return s.padStart(2, '0') }
</script>
