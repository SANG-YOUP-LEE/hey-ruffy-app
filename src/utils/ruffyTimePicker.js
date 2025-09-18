// src/utils/ruffyTimePicker.js
import { registerPlugin } from '@capacitor/core'

// 네이티브 Swift의 jsName = "RuffyTimePicker" 와 반드시 동일해야 함
const RuffyTimePicker = registerPlugin('RuffyTimePicker')

/**
 * time picker를 띄우고 결과를 반환
 * @param {string|null} initialISO - "yyyy-MM-dd'T'HH:mm:ss" (로컬, Z 없음) 또는 null
 * @returns {Promise<string>} 같은 포맷의 ISO 문자열
 */
export async function presentTime(initialISO) {
  const { value } = await RuffyTimePicker.present({
    mode: 'time', // Swift 쪽에서 무시하지만 통일
    value: initialISO ?? null,
    format: "yyyy-MM-dd'T'HH:mm:ss",
    cancelButtonText: '취소',
    doneButtonText: '완료',
  })
  return value
}