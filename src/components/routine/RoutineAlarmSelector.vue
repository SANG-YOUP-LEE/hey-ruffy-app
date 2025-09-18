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

      <!-- 값이 있을 때 표시 -->
      <div v-if="showDataFixed" class="data_fixed">
        <div class="alarm-time">{{ formattedAlarm }}</div>
        <a class="txt" @click="onClickLabel">알람 수정하기</a>
      </div>
    </div>

    <!-- ✅ 변경: 항상 마운트 + open 플래그로 제어 -->
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

/** 외부와 인터페이스
 *  modelValue: { ampm:'오전|오후', hour:'HH', minute:'MM' } | "HH:mm" | null
 */
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
// (이제 key는 불필요하지만, 요청대로 “그 부분만” 수정해서 남겨둠)
const showNativePickerKey = ref(0)
/* 피커 열기 전 기존 값 있었는지 기록 → 취소 동작 분기용 */
const hadTimeBeforeOpen = ref(false)

/* 현재 값 존재 여부 */
const hasTime = computed(() => {
  const v = inner.value || {}
  return (v.ampm === '오전' || v.ampm === '오후')
    && /^\d{2}$/.test(v.hour || '')
    && /^\d{2}$/.test(v.minute || '')
})

/** 피커 초기값
 *  - 수정: 현재 값
 *  - 신규: 10:00
 */
const initialForPicker = computed(() => {
  if (hasTime.value) return { ...inner.value }           // ✅ 기존 값으로
  return { ampm:'오전', hour:'10', minute:'00' }         // 신규일 때만 10:00
})

/** 토글 제어
 *  ON 시: 값 미리 넣지 말고, 피커 먼저 열기
 *  OFF 시: 값 비우기
 */
const isOn = computed({
  get: () => hasTime.value,
  set: (val) => {
    if (val) {
      openNative()                     // ✅ 미리 값/emit 안 함
    } else {
      clearAlarm()
    }
  }
})

/** 라벨 클릭: 토글 상태와 무관하게 '수정/신규'로 피커 열기 */
const onClickLabel = () => {
  openNative()
}

/** 표시용 */
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

/** 피커 제어 */
function openNative() {
  hadTimeBeforeOpen.value = hasTime.value    // ✅ 열기 직전 상태 기록
  showNativePicker.value = true              // ✅ 이제 이 값으로만 열고 닫음
  showNativePickerKey.value++                // (유지)
}

function onPicked(v) {
  // ✅ 완료했을 때만 값 확정
  inner.value = { ...v }
  emit('update:modelValue', inner.value)
  // 닫기는 자식이 @closed로 알려주므로 여기서는 건드리지 않아도 OK
}

function onCancelPick() {
  // ✅ 취소:
  //  - 신규(전에 값 없었음): OFF 유지 = 값 비움
  //  - 수정(전에 값 있었음): 기존 값/토글 유지
  if (!hadTimeBeforeOpen.value) {
    clearAlarm()
  }
  // 닫기는 자식이 @closed로 알려줌
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
