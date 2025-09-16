<template></template>

<script setup>
import { onMounted } from 'vue'
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'start' },
  minDate: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['confirm', 'cancel'])

const p2 = n => String(n).padStart(2,'0')
const toISODate = (o) => (o && o.year && o.month && o.day) ? `${o.year}-${p2(o.month)}-${p2(o.day)}` : null
const fromISODate = (s) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y,m,d] = s.split('-').map(v=>+v)
  return { year:y, month:m, day:d }
}
const todayLocal = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()+1
  const d = now.getDate()
  return { year:y, month:m, day:d }
}
const toLocalMidnightISO = (o) => {
  const y = o.year, m = o.month, d = o.day
  return `${p2(y)}-${p2(m)}-${p2(d)}T00:00:00`
}

onMounted(async () => {
  const initial = props.modelValue && props.modelValue.year ? props.modelValue : null
  const baseToday = todayLocal()

  const minForStart = baseToday
  const minForEnd = props.minDate && props.minDate.year ? props.minDate : baseToday
  const minObj = props.mode === 'end' ? minForEnd : minForStart

  const valueObj = initial ?? baseToday
  const options = {
    mode: 'date',
    value: toLocalMidnightISO(valueObj),
    minimumDate: toLocalMidnightISO(minObj),
  }

  try {
    const { value } = await DatetimePicker.present(options)
    if (!value) { emit('cancel'); return }
    const picked = fromISODate(value.substring(0,10))
    if (!picked) { emit('cancel'); return }
    emit('confirm', picked)
  } catch {
    emit('cancel')
  }
})
</script>
