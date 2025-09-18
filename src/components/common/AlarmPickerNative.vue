<template></template>

<script setup>
import { watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { presentTime } from '@/utils/ruffyTimePicker'

const props = defineProps({
  initial: { type: Object, default: null },
  open:    { type: Boolean, default: false },   // 🔑 토글/라벨 클릭 시 true로 바꿔서 팝업 열기
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

function to24hHHMM(ampm, hour12, minute) {
  let h12 = Number(hour12); if (!Number.isFinite(h12) || h12 < 1 || h12 > 12) h12 = 10
  let m   = Number(minute); if (!Number.isFinite(m)   || m < 0 || m > 59)     m   = 0
  let H = h12 % 12
  if (ampm === '오후') H += 12
  if (ampm === '오전' && h12 === 12) H = 0
  return { H, M: m }
}

function toLocalISO(H, M) {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}T${pad2(H)}:${pad2(M)}:00`
}

function parseHHMMLoose(iso) {
  const s = String(iso || '')
  const m = s.match(/T(\d{2}):(\d{2})/) || s.match(/(?:\s|^)(\d{2}):(\d{2})/)
  if (!m) return null
  const H = Number(m[1]), M = Number(m[2])
  const ampm = H < 12 ? '오전' : '오후'
  let h12 = H % 12; if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(M) }
}

// 🔑 open 값이 true일 때만 실행
watch(() => props.open, async (v) => {
  if (!v) return
  if (!isNative()) { emit('cancel'); emit('closed'); return }

  try {
    let init = props.initial
    if (!init || (init.ampm !== '오전' && init.ampm !== '오후')) {
      init = { ampm:'오전', hour:'10', minute:'00' }
    }
    const { H, M } = to24hHHMM(init.ampm, init.hour, init.minute)
    const value = toLocalISO(H, M)

    const iso = await presentTime(value)
    const picked = parseHHMMLoose(iso)
    if (picked) emit('selected', picked)
    else emit('cancel')
  } catch {
    emit('cancel')
  } finally {
    emit('closed')   // 부모에서 open=false로 닫기
  }
})
</script>
