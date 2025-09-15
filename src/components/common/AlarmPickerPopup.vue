<template>
  <div class="com_popup_wrap">
    <div class="popup_inner">
      <div class="popup_tit">
        <h2>알람 시간 설정</h2>
      </div>

      <div class="title date light">
        <span>오전/오후</span><span>시</span><span>분</span>
      </div>

      <!-- 클릭하면: 디바이스=네이티브 휠 / 웹=브라우저 time picker -->
      <div class="popup_body picker_group" @click="openNativeTimePicker">
        <div class="wheel_item"><span>{{ view.ampm }}</span></div>
        <div class="wheel_item"><span>{{ view.hour }}</span></div>
        <div class="wheel_item"><span>{{ view.minute }}</span></div>
      </div>

      <div class="popup_btm">
        <button @click="confirm" class="p_basic">확인</button>
        <button @click="$emit('close')" class="p_white">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Capacitor } from '@capacitor/core'
import { DatetimePicker } from '@capawesome-team/capacitor-datetime-picker'

/* 배경 스크롤 잠금 */
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

/* 기본값 & 프롭스 */
const DISPLAY_DEFAULT = { ampm: '오전', hour: '10', minute: '00' }

const props = defineProps({
  modelValue: { type: Object, default: () => ({ ampm: null, hour: null, minute: null }) }
})
const emit = defineEmits(['update:modelValue','close'])

/* 유틸 */
const pad2 = v => String(v ?? '').padStart(2, '0')

/* 빈 문자열/이상값 보정 포함 */
const sanitizeView = (v = {}) => {
  const rawAmpm = (v.ampm || '').trim()
  const ampm = (rawAmpm === '오전' || rawAmpm === '오후') ? rawAmpm : DISPLAY_DEFAULT.ampm

  const toNum = x => {
    const n = Number(x)
    return Number.isFinite(n) ? n : NaN
  }

  let h = toNum(v.hour)
  if (!(h >= 1 && h <= 12)) h = Number(DISPLAY_DEFAULT.hour) // 1~12 아닌 값이면 기본값

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
  if (view.value.ampm === '오전' && h12 === 12) h24 = 0 // 오전 12시 → 00
  d.setHours(h24, m, 0, 0)
  return d
}

/** Date → view(오전/오후 + 12h) */
const dateToView = (d) => {
  const h24 = d.getHours()
  const m   = d.getMinutes()
  const ampm = h24 < 12 ? '오전' : '오후'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return { ampm, hour: pad2(h12), minute: pad2(m) }
}

/** view → "HH:MM"(24h) : 웹 폴백 input[type=time]에 사용 */
const viewToHHMM24 = () => {
  const d = viewToDate()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/* 피커 열기 (네이티브 우선, 웹 폴백) */
const openNativeTimePicker = async () => {
  // 디바이스(네이티브)일 때
  if (Capacitor.isNativePlatform?.()) {
    try {
      const base = viewToDate()
      const { value } = await DatetimePicker.present({
        mode: 'time',
        value: base.toISOString(),
        locale: 'ko-KR',
        theme: 'auto'
      })
      if (value) view.value = dateToView(new Date(value))
      return
    } catch {
      return // 취소 등
    }
  }

  // 웹 폴백: 숨김 input[type=time] 강제 오픈
  const inp = document.createElement('input')
  inp.type = 'time'
  inp.value = viewToHHMM24() // "HH:MM"
  inp.step = '60'            // 분 단위(초 필요하면 '1')
  Object.assign(inp.style, {
    position: 'fixed',
    left: '-9999px',
    top: '50%',
    opacity: '0',
    zIndex: '2147483647'
  })
  document.body.appendChild(inp)

  const cleanup = () => {
    if (document.body.contains(inp)) document.body.removeChild(inp)
  }

  inp.addEventListener('change', () => {
    const [hh, mm] = (inp.value || '').split(':').map(Number)
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      const ampm = (hh >= 12) ? '오후' : '오전'
      let h12 = hh % 12
      if (h12 === 0) h12 = 12 // 00 → 12
      view.value = { ampm, hour: pad2(h12), minute: pad2(mm) }
    }
    cleanup()
  }, { once: true })
  inp.addEventListener('blur', cleanup, { once: true })

  try {
    inp.focus({ preventScroll: true })
    // 최신 크롬
    // @ts-ignore
    if (typeof inp.showPicker === 'function') inp.showPicker()
    else inp.click()
  } catch {
    inp.click()
  }

  setTimeout(cleanup, 20000) // 안전 정리
}

/* 확인 */
const confirm = () => {
  emit('update:modelValue', { ...view.value })
  emit('close')
}
</script>

<style scoped>
/* 기존 레이아웃 유지 */
.picker_group {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: .75rem;
  align-items: center;
  cursor: pointer;
}
.wheel_item {
  height: 44px;
  display:flex; align-items:center; justify-content:center;
  font-size: 18px; font-weight: 600;
}
</style>
