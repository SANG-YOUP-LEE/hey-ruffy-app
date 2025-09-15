<template></template>

<script setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker'

const props = defineProps({
  ampm:   { type: String, default: '오전' },
  hour:   { type: [String, Number], default: '10' },
  minute: { type: [String, Number], default: '00' },
})
const emit = defineEmits(['selected','cancel'])

const pad2 = v => String(v ?? '').padStart(2,'0')
const toDate = (ampm, hour, minute) => {
  const d = new Date()
  let h12 = Number(hour); if (!Number.isFinite(h12)) h12 = 10
  let m   = Number(minute); if (!Number.isFinite(m)) m = 0
  let h24 = h12 % 12
  if (ampm === '오후') h24 += 12
  if (ampm === '오전' && h12 === 12) h24 = 0
  d.setHours(h24, m, 0, 0)
  return d
}
const fromDate = (d) => {
  const h24 = d.getHours()
  const m   = d.getMinutes()
  const ampm = h24 < 12 ? '오전' : '오후'
  let h12 = h24 % 12; if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(m) }
}
const isNative = () => {
  try {
    if (typeof Capacitor.isNativePlatform === 'function') return Capacitor.isNativePlatform()
    if (typeof Capacitor.getPlatform === 'function') return Capacitor.getPlatform() !== 'web'
  } catch {}
  return false
}

onMounted(async () => {
  if (!isNative()) { emit('cancel'); return }
  try {
    const base = toDate(props.ampm, props.hour, props.minute)
    const { value } = await DatetimePicker.present({
      mode: 'time',
      value: base.toISOString(),
      locale: 'ko-KR',
      theme: 'auto',
    })
    if (value) emit('selected', fromDate(new Date(value)))
    else emit('cancel')
  } catch {
    emit('cancel')
  }
})
</script>
