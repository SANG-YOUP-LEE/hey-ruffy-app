<template>
  <div class="form_box_g">
    <div class="detail_box">
      <div class="inner_fix01 alarm">
        <div class="toggle-label-wrapper">
          <ToggleSwitch class="toggle" v-model="isOn" :label="''" />
          <span class="toggle-text" @click="openPopup">알람 설정</span>
        </div>
        <span class="txt disabled">알람 먼저 허용하기</span>
      </div>

      <div v-if="showDataFixed" class="data_fixed">
        <div class="alarm-time">{{ formattedAlarm }}</div>
        <a class="txt" @click="openPopup">알람 수정하기</a>
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
import { scheduleOnIOS, cancelOnIOS } from '@/utils/iosNotify' // ← 임포트는 유지

// ✅ 이 플래그를 false로 두면 이 컴포넌트는 iOS에 직접 쏘지 않습니다.
// (실 예약은 popup 저장→form.save→alarm.scheduleFromForm 경로만 사용)
const ENABLE_INLINE_TEST = false

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

/** 토글 ON: 팝업 열기 / OFF: 완전 삭제 */
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
  // ✅ 여기서 네이티브 호출 금지 (폼 저장 경로만 사용)
  if (hasTime.value) scheduleDailyNow()
}

/** 토글 OFF 시 완전 삭제 */
const clearAlarm = () => {
  const empty = { ampm:'', hour:'', minute:'' }
  if (!isEqual(inner.value, empty)) {
    inner.value = empty
    emit('update:modelValue', empty)
  }
  const id = alarmId()
  if (id && ENABLE_INLINE_TEST) {
    cancelOnIOS(String(id))
  } else if (id) {
    console.warn('[AlarmSelector] inline cancel suppressed (use form.save flow)', id)
  }
}

function scheduleDailyNow() {
  if (!hasTime.value) return
  const hm = to24h(inner.value)
  if (!hm) return
  const id = String(alarmId() || 'inline')

  // ✅ inline 테스트 비활성화: 실제 네이티브 스케줄은 form.save() 경로에서 처리
  if (!ENABLE_INLINE_TEST) {
    console.warn('[AlarmSelector] inline schedule suppressed (use form.save flow)', { id, hm })
    return
  }

  // (테스트 모드에서만) 중복 방지: 동일 ID 제거 후 등록
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
