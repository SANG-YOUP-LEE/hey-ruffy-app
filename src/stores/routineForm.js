// src/stores/routineForm.js
const MAX_MONTHLY_DATES = 3
import { defineStore } from 'pinia'
import { db } from '@/firebase'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { useSchedulerStore } from '@/stores/scheduler'

// ✅ iOS 네이티브 알림 (N>1 간격은 epoch 배열로 직접 등록)
import { scheduleOnIOS, cancelOnIOS, postIOS, waitBridgeReady } from '@/utils/iosNotify'

// 중복 생성 방지용(동일 틱/연속 탭 가드)
let __pendingCreateId = null
const KOR_TO_ICS = { 월:'MO', 화:'TU', 수:'WE', 목:'TH', 금:'FR', 토:'SA', 일:'SU' }
const KOR_TO_NUM = { 월:1, 화:2, 수:3, 목:4, 금:5, 토:6, 일:7 }     // 월=1 … 일=7
const NUM_TO_KOR = { 1:'월', 2:'화', 3:'수', 4:'목', 5:'금', 6:'토', 7:'일' }

const p = n => String(n).padStart(2,'0')
const toISO = d => (d ? `${d.year}-${p(d.month)}-${p(d.day)}` : null)
const weeklyDaysToICS = arr => (arr||[]).map(k=>KOR_TO_ICS[String(k).replace(/['"]/g,'')]).filter(Boolean)
const parseInterval = s => { const m=String(s||'').match(/(\d+)/); return m?+m[1]:1 }
const safeISOFromDateObj = obj => { const s = toISO(obj); return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s !== '0000-00-00' && s !== '0-00-00') ? s : null }
const getBaseId = (id) => String(id || '').split('-')[0]
const normalizeCardSkinStrict = (v) => { const m = String(v || '').match(/(\d{1,2})/); const n = m && m[1] ? m[1].padStart(2,'0') : '01'; return `option${n}` }
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const deepClean = (v) => { if (Array.isArray(v)) return v.filter(x => x !== undefined).map(deepClean); if (v && typeof v === 'object') { const r = {}; Object.entries(v).forEach(([k,val]) => { if (val !== undefined) r[k] = deepClean(val) }); return r } return v }
const sanitizeComment = (v) => { if (v == null) return null; let s = String(v).replace(/[\u200B-\u200D\uFEFF]/g,''); s = s.replace(/\r\n?/g,'\n').trim(); if (s.length === 0) return null; if (s.length > 200) s = s.slice(0,200); return s }
const isAllKoreanWeekdays = (arr=[]) => { const need = ['월','화','수','목','금','토','일']; if (!Array.isArray(arr) || arr.length !== 7) return false; const set = new Set(arr.map(String)); return need.every(d => set.has(d)) }
const daysKorToNum = (arr=[]) => (arr||[]).map(d => KOR_TO_NUM[d] || (Number.isFinite(+d) ? +d : null)).filter(n => n>=1 && n<=7)
const daysNumToKor = (arr=[]) => (arr||[]).map(n => NUM_TO_KOR[Number(n)]).filter(Boolean)

// ── 시간 파서/도우미 ─────────────────────────────────────
const parseHM = (t) => {
  if (!t) return null

  if (typeof t === 'string') {
    const s = t.trim()

    // 24시간 "HH:mm"
    let m = s.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      const h = Math.max(0, Math.min(23, +m[1]))
      const mm = Math.max(0, Math.min(59, +m[2]))
      return { hour: h, minute: mm }
    }

    // 영어 AM/PM 12시간제
    m = s.match(/^(?:\s*(AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const ampm = (m[1] || m[4] || '').toUpperCase()
      if (ampm === 'PM' && h < 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }

    // 한글 오전/오후 12시간제
    m = s.match(/^(?:\s*(오전|오후)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후))?$/)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const ampmKr = (m[1] || m[4] || '')
      if (ampmKr === '오후' && h < 12) h += 12
      if (ampmKr === '오전' && h === 12) h = 0
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
  } else if (typeof t === 'object') {
    // 🔧 빈 문자열('')을 0으로 해석하지 않도록 엄격 처리
    const hasNum = (v) => typeof v !== 'undefined' && v !== null && String(v).trim() !== '' && /^\d{1,2}$/.test(String(v).trim())
    if (!hasNum(t.hour) || !hasNum(t.minute)) return null

    let h = parseInt(String(t.hour).trim(), 10)
    const mm = parseInt(String(t.minute).trim(), 10)

    const ampm = String(t.ampm || '').toUpperCase()
    if (ampm === 'PM' || t.ampm === '오후') { if (h < 12) h += 12 }
    if (ampm === 'AM' || t.ampm === '오전') { if (h === 12) h = 0 }

    if (Number.isFinite(h) && Number.isFinite(mm)) {
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
    return null
  }
  return null
}

const toAtISO = (dateISO, hm, tz = 'Asia/Seoul') => {
  if (!dateISO || !hm) return null
  if (!Number.isFinite(hm.hour) || !Number.isFinite(hm.minute)) return null
  return `${dateISO}T${p(hm.hour)}:${p(hm.minute)}:00+09:00`
}

const atISOToEpochMs = (atISO) => {
  if (!atISO) return null
  const d = new Date(atISO)
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

const clampDaily = (n) => Math.max(0, Math.min(6, parseInt(n, 10) || 0))

function deriveRepeatDailyFromRoutine(r) {
  if (Number.isInteger(r?.repeatDaily)) return clampDaily(r.repeatDaily)
  if (r?.repeatEveryDays !== undefined && r.repeatEveryDays !== '') {
    const n = Number(r.repeatEveryDays)
    if (Number.isFinite(n)) return clampDaily(n)
  }
  if (r?.rule && r.rule.freq === 'once') return 0
  if (r?.startDate && r?.endDate) {
    const same =
      +r.startDate?.year === +r.endDate?.year &&
      +r.startDate?.month === +r.endDate?.month &&
      +r.startDate?.day === +r.endDate?.day
    if (same) return 0
  }
  if (typeof r?.start === 'string' && typeof r?.end === 'string' && r.start === r.end) {
    return 0
  }
  return null
}

// ── Epoch 생성 유틸 (N>1 간격용) ─────────────────────────
const toEpochSec = (d) => Math.floor(d.getTime() / 1000)
const MAX_OCC = 30 // iOS 64개 제한 감안(여유)

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function addWeeks(date, n) {
  return addDays(date, n * 7)
}
// our weekday: 월=1..일=7 → JS getDay(): 일=0..토=6
function korNumToJsWeekday(n) {
  return (n % 7) // 1→1, 2→2, …, 6→6, 7→0(=일)
}
function startDateWithHM(iso, {hour, minute}) {
  const d = iso ? new Date(`${iso}T00:00:00+09:00`) : new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

function buildDailyEpochs({ startISO, endISO, hour, minute, intervalDays }) {
  const out = []
  let cur = startDateWithHM(startISO, {hour, minute})
  const end = endISO ? new Date(`${endISO}T23:59:59+09:00`) : null

  // 과거면 다음 유효 시점을 향해 끌어올림
  while (cur.getTime() <= Date.now()) {
    cur = addDays(cur, Math.max(1, intervalDays))
  }

  while (out.length < MAX_OCC) {
    if (end && cur > end) break
    if (cur.getTime() > Date.now()) out.push(toEpochSec(cur))
    cur = addDays(cur, Math.max(1, intervalDays))
  }
  return out
}

function buildWeeklyEpochs({ startISO, endISO, hour, minute, intervalWeeks, weekdays /*[1..7: 월=1..일=7]*/ }) {
  const out = []
  const end = endISO ? new Date(`${endISO}T23:59:59+09:00`) : null

  // 앵커 주의 시작 기준은 startISO의 날짜
  let anchor = startDateWithHM(startISO, {hour, minute})

  // 앵커가 과거면 intervalWeeks 단위로 앞으로 이동
  while (anchor.getTime() <= Date.now()) {
    anchor = addWeeks(anchor, Math.max(1, intervalWeeks))
  }

  while (out.length < MAX_OCC) {
    if (end && anchor > end) break

    for (const w of weekdays) {
      const jsW = korNumToJsWeekday(w)
      const base = new Date(anchor)
      const diff = (jsW - base.getDay() + 7) % 7
      const when = addDays(base, diff)
      when.setHours(hour, minute, 0, 0)

      if ((!end || when <= end) && when.getTime() > Date.now() && out.length < MAX_OCC) {
        out.push(toEpochSec(when))
      }
    }

    anchor = addWeeks(anchor, Math.max(1, intervalWeeks))
  }

  return Array.from(new Set(out)).sort((a,b)=>a-b)
}

// ── Pinia Store ─────────────────────────────────────────
export const useRoutineFormStore = defineStore('routineForm', {
  state: () => ({
    mode: 'create',
    routineId: null,
    title: '',
    repeatType: 'daily',
    repeatDaily: null,      // 0=오늘만, 1~6 = N일마다
    repeatWeeks: '',        // '매주','2주마다',...
    repeatWeekDays: [],     // ['월','화',...]
    weeklyDaily: false,     // '매일' 토글
    repeatMonthDays: [],    // [1..31], 최대 3개
    startDate: null,
    endDate: null,
    alarmTime: null,
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
    icsRule(state) {
      const hasStart = !!safeISOFromDateObj(state.startDate)
      const anchorISO = hasStart ? safeISOFromDateObj(state.startDate) : todayISO()

      // ✅ 자동 축약 제거: weekly는 항상 weekly로 보낸다
      if (state.repeatType === 'daily') {
        if (!Number.isInteger(state.repeatDaily)) return null
        const n = state.repeatDaily
        if (n === 0) return { freq: 'once', anchor: anchorISO }
        const interval = Math.min(6, Math.max(1, n))
        return { freq: 'daily', interval, anchor: anchorISO }
      }

      // 🔧 수정 ①: 주간 — 명시 요일이 있으면 그것을 최우선으로 사용
      if (state.repeatType === 'weekly') {
        const interval = parseInterval(state.repeatWeeks)
        const hasExplicitDays = Array.isArray(state.repeatWeekDays) && state.repeatWeekDays.length > 0
        const weekDaysKor = hasExplicitDays
          ? state.repeatWeekDays
          : (state.weeklyDaily ? ['월','화','수','목','금','토','일'] : [])
        return { freq: 'weekly', interval, anchor: anchorISO, byWeekday: weeklyDaysToICS(weekDaysKor) }
      }

      if (state.repeatType === 'monthly') {
        return { freq: 'monthly', interval: 1, anchor: anchorISO, byMonthDay: (state.repeatMonthDays||[]).map(Number) }
      }

      return { freq: state.repeatType, interval: 1, anchor: anchorISO }
    },
    payload(state) {
      const hasStart = !!safeISOFromDateObj(state.startDate)
      const hasEnd = !!safeISOFromDateObj(state.endDate)
      const anchorISO = hasStart ? safeISOFromDateObj(state.startDate) : todayISO()

      // ✅ 자동 축약 제거: normalizedType = 저장한 선택 그대로
      const normalizedType = state.repeatType
      const dailyInterval =
        normalizedType === 'daily'
          ? (Number.isInteger(state.repeatDaily) ? state.repeatDaily : null)
          : null

      const endForTodayOnly =
        normalizedType === 'daily' && dailyInterval === 0 ? anchorISO : null

      // 🔧 수정 ②: 저장 시 주간 요일 계산 — 명시 요일 우선
      const weeklyDaysNum =
        normalizedType === 'weekly'
          ? (Array.isArray(state.repeatWeekDays) && state.repeatWeekDays.length > 0
              ? daysKorToNum(state.repeatWeekDays)
              : (state.weeklyDaily ? [1,2,3,4,5,6,7] : []))
          : []

      const cleaned = {
        title: state.title,
        repeatType: normalizedType,
        repeatDays: [],
        repeatEveryDays:
          normalizedType === 'daily'
            ? (Number.isInteger(dailyInterval) && dailyInterval > 0 ? dailyInterval : null)
            : null,
        repeatWeeks: normalizedType === 'weekly' ? (state.repeatWeeks || '') : '',
        repeatWeekDays: weeklyDaysNum,
        repeatMonthDays:
          normalizedType === 'monthly' ? [...(state.repeatMonthDays || [])].map(Number) : [],
        startDate: hasStart ? state.startDate : null,
        endDate: endForTodayOnly ? { ...state.startDate } : (hasEnd ? state.endDate : null),
        alarmTime: state.alarmTime,
        ruffy: state.isWalkModeOff ? null : state.ruffy,
        course: state.isWalkModeOff ? null : state.course,
        goalCount: state.isWalkModeOff ? null : state.goalCount,
        colorIndex: state.colorIndex,
        cardSkin: normalizeCardSkinStrict(state.cardSkin),
        comment: sanitizeComment(state.comment),
        hasWalk: this.hasWalk,
        tz: state.tz,
        rule: this.icsRule,
        start: anchorISO,
        ...(endForTodayOnly ? { end: anchorISO } : (hasEnd ? { end: safeISOFromDateObj(state.endDate) } : {}))
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

    validate() {
      this.clearErrors()

      // 공통 필드 체크
      if (!this.title || String(this.title).trim() === '') {
        this.setError('title','다짐 제목을 입력해주세요.')
        return false
      }
      if (!this.repeatType) {
        this.setError('repeat','반복 주기를 선택해주세요.')
        return false
      }

      // 반복 주기별 체크
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

      // 걷기 모드 켜져 있을 때만 체크
      if (!this.isWalkModeOff) {
        if (!this.ruffy) { this.setError('ruffy','러피를 선택해주세요.'); return false }
        if (!this.course || String(this.course).trim() === '') { this.setError('course','코스를 선택해주세요.'); return false }
        if (!Number.isInteger(this.goalCount) || this.goalCount <= 0) { this.setError('goal','목표 횟수를 선택해주세요.'); return false }
      }

      // 코멘트 정리
      if (sc === null) this.comment = ''

      // ✅ “오늘만(once)”일 때 알람 과거시간 검증 (알람 있을 때만)
      const isOnce =
        this.repeatType === 'daily' &&
        Number.isInteger(this.repeatDaily) &&
        this.repeatDaily === 0

      if (isOnce) {
        const hm = parseHM(this.alarmTime)
        if (hm) {
          const dateISO = safeISOFromDateObj(this.startDate) || todayISO()
          const atISO = toAtISO(dateISO, hm)
          const ms = atISOToEpochMs(atISO)
          const now = Date.now()
          const GRACE_MS = 5000

          if (!ms || ms <= (now + GRACE_MS)) {
            this.setError('alarm','이미 지난 시간이에요. 시간을 다시 선택해주세요.')
            return false
          }
        }
      }

      return true
    },

    async save() {
      if (this.isSaving) return { ok:false }
      this.isSaving = true
      try {
        if (!this.validate()) return { ok:false }

        const auth = useAuthStore()
        await auth.ensureReady()
        const uid = auth.user?.uid
        if (!uid) return { ok:false, error:'로그인이 필요합니다.' }

        // ⬇️ alarmTime 정규화(HH:mm) — Firestore엔 항상 "HH:mm"으로 저장
        const basePayload = this.payload
        const hmParsed = parseHM(this.alarmTime || basePayload.alarmTime)
        const normalizedAlarm = hmParsed ? `${p(hmParsed.hour)}:${p(hmParsed.minute)}` : null
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
          const docRef = await addDoc(colRef, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdAtMs: nowMs, updatedAtMs: nowMs })
          res = { ok:true, id: docRef.id, data: payload }
        }

        // ── 예약 처리 ─────────────────────────────────────
        try {
          const sch = useSchedulerStore()
          const hm = parseHM(this.alarmTime || payload.alarmTime)
          const routineId = res?.id
          const title = this.title || payload.title || '알림'
          const baseId = routineId ? `routine-${routineId}` : null

          if (!routineId) {
            // nothing
          } else if (!hm) {
            // ✅ 알람 OFF: 기존 스케줄 전부 취소하고 종료
            try { await waitBridgeReady() } catch (_) {}
            try { if (baseId) await cancelOnIOS(baseId) } catch (e) {}
            try { postIOS({ action: 'cancel', id: `${baseId}-daily` }) } catch (e) {}
            try { if (baseId) sch.cancel(baseId) } catch (e) {}
          } else {
            const startISO = payload.start
            const endISO   = payload.end

            // 과거에 남아 있을 수 있는 daily 알람 제거
            try { await waitBridgeReady(); postIOS({ action: 'cancel', id: `${baseId}-daily` }) } catch (e) {}

            // 1) N>1일/주 → epoch 배열 직접 설치
            let usedEpochs = null
            if (payload?.repeatType === 'daily') {
              const n = Number(payload?.repeatEveryDays || 0)
              if (n >= 2) {
                usedEpochs = buildDailyEpochs({
                  startISO, endISO,
                  hour: hm.hour, minute: hm.minute,
                  intervalDays: n
                })
              }
            } else if (payload?.repeatType === 'weekly') {
              const m = String(payload.repeatWeeks || '').match(/(\d+)/)
              const intervalW = m ? Math.max(1, parseInt(m[1],10)) : 1
              const days = Array.isArray(payload?.repeatWeekDays) ? payload.repeatWeekDays : []
              if (intervalW >= 2 && days.length) {
                usedEpochs = buildWeeklyEpochs({
                  startISO, endISO,
                  hour: hm.hour, minute: hm.minute,
                  intervalWeeks: intervalW,
                  weekdays: days
                })
              }
            }

            if (Array.isArray(usedEpochs) && usedEpochs.length) {
              // 중복 방지: 기존 베이스 purge
              try { if (baseId) await cancelOnIOS(baseId) } catch (e) {}
              await scheduleOnIOS({
                routineId,
                title,
                repeatMode: 'once',
                fireTimesEpoch: usedEpochs,
                sound: 'ruffysound001.wav'
              })
            } else {
              // 2) 그 외(오늘만/매일/매주/매월)
              if (this.icsRule?.freq === 'once') {
                try {
                  await waitBridgeReady()
                  const dateISO = todayISO()
                  const atISO = toAtISO(dateISO, hm)
                  if (atISO) {
                    const atMs = atISOToEpochMs(atISO)
                    if (Number.isFinite(atMs)) {
                      await scheduleOnIOS({
                        routineId,
                        title,
                        repeatMode: 'once',
                        fireTimesEpoch: [Math.floor(atMs / 1000)],
                        sound: 'ruffysound001.wav'
                      })
                    }
                  }
                } catch (e) {
                  const dateISO = todayISO()
                  const atISO = toAtISO(dateISO, hm)
                  if (atISO) {
                    sch.reschedule(
                      { id: routineId, title, hour: hm.hour, minute: hm.minute },
                      { mode: 'ONCE', at: atISO }
                    )
                  }
                }
              } else if (payload?.repeatType === 'daily') {
                const n = Number(payload?.repeatEveryDays || 0)
                sch.reschedule(
                  { id: routineId, title, hour: hm.hour, minute: hm.minute },
                  { mode: n > 1 ? 'DAILY_EVERY_N' : 'DAILY', n: n > 1 ? n : 1 }
                )
              } else if (payload?.repeatType === 'weekly') {
                const days = Array.isArray(payload?.repeatWeekDays) ? payload.repeatWeekDays.slice().sort((a,b)=>a-b) : []
                if (days.length) {
                  sch.reschedule(
                    { id: routineId, title, hour: hm.hour, minute: hm.minute },
                    { mode: 'WEEKLY', days }
                  )
                }
              } else if (payload?.repeatType === 'monthly') {
                const days = Array.isArray(payload?.repeatMonthDays) ? payload.repeatMonthDays.slice().sort((a,b)=>a-b) : []
                if (days.length) {
                  sch.reschedule(
                    { id: routineId, title, hour: hm.hour, minute: hm.minute },
                    { mode: 'MONTHLY', days }
                  )
                }
              } else {
                // 안전망: 매일
                sch.reschedule(
                  { id: routineId, title, hour: hm.hour, minute: hm.minute },
                  { mode: 'DAILY' }
                )
              }
            }
          }
        } catch (e) {
          console.warn('[routineForm] schedule error', e)
        }
        // ────────────────────────────────────────────────

        return res
      } catch (e) {
        return { ok:false, error: String(e && e.message ? e.message : e) }
      } finally {
        this.isSaving = false
      }
    }
  }
})
