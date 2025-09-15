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

      <!-- ✅ 값이 있을 때 항상 노출 -->
      <div v-if="showDataFixed" class="data_fixed">
        <div class="alarm-time">{{ formattedAlarm }}</div>
        <a class="txt" @click="onClickLabel">알람 수정하기</a>
      </div>
    </div>

    <!-- 네이티브 피커: 필요할 때만 mount (key로 강제 remount) -->
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
 *  - 새 알람(없음): '오전 10:00'으로 시작
 */
const initialForPicker = computed(() => {
  if (hasTime.value) {
    return { ...inner.value }
  } else {
    return { ampm:'오전', hour:'10', minute:'00' }
  }
})

/** 토글 */
const isOn = computed({
  get: () => hasTime.value,
  set: (val) => {
    if (val) {
      if (!hasTime.value) {
        // 새 알람 ON → 기본값 세팅 먼저(텍스트/버튼 즉시 노출)
        inner.value = { ampm:'오전', hour:'10', minute:'00' }
        emit('update:modelValue', inner.value)
      }
      openNative()
    } else {
      clearAlarm()
    }
  }
})

/** "알람 설정"/"알람 수정하기" 클릭 */
const onClickLabel = () => {
  if (!isOn.value) {
    isOn.value = true // 위 로직에 의해 기본값 세팅 + 피커 오픈
  } else {
    openNative()       // 현재 값으로 수정
  }
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

/** 피커 제어 */
function openNative() {
  showNativePicker.value = true
  showNativePickerKey.value++ // 강제 remount로 initial 반영
}
function onPicked(v) {
  inner.value = { ...v }
  emit('update:modelValue', inner.value)
  showNativePicker.value = false
}
function onCancelPick() {
  // 새로 ON해서 기본값만 들어간 상태에서 취소하면, 그대로 유지(요청사항: 기본 10:00 유지)
  showNativePicker.value = false
}

/** OFF */
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
