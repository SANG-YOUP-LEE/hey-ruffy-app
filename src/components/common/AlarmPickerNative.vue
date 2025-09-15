<template></template>

<script setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker'

const props = defineProps({
  /** 초기값: { ampm:'오전|오후', hour:'01~12', minute:'00~59' } */
  initial: { type: Object, default: null },
  locale:  { type: String, default: 'ko-KR' },
  theme:   { type: String, default: 'auto' }, // 'auto' | 'light' | 'dark'
})
const emit = defineEmits(['selected','cancel'])

const pad2 = v => String(v ?? '').padStart(2,'0')

const isNative = () => {
  try {
    if (typeof Capacitor.isNativePlatform === 'function') return Capacitor.isNativePlatform()
    if (typeof Capacitor.getPlatform === 'function') return Capacitor.getPlatform() !== 'web'
  } catch {}
  return false
}

/** 오전/오후 + 12h → 24h */
function to24hHHMM(ampm, hour12, minute) {
  let h12 = Number(hour12); if (!Number.isFinite(h12) || h12 < 1 || h12 > 12) h12 = 10
  let m   = Number(minute); if (!Number.isFinite(m)   || m < 0 || m > 59)     m   = 0
  let H = h12 % 12
  if (ampm === '오후') H += 12
  if (ampm === '오전' && h12 === 12) H = 0
  return { H, M: m }
}

/** 로컬 타임존 기반 ISO(끝에 Z 없는 형태) 생성 → 타임존 틀어짐 방지 */
function toLocalISO(H, M) {
  const now = new Date()
  const y = now.getFullYear(), mo = now.getMonth() + 1, d = now.getDate()
  return `${y}-${pad2(mo)}-${pad2(d)}T${pad2(H)}:${pad2(M)}:00`
}

/** iOS에서 반환한 문자열에서 HH:mm만 추출(절대 Date로 변환 X) */
function parseHHMMLoose(iso) {
  const s = String(iso || '')
  const m = s.match(/T(\d{2}):(\d{2})/) || s.match(/(?:\s|^)(\d{2}):(\d{2})(?::\d{2})?/)
  if (!m) return null
  const H = Number(m[1]), M = Number(m[2])
  const ampm = H < 12 ? '오전' : '오후'
  let h12 = H % 12; if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(M) }
}

onMounted(async () => {
  if (!isNative()) { emit('cancel'); return }
  try {
    // ✅ 항상 초기 value 생성해서 넘긴다.
    let init = props.initial
    if (!init || (init.ampm !== '오전' && init.ampm !== '오후')) {
      init = { ampm:'오전', hour:'10', minute:'00' } // 기본 10:00
    }
    const { H, M } = to24hHHMM(init.ampm, init.hour, init.minute)
    const value = toLocalISO(H, M)

    const res = await DatetimePicker.present({
      mode: 'time',
      value,                 // ← 무조건 지정: “현재 시각” 기본을 차단
      locale: props.locale,
      theme:  props.theme,
    })

    const picked = parseHHMMLoose(res?.value)
    if (picked) emit('selected', picked)
    else emit('cancel')
  } catch {
    emit('cancel')
  }
})
</script>
