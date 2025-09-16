// src/stores/routineForm.js
const MAX_MONTHLY_DATES = 3
import { defineStore } from 'pinia'
import { db } from '@/firebase'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'

const KOR_TO_ICS = { 월:'MO', 화:'TU', 수:'WE', 목:'TH', 금:'FR', 토:'SA', 일:'SU' }
const KOR_TO_NUM = { 월:1, 화:2, 수:3, 목:4, 금:5, 토:6, 일:7 }
const NUM_TO_KOR = { 1:'월', 2:'화', 3:'수', 4:'목', 5:'금', 6:'토', 7:'일' }

// ── 시간/날짜 유틸 ──────────────────────────────────────────
const p2 = n => String(n).padStart(2,'0')
const toISO = d => (d ? `${d.year}-${p2(d.month)}-${p2(d.day)}` : null)
const todayParts = (tz='Asia/Seoul') => {
  const now = new Date()
  // 한국 기준 오늘(연-월-일) 추출
  const fmt = new Intl.DateTimeFormat('en-CA',{ timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit'})
  const [y,m,d] = fmt.format(now).split('-').map(v=>+v)
  return { year:y, month:m, day:d }
}
const todayISO = (tz='Asia/Seoul') => {
  const {year,month,day} = todayParts(tz)
  return `${p2(year)}-${p2(month)}-${p2(day)}`
}
const safeISOFromDateObj = obj => {
  const s = toISO(obj)
  return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s !== '0000-00-00' && s !== '0-00-00') ? s : null
}
const deepClean = (v) => {
  if (Array.isArray(v)) return v.filter(x => x !== undefined).map(deepClean)
  if (v && typeof v === 'object') {
    const r = {}
    Object.entries(v).forEach(([k,val]) => { if (val !== undefined) r[k] = deepClean(val) })
    return r
  }
  return v
}
const sanitizeComment = (v) => {
  if (v == null) return null
  let s = String(v).replace(/[\u200B-\u200D\uFEFF]/g,'')
  s = s.replace(/\r\n?/g,'\n').trim()
  if (s.length === 0) return null
  if (s.length > 200) s = s.slice(0,200)
  return s
}
const normalizeCardSkinStrict = (v) => {
  const m = String(v || '').match(/(\d{1,2})/)
  const n = m && m[1] ? m[1].padStart(2,'0') : '01'
  return `option${n}`
}
const getBaseId = (id) => String(id || '').split('-')[0]
const isAllKoreanWeekdays = (arr=[]) => {
  const need = ['월','화','수','목','금','토','일']
  if (!Array.isArray(arr) || arr.length !== 7) return false
  const set = new Set(arr.map(String))
  return need.every(d => set.has(d))
}
const daysKorToNum = (arr=[]) =>
  (arr||[]).map(d => KOR_TO_NUM[d] || (Number.isFinite(+d) ? +d : null)).filter(n => n>=1 && n<=7)
const daysNumToKor = (arr=[]) =>
  (arr||[]).map(n => NUM_TO_KOR[Number(n)]).filter(Boolean)
const uniqSorted = (arr=[]) => Array.from(new Set(arr)).sort((a,b)=>a-b)

// ── 시간 파서 (오전/오후, AM/PM, 다양한 구분자 지원) ─────────────────────
const parseHM = (t) => {
  if (!t) return null
  // 객체형 {hour, minute, ampm?}
  if (t && typeof t === 'object') {
    let h = Number(t.hour), m = Number(t.minute)
    const tag = String(t.ampm || '').trim()
    if (Number.isFinite(h) && Number.isFinite(m)) {
      if (/^오후$/i.test(tag) || /^PM$/i.test(tag)) { if (h < 12) h += 12 }
      if (/^오전$/i.test(tag) || /^AM$/i.test(tag)) { if (h === 12) h = 0 }
      h = Math.max(0, Math.min(23, h))
      m = Math.max(0, Math.min(59, m))
      return { hour:h, minute:m }
    }
  }

  // 문자열형
  const s0 = String(t).trim()
  if (!s0) return null

  // 구분자 통일: 공백/점/가운뎃점 → 콜론
  const s1 = s0
    .replace(/[.\u00B7\s]+/g, ':')
    .replace(/:+/g, ':')

  // 양쪽에 오전/오후/AM/PM 붙는 형태 캡처
  let m = s1.match(/^(?:\s*(오전|오후|AM|PM)\s*)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i)
  if (m) {
    let h = +m[2], mm = +m[3]
    const tag = (m[1] || m[4] || '').toUpperCase()
    if (tag === 'PM' || tag === '오후'.toUpperCase()) { if (h < 12) h += 12 }
    if (tag === 'AM' || tag === '오전'.toUpperCase()) { if (h === 12) h = 0 }
    h = Math.max(0, Math.min(23, h))
    mm = Math.max(0, Math.min(59, mm))
    return { hour:h, minute:mm }
  }

  // 순수 HH:mm
  m = s1.match(/^(\d{1,2}):(\d{2})$/)
  if (m) {
    const h = Math.max(0, Math.min(23, +m[1]))
    const mm = Math.max(0, Math.min(59, +m[2]))
    return { hour:h, minute:mm }
  }

  return null
}

const clampDaily = (n) => Math.max(0, Math.min(6, parseInt(n, 10) || 0))

function deriveRepeatDailyFromRoutine(r) {
  // 기존 값 우선
  if (Number.isInteger(r?.repeatDaily)) return clampDaily(r.repeatDaily)
  // 혹시 저장이 repeatEveryDays만 되어 있는 경우 동기화
  if (r?.repeatEveryDays !== undefined && r.repeatEveryDays !== '') {
    const n = Number(r.repeatEveryDays)
    if (Number.isFinite(n)) return clampDaily(n)
  }
  return null
}

export const useRoutineFormStore = defineStore('routineForm', {
  state: () => ({
    mode: 'create',
    routineId: null,
    title: '',
    repeatType: 'daily',       // 'daily' | 'weekly' | 'monthly'
    repeatDaily: null,         // daily일 때: 0=오늘만, 1=매일, 2~6=N일마다
    repeatWeeks: '',           // weekly 간격 문자열(예: '매주', '2주마다')
    repeatWeekDays: [],        // ['월','수'] 등
    weeklyDaily: false,        // 주간에서 "매일" 토글
    repeatMonthDays: [],       // [29,30,31] 등
    startDate: null,           // {year, month, day}
    endDate: null,             // {year, month, day} | null
    alarmTime: null,           // 'HH:mm' (저장 시 강제 표준화)
    isWalkModeOff: false,
    ruffy: null,
    course: null,
    goalCount: null,
    colorIndex: null,
    cardSkin: 'option01',
    comment: '',
    fieldErrors: {},
    tz: 'Asia/Seoul',
    isSaving: false
  }),

  getters: {
    hasWalk(state) {
      if (state.isWalkModeOff) return false
      const hasR = !!state.ruffy
      const hasC = !!state.course
      const hasG = Number.isInteger(state.goalCount) && state.goalCount > 0
      return hasR && hasC && hasG
    },
    isAppearanceReady(state) {
      const validColor = Number.isInteger(state.colorIndex)
      const validSkin  = !!normalizeCardSkinStrict(state.cardSkin)
      return validColor && validSkin
    },

    // Firestore에 저장할 payload (표준형)
    payload(state) {
      const tz = state.tz || 'Asia/Seoul'

      // 시작/종료일 정규화
      // ❗️중요: 시작일을 사용자가 "안 건드렸다면" 저장하지 않음 (토글이 자동으로 켜져 보이는 문제 방지)
      const hasStart = !!safeISOFromDateObj(state.startDate)
      const startObj = hasStart ? state.startDate : null
      const startISO = hasStart ? safeISOFromDateObj(startObj) : null

      const hasEnd = !!safeISOFromDateObj(state.endDate)

      const normalizedType = state.repeatType

      // daily: UI의 repeatDaily를 저장스키마 repeatEveryDays로 동기화
      const dailyInterval =
        normalizedType === 'daily'
          ? (Number.isInteger(state.repeatDaily) ? state.repeatDaily : null)
          : null

      // “오늘만(0)”이면 start=end로 강제 (단, 시작일이 있을 때만)
      const endForTodayOnly =
        (normalizedType === 'daily' && dailyInterval === 0 && hasStart) ? startISO : null

      // 주간 요일 배열(사용자 선택 우선, 비었을 때만 weeklyDaily로 전체)
      const weeklyDaysNum =
        normalizedType === 'weekly'
          ? (() => {
              const selectedKor = Array.isArray(state.repeatWeekDays) ? state.repeatWeekDays : []
              const selectedHasAny = selectedKor.length > 0
              const selectedIsAll = isAllKoreanWeekdays(selectedKor)
              const useAll = state.weeklyDaily && (!selectedHasAny || selectedIsAll)
              return useAll ? [1,2,3,4,5,6,7] : daysKorToNum(selectedKor)
            })()
          : []

      // alarmTime은 저장 시점에 HH:mm으로 강제 정규화하지만,
      // 여기서도 가능하면 한번 더 정규화 시도(파서 실패 시, 원문 유지; 최종 저장 시 한 번 더 강제)
      const hmParsed = parseHM(state.alarmTime)
      const normalizedAlarm = hmParsed ? `${p2(hmParsed.hour)}:${p2(hmParsed.minute)}` : (state.alarmTime || null)

      // 월간 날짜 정규화: 숫자화→범위필터→중복제거→정렬→최대 개수 제한
      const monthDaysNorm = normalizedType === 'monthly'
        ? uniqSorted(
            (state.repeatMonthDays || [])
              .map(d => parseInt(d,10))
              .filter(d => Number.isInteger(d) && d >= 1 && d <= 31)
          ).slice(0, MAX_MONTHLY_DATES)
        : []

          // ── anchorDate 계산 ───────────────────────────────
        let anchorDateISO = null
          if (normalizedType === 'weekly' && parseInt(state.repeatWeeks,10) > 1 && weeklyDaysNum.length > 0) {
            // 기준 = startDate 있으면 거기서, 없으면 오늘
            const baseISO = hasStart ? startISO : todayISO(tz)
            const base = new Date(baseISO)
            const baseW = base.getDay() === 0 ? 7 : base.getDay() // JS: 일=0 → 7로
            let minDelta = 999
            for (const wd of weeklyDaysNum) {
              const delta = (wd - baseW + 7) % 7
              if (delta < minDelta) minDelta = delta
            }
            const anchor = new Date(base)
            anchor.setDate(base.getDate() + minDelta)
            anchorDateISO = `${p2(anchor.getFullYear())}-${p2(anchor.getMonth()+1)}-${p2(anchor.getDate())}`
          } else if (hasStart) {
            anchorDateISO = startISO
          }
          
      const cleaned = {
        title: state.title,
        repeatType: normalizedType,
        repeatDays: [],

        // daily일 때의 간격 저장: 0=오늘만, 1=매일, 2~6=N일마다
        repeatEveryDays:
          normalizedType === 'daily'
            ? (Number.isInteger(dailyInterval) ? dailyInterval : null)
            : null,

        // UI/분석 편의를 위해 repeatDaily도 함께 저장(스케줄러는 repeatEveryDays 사용)
        repeatDaily:
          normalizedType === 'daily'
            ? (Number.isInteger(dailyInterval) ? dailyInterval : null)
            : null,

        repeatWeeks: normalizedType === 'weekly' ? (state.repeatWeeks || '') : '',
        repeatWeekDays: weeklyDaysNum,
        repeatMonthDays: monthDaysNorm,

        // 시작일은 사용자가 선택한 경우에만 저장
        startDate: hasStart ? startObj : null,
        // 오늘만(0) && 시작일 있을 때 end=start, 아니면 사용자가 지정한 end만 저장
        endDate: endForTodayOnly ? startObj : (hasEnd ? state.endDate : null),

        alarmTime: normalizedAlarm,

        // 걷기 부가 필드
        ruffy: state.isWalkModeOff ? null : state.ruffy,
        course: state.isWalkModeOff ? null : state.course,
        goalCount: state.isWalkModeOff ? null : state.goalCount,

        colorIndex: state.colorIndex,
        cardSkin: normalizeCardSkinStrict(state.cardSkin),
        comment: sanitizeComment(state.comment),

        hasWalk: this.hasWalk,
        tz,

        // 백엔드/스케줄러 호환용 앵커 문자열
        // 시작일을 안 건드렸으면 start/end 앵커도 저장하지 않음
        ...(hasStart ? { start: startISO } : {}),
        ...(endForTodayOnly ? { end: startISO } : (hasEnd ? { end: safeISOFromDateObj(state.endDate) } : {})),
        ...(anchorDateISO ? { anchorDate: anchorDateISO } : {})   
      }
      return deepClean(cleaned)
    }
  },

  actions: {
    setComment(v) {
      this.comment = String(v ?? '')
      const fe = { ...this.fieldErrors }; delete fe.comment; this.fieldErrors = fe
    },
    setError(key, msg) { this.fieldErrors = { ...this.fieldErrors, [key]: msg } },
    clearErrors() { this.fieldErrors = {} },

    reset() {
      this.mode = 'create'
      this.routineId = null
      this.title = ''
      this.repeatType = 'daily'
      this.repeatDaily = null
      this.repeatWeeks = ''
      this.repeatWeekDays = []
      this.weeklyDaily = false
      this.repeatMonthDays = []
      this.startDate = null
      this.endDate = null
      this.alarmTime = null
      this.isWalkModeOff = false
      this.ruffy = null
      this.course = null
      this.goalCount = null
      this.colorIndex = null
      this.cardSkin = 'option01'
      this.comment = ''
      this.clearErrors()
    },

    initFrom(routine) {
      if (!routine) { this.reset(); return }
      this.mode = 'edit'
      this.routineId = routine.id || null
      this.title = routine.title || ''
      this.repeatType = routine.repeatType || 'daily'
      this.repeatDaily = this.repeatType === 'daily'
        ? deriveRepeatDailyFromRoutine(routine)
        : null
      this.repeatWeeks = routine.repeatWeeks || ''
      const rawWeekDays = Array.isArray(routine.repeatWeekDays) ? routine.repeatWeekDays : []
      const weekDaysKor = typeof rawWeekDays[0] === 'number' ? daysNumToKor(rawWeekDays) : rawWeekDays
      this.repeatWeekDays = weekDaysKor
      this.weeklyDaily = isAllKoreanWeekdays(weekDaysKor)
      this.repeatMonthDays = routine.repeatMonthDays || []
      this.startDate = routine.startDate || null
      this.endDate = routine.endDate || null
      this.alarmTime = routine?.alarmTime ?? null
      this.isWalkModeOff = !(routine.ruffy && routine.course && Number.isInteger(routine.goalCount) && routine.goalCount > 0)
      this.ruffy = routine.ruffy || null
      this.course = routine.course || null
      this.goalCount = Number.isInteger(+routine.goalCount) ? +routine.goalCount : null
      this.colorIndex = Number.isFinite(+routine.colorIndex) ? +routine.colorIndex : null
      this.cardSkin = normalizeCardSkinStrict(routine.cardSkin) || 'option01'
      this.comment = String(routine.comment ?? '')
      this.clearErrors()
    },

    // 주간 요일 선택 시 "매일" 토글 자동 관리
    setRepeatWeekDays(daysKor) {
      const a = Array.isArray(daysKor) ? daysKor : []
      this.repeatWeekDays = a
      this.weeklyDaily = isAllKoreanWeekdays(a)
    },

    toggleWalk(off) {
      this.isWalkModeOff = !!off
      if (this.isWalkModeOff) {
        this.ruffy = null
        this.course = null
        this.goalCount = null
        const fe = { ...this.fieldErrors }; delete fe.ruffy; delete fe.course; delete fe.goal; this.fieldErrors = fe
      }
    },
    setRuffy(val) {
      this.ruffy = val || null
      const fe = { ...this.fieldErrors }; delete fe.ruffy; this.fieldErrors = fe
    },
    setCourse(val) {
      const s = val == null ? null : String(val).trim()
      this.course = s && s.length ? s : null
      const fe = { ...this.fieldErrors }; delete fe.course; this.fieldErrors = fe
    },
    setGoalCount(val) {
      const n = Number.isFinite(+val) ? Math.max(0, parseInt(val,10)) : null
      this.goalCount = Number.isInteger(n) && n > 0 ? n : null
      const fe = { ...this.fieldErrors }; delete fe.goal; this.fieldErrors = fe
    },

    // ── 입력 검증 ──────────────────────────────────────────
    validate() {
      this.clearErrors()

      // 제목
      if (!this.title || String(this.title).trim() === '') {
        this.setError('title','다짐 제목을 입력해주세요.')
        return false
      }
      // 반복 타입
      if (!this.repeatType) {
        this.setError('repeat','반복 주기를 선택해주세요.')
        return false
      }
      // 알람시간 파싱 체크 (저장 시 강제 정규화되지만, UX 차원에서 미리 경고)
      const hm = parseHM(this.alarmTime)
      if (!hm) {
        this.setError('alarm','알림 시간을 HH:mm 형식으로 입력해주세요.')
        return false
      }

      if (this.repeatType === 'daily') {
        if (!Number.isInteger(this.repeatDaily) || this.repeatDaily < 0 || this.repeatDaily > 6) {
          this.setError('repeat','반복 주기를 선택해주세요.')
          return false
        }
      }

      if (this.repeatType === 'weekly') {
        const valid = this.weeklyDaily || (Array.isArray(this.repeatWeekDays) && this.repeatWeekDays.length > 0)
        if (!valid) {
          this.setError('repeat','요일을 선택하거나 “매일”을 선택해 주세요.')
          return false
        }
      }

      if (this.repeatType === 'monthly') {
        if (!this.repeatMonthDays || this.repeatMonthDays.length === 0) {
          this.setError('repeat','반복 주기를 선택해주세요.')
          return false
        }
        if (Array.isArray(this.repeatMonthDays) && this.repeatMonthDays.length > MAX_MONTHLY_DATES) {
          this.setError('repeat', `월간 날짜는 최대 ${MAX_MONTHLY_DATES}개까지 선택할 수 있어요.`)
          return false
        }
      }

      if (!Number.isInteger(this.colorIndex)) {
        this.setError('priority','다짐 색상을 선택해주세요.')
        return false
      }

      const sc = sanitizeComment(this.comment)
      if (this.comment && this.comment.trim().length > 200) {
        this.setError('comment','코멘트는 200자 이내로 입력해주세요.')
        return false
      }
      // 코멘트 정리 (null이면 빈 문자열로)
      if (sc === null) this.comment = ''

      // “오늘만(once=0)”일 때 과거시간 저장 방지(여기서 UX 경고용 훅 자리)
      if (this.repeatType === 'daily' && Number.isInteger(this.repeatDaily) && this.repeatDaily === 0) {
        const hm2 = parseHM(this.alarmTime)
        if (hm2) {
          // 필요 시 과거시간 경고 추가 가능
        }
      }

      // 걷기 모드 켜진 경우 필수값
      if (!this.isWalkModeOff) {
        if (!this.ruffy) { this.setError('ruffy','러피를 선택해주세요.'); return false }
        if (!this.course || String(this.course).trim() === '') { this.setError('course','코스를 선택해주세요.'); return false }
        if (!Number.isInteger(this.goalCount) || this.goalCount <= 0) { this.setError('goal','목표 횟수를 선택해주세요.'); return false }
      }

      return true
    },

    // ── 저장 ───────────────────────────────────────────────
    async save() {
      if (this.isSaving) return { ok:false }
      this.isSaving = true
      try {
        if (!this.validate()) return { ok:false }

        const auth = useAuthStore()
        await auth.ensureReady()
        const uid = auth.user?.uid
        if (!uid) return { ok:false, error:'로그인이 필요합니다.' }

        // alarmTime을 반드시 HH:mm으로 강제 표준화
        const basePayload = this.payload
        const hmParsed = parseHM(this.alarmTime || basePayload.alarmTime)
        const normalizedAlarm = hmParsed ? `${p2(hmParsed.hour)}:${p2(hmParsed.minute)}` : null
        const payload = { ...basePayload, alarmTime: normalizedAlarm }

        let res
        if (this.mode === 'edit' && this.routineId) {
          const rid = getBaseId(this.routineId)
          await setDoc(
            doc(db, 'users', uid, 'routines', rid),
            { ...payload, updatedAt: serverTimestamp(), updatedAtMs: Date.now() },
            { merge: true }
          )
          res = { ok:true, id: rid, data: payload }
        } else {
          const colRef = collection(db, 'users', uid, 'routines')
          const nowMs = Date.now()
          const docRef = await addDoc(colRef, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdAtMs: nowMs,
            updatedAtMs: nowMs
          })
          res = { ok:true, id: docRef.id, data: payload }
        }

        return res
      } catch (e) {
        return { ok:false, error: String(e && e.message ? e.message : e) }
      } finally {
        this.isSaving = false
      }
    }
  }
})
