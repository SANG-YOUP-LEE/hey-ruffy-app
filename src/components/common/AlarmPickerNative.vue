<template></template>

<script setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker'

const props = defineProps({
  ampm:   { type: String, default: '오전' },       // '오전' | '오후'
  hour:   { type: [String, Number], default: '10' }, // 1~12
  minute: { type: [String, Number], default: '00' }, // 0~59
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

/** iOS가 반환한 문자열에서 HH:mm만 안전 파싱 (타임존 변환 절대 X) */
function parseHHMMLoose(iso) {
  // 문자열 어디에 있든 "T..:.." 패턴의 마지막 HH:mm 를 사용
  const s = String(iso || '')
  const match = s.match(/T(\d{2}):(\d{2})/) || s.match(/(?:\s|^)(\d{2}):(\d{2})(?::\d{2})?/)
  if (!match) return null
  const H = Number(match[1])
  const M = Number(match[2])
  const ampm = H < 12 ? '오전' : '오후'
  let h12 = H % 12; if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(M) }
}

/** props(오전/오후, 12h)를 24h 기준 HH:mm로만 계산 (초기 표시에 쓸 수 있음) */
function to24hHHMM(ampm, hour12, minute) {
  let h12 = Number(hour12); if (!Number.isFinite(h12) || h12 < 1 || h12 > 12) h12 = 10
  let m   = Number(minute); if (!Number.isFinite(m)   || m < 0 || m > 59)     m   = 0
  let H = h12 % 12
  if (ampm === '오후') H += 12
  if (ampm === '오전' && h12 === 12) H = 0
  return { H, M: m }
}

onMounted(async () => {
  if (!isNative()) { emit('cancel'); return }
  try {
    // ⚠️ 초기 value를 넘기지 않습니다(간헐적 오프셋 방지).
    // 필요하면 아래 주석 해제 후 로컬 ISO(끝에 Z 없음)로 전달하세요.
    // const { H, M } = to24hHHMM(props.ampm, props.hour, props.minute)
    // const now = new Date(); const y = now.getFullYear(), mo = now.getMonth()+1, d = now.getDate()
    // const localISO = `${y}-${pad2(mo)}-${pad2(d)}T${pad2(H)}:${pad2(M)}:00`

    const res = await DatetimePicker.present({
      mode: 'time',
      // value: localISO,       // ← 필요시 사용(기본값 지정)
      locale: 'ko-KR',
      theme: 'auto',
    })

    // iOS가 준 문자열(UTC Z 유무 상관없이)에서 HH:mm만 뽑아 사용
    const picked = parseHHMMLoose(res?.value)
    if (picked) emit('selected', picked)
    else emit('cancel')
  } catch {
    emit('cancel')
  }
})
</script>
