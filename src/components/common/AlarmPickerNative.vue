<template></template>

<script setup>
import { watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { presentTime } from '@/utils/ruffyTimePicker' // ✅ 오직 커스텀만 사용

const props = defineProps({
  /** 초기값: { ampm:'오전|오후', hour:'01~12', minute:'00~59' } */
  initial: { type: Object, default: null },
  /** 부모가 true로 바꾸면 네이티브 팝업 오픈 */
  open:    { type: Boolean, default: false }
})
const emit = defineEmits(['selected','cancel','closed'])

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

/** 로컬 타임존 ISO(끝에 Z 없음) */
function toLocalISO(H, M) {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}T${pad2(H)}:${pad2(M)}:00`
}

/** "…THH:mm" 또는 "HH:mm"에서 시분만 추출 */
function parseHHMMLoose(iso) {
  const s = String(iso || '')
  const m = s.match(/T(\d{2}):(\d{2})/) || s.match(/(?:\s|^)(\d{2}):(\d{2})(?::\d{2})?/)
  if (!m) return null
  const H = Number(m[1]), M = Number(m[2])
  const ampm = H < 12 ? '오전' : '오후'
  let h12 = H % 12; if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(M) }
}

/** 🔑 부모가 open=true로 바꾸면 실행 (커스텀 플러그인만 호출) */
watch(() => props.open, async (v) => {
  if (!v) return
  try {
    if (!isNative()) { emit('cancel'); return }
    const hasCustom = !!(globalThis?.Capacitor?.Plugins?.RuffyTimePicker)
    if (!hasCustom) { 
      console.warn('[AlarmPickerNative] RuffyTimePicker 미탑재')
      emit('cancel'); return
    }

    // 초기값(없으면 10:00)
    let init = props.initial
    if (!init || (init.ampm !== '오전' && init.ampm !== '오후')) {
      init = { ampm:'오전', hour:'10', minute:'00' }
    }
    const { H, M } = to24hHHMM(init.ampm, init.hour, init.minute)
    const valueISO = toLocalISO(H, M)

    // ✅ 우리 커스텀 플러그인 호출 → 파란 시트
    const iso = await presentTime(valueISO)
    const picked = parseHHMMLoose(iso)
    if (picked) emit('selected', picked)
    else emit('cancel')
  } catch (e) {
    console.warn('[AlarmPickerNative] present 실패', e)
    emit('cancel')
  } finally {
    emit('closed') // 부모에서 open=false로 되돌림
  }
})
</script>
