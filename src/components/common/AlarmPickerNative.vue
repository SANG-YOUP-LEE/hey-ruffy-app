<template></template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { presentTime } from '@/utils/ruffyTimePicker'   // 우리가 만든 JS 브리지

const props = defineProps({
  /** 초기값: { ampm:'오전|오후', hour:'01~12', minute:'00~59' } */
  initial: { type: Object, default: null },
})
const emit = defineEmits(['selected','cancel'])

const pad2 = v => String(v ?? '').padStart(2,'0')

function toISOLocal(v) {
  if (!v) return null
  const h12 = Number(v.hour || 0)
  const m = Number(v.minute || 0)
  let h24 = h12 % 12
  if (v.ampm === '오후') h24 += 12
  if (v.ampm === '오전' && h12 === 12) h24 = 0
  const now = new Date()
  const yyyy = now.getFullYear()
  const MM = pad2(now.getMonth() + 1)
  const dd = pad2(now.getDate())
  return `${yyyy}-${MM}-${dd}T${pad2(h24)}:${pad2(m)}:00`
}
function fromISOToObj(iso) {
  const m = String(iso||'').match(/^(\d{4})-\d{2}-\d{2}T(\d{2}):(\d{2}):\d{2}$/)
  if (!m) return null
  const H = Number(m[2]), M = m[3]
  const ampm = H < 12 ? '오전' : '오후'
  const h12 = ((H + 11) % 12) + 1
  return { ampm, hour: pad2(h12), minute: M }
}

let unmounted = false
onMounted(async () => {
  try {
    const init = props.initial && props.initial.ampm ? props.initial : { ampm:'오전', hour:'10', minute:'00' }
    const iso = await presentTime(toISOLocal(init))
    if (unmounted) return
    const picked = fromISOToObj(iso)
    if (picked) emit('selected', picked)
    else emit('cancel')
  } catch {
    if (!unmounted) emit('cancel')
  }
})
onBeforeUnmount(() => { unmounted = true })
</script>
