<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>알람 시간 설정</h2>
      </div>

      <div class="title date light">
        <span>오전/오후</span><span>시</span><span>분</span>
      </div>

      <!-- 입력은 pointerup 하나로 통일 (이중 트리거 방지) -->
      <div
        class="popup_body picker_group"
        @pointerup="openNativeTimePicker"
      >
        <div class="wheel_item" @pointerup.stop>
          <span>{{ view.ampm }}</span>
        </div>
        <div class="wheel_item" @pointerup.stop>
          <span>{{ view.hour }}</span>
        </div>
        <div class="wheel_item" @pointerup.stop>
          <span>{{ view.minute }}</span>
        </div>
      </div>

      <div class="popup_btm">
        <button @click="confirm" class="p_basic">확인</button>
        <button @click="$emit('close')" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Capacitor } from '@capacitor/core'
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker'

/* ── 팝업 열릴 때 배경 스크롤 잠금 ───────────────────────── */
const preventScroll = e => e.preventDefault()
const lockBodyScroll = () => {
  document.body.style.overflow = 'hidden'
  document.body.addEventListener('touchmove', preventScroll, { passive: false })
}
const unlockBodyScroll = () => {
  document.body.style.overflow = ''
  document.body.removeEventListener('touchmove', preventScroll)
}
onMounted(lockBodyScroll)
onBeforeUnmount(unlockBodyScroll)

/* ── 기본값/프롭스 ─────────────────────────────────────── */
const DISPLAY_DEFAULT = { ampm: '오전', hour: '10', minute: '00' }

const props = defineProps({
  modelValue: { type: Object, default: () => ({ ampm: null, hour: null, minute: null }) }
})
const emit = defineEmits(['update:modelValue', 'close'])

/* ── 유틸 + 값 보정 ────────────────────────────────────── */
const pad2 = v => String(v ?? '').padStart(2, '0')

const sanitizeView = (v = {}) => {
  const rawAmpm = (v.ampm || '').trim()
  const ampm = (rawAmpm === '오전' || rawAmpm === '오후') ? rawAmpm : DISPLAY_DEFAULT.ampm

  const toNum = x => {
    const n = Number(x)
    return Number.isFinite(n) ? n : NaN
  }

  let h = toNum(v.hour)
  if (!(h >= 1 && h <= 12)) h = Number(DISPLAY_DEFAULT.hour)

  let m = toNum(v.minute)
  if (!(m >= 0 && m <= 59)) m = Number(DISPLAY_DEFAULT.minute)

  return { ampm, hour: pad2(h), minute: pad2(m) }
}

const view = ref(sanitizeView(props.modelValue))

watch(() => props.modelValue, v => {
  view.value = sanitizeView(v)
}, { immediate: true, deep: true })

/** view(오전/오후 + 12h) → Date */
const viewToDate = () => {
  const d = new Date()
  const h12 = Number(view.value.hour)
  const m   = Number(view.value.minute)
  let h24 = h12 % 12
  if (view.value.ampm === '오후') h24 += 12
  if (view.value.ampm === '오전' && h12 === 12) h24 = 0
  d.setHours(h24, m, 0, 0)
  return d
}

/** Date → view(오전/오후 + 12h) */
const dateToView = (d) => {
  const h24 = d.getHours()
  const m   = d.getMinutes()
  const ampm = h24 < 12 ? '오전' : '오후'
  let h12 = h24 % 12; if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(m) }
}

/* ── 네이티브 환경 감지 (v4/v5 호환) ───────────────────── */
const isNative = () => {
  try {
    if (typeof Capacitor.isNativePlatform === 'function') return Capacitor.isNativePlatform()
    if (typeof Capacitor.getPlatform === 'function') return Capacitor.getPlatform() !== 'web'
  } catch {}
  return false
}

/* ── 백드롭 임시 숨김 (모달 즉시 dismiss 방지) ───────────── */
const toggleBackdrop = (hide) => {
  const wrap = document.querySelector('.com_popup_wrap')
  if (!wrap) return
  if (hide) wrap.classList.add('no-backdrop')
  else wrap.classList.remove('no-backdrop')
}

/* ── 중복 호출 가드 + 쿨다운 ───────────────────────────── */
let opening = false
let coolUntil = 0

/* ── 피커 열기: 네이티브만 (웹 폴백 없음) ───────────────── */
const openNativeTimePicker = async () => {
  const now = Date.now()
  if (!isNative()) return
  if (opening || now < coolUntil) return
  opening = true

  try {
    toggleBackdrop(true)
    await nextTick()
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 80)))

    const base = viewToDate()
    const { value } = await DatetimePicker.present({
      mode: 'time',
      value: base.toISOString(),
      locale: 'ko-KR',
      theme: 'auto'
    })
    if (value) view.value = dateToView(new Date(value))
  } catch (err) {
    if (err?.code !== 'dismissed') {
      console.warn('[AlarmPicker] DatetimePicker.present error (non-dismiss):', err)
    }
  } finally {
    toggleBackdrop(false)
    opening = false
    coolUntil = Date.now() + 400
  }
}

/* ── 확인 ─────────────────────────────────────────────── */
const confirm = () => {
  emit('update:modelValue', { ...view.value })
  emit('close')
}
</script>

<style scoped>
/* 기존 레이아웃 유지 + 포인터 보강 */
.picker_group {
  position: relative;
  z-index: 10;
  pointer-events: auto;

  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: .75rem;
  align-items: center;
  cursor: pointer;

  /* pointer 이벤트 사용 시 스크롤 제스처 충돌 방지 */
  touch-action: manipulation;
}
.wheel_item {
  height: 44px;
  display:flex; align-items:center; justify-content:center;
  font-size: 18px; font-weight: 600;
  pointer-events: auto;
}

/* ✔︎ 여기! :global 제거하고 스코프 내에서 그대로 타게팅 */
.com_popup_wrap.no-backdrop::before {
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
