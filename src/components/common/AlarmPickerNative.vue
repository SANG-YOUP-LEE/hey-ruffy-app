<template></template>

<script setup>
import { watch, ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { presentTime } from '@/utils/ruffyTimePicker'

const props = defineProps({
  /** { ampm:'오전|오후', hour:'01~12', minute:'00~59' } | null */
  initial: { type: Object, default: null },
  /** 부모가 true로 주면 네이티브 시간 선택 팝업을 연다 */
  open:    { type: Boolean, default: false },
})
const emit = defineEmits(['selected','cancel','closed'])

const opening = ref(false)   // 중복 오픈 방지

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

/** 로컬 타임존 기반 ISO(끝에 Z 없는 형태) 생성 */
function toLocalISO(H, M) {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}T${pad2(H)}:${pad2(M)}:00`
}

/** iOS에서 반환한 문자열에서 HH:mm만 추출(절대 Date 변환 X) */
function parseHHMMLoose(iso) {
  const s = String(iso || '')
  const m = s.match(/T(\d{2}):(\d{2})/) || s.match(/(?:\s|^)(\d{2}):(\d{2})(?::\d{2})?/)
  if (!m) return null
  const H = Number(m[1]), M = Number(m[2])
  const ampm = H < 12 ? '오전' : '오후'
  let h12 = H % 12; if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(M) }
}

/** open=true일 때만 네이티브 피커 호출 */
watch(() => props.open, async (v) => {
  if (!v) return
  if (opening.value) return
  opening.value = true

  if (!isNative()) { emit('cancel'); emit('closed'); opening.value = false; return }

  try {
    // 초기값 준비 (없으면 10:00)
    let init = props.initial
    if (!init || (init.ampm !== '오전' && init.ampm !== '오후')) {
      init = { ampm:'오전', hour:'10', minute:'00' }
    }
    const { H, M } = to24hHHMM(init.ampm, init.hour, init.minute)
    const value = toLocalISO(H, M)

    // 커스텀 네이티브 플러그인 호출
    const iso = await presentTime(value)

    const picked = parseHHMMLoose(iso)
    if (picked) emit('selected', picked)
    else emit('cancel')
  } catch {
    emit('cancel')
  } finally {
    emit('closed')        // 부모가 showNativePicker=false로 닫도록 신호
    opening.value = false
  }
})
</script>
