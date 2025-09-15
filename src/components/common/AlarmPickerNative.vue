<template></template>

<script setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker'

const props = defineProps({
  /** 초기값을 넘기고 싶으면 { ampm:'오전|오후', hour:'01~12', minute:'00~59' } */
  initial: { type: Object, default: null },
  /** 로케일/테마 옵션 */
  locale: { type: String, default: 'ko-KR' },
  theme:  { type: String, default: 'auto' }, // 'auto' | 'light' | 'dark'
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
    let value // undefined면 시스템 기본(보통 현재시각)으로 뜸
    if (props.initial && (props.initial.ampm === '오전' || props.initial.ampm === '오후')) {
      const { H, M } = to24hHHMM(props.initial.ampm, props.initial.hour, props.initial.minute)
      value = toLocalISO(H, M) // 로컬 ISO로 안전하게 초기 포지션 지정
    }

    const res = await DatetimePicker.present({
      mode: 'time',
      value,                // 이전값 있으면 지정, 없으면 시스템 기본
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
