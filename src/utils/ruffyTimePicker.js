// src/plugins/ruffyTimePicker.js
const P = () => window?.Capacitor?.Plugins?.RuffyTimePicker

export async function presentTime(initialISO /* 'yyyy-MM-ddTHH:mm:ss' or null */) {
  const plugin = P()
  if (!plugin) throw new Error('RuffyTimePicker plugin not available')
  const { value } = await plugin.present({
    mode: 'time',
    value: initialISO ?? null,
    format: "yyyy-MM-dd'T'HH:mm:ss",
    cancelButtonText: '취소',
    doneButtonText: '완료',
  })
  return value // "yyyy-MM-ddTHH:mm:ss" (로컬, Z 없음)
}