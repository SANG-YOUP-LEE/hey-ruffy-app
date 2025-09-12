// src/stores/routineForm.js
const MAX_MONTHLY_DATES = 3
import { defineStore } from 'pinia'
import { db } from '@/firebase'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import iosBridge from '@/utils/iosNotify'
import { projectInstances } from '@/utils/projection'

const { scheduleWeekly, scheduleOnIOS, cancelOnIOS, waitBridgeReady } = iosBridge
let __pendingCreateId = null

const KOR_TO_ICS = { 월:'MO', 화:'TU', 수:'WE', 목:'TH', 금:'FR', 토:'SA', 일:'SU' }
const KOR_TO_NUM = { 월:1, 화:2, 수:3, 목:4, 금:5, 토:6, 일:7 }
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

const parseHM = (t) => {
  if (!t) return null
  if (typeof t === 'string') {
    const s = t.trim()
    let m = s.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      const h = Math.max(0, Math.min(23, +m[1]))
      const mm = Math.max(0, Math.min(59, +m[2]))
      return { hour: h, minute: mm }
    }
    m = s.match(/^(?:\s*(AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const ampm = (m[1] || m[4] || '').toUpperCase()
      if (ampm === 'PM' && h < 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
    m = s.match(/^(?:\s*(오전|오후)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후))?$/)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const ampmKr = (m[1] || m[4] || '')
      if (ampmKr === '오후' && h < 12) h += 12
      if (ampmKr === '오전' && h === 12) h = 0
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }
  } else if (typeof t === 'object') {
    let h = +t.hour; const mm = +t.minute
    const ampm = String(t.ampm || '').toUpperCase()
    if (ampm === 'PM' || t.ampm === '오후') { if (h < 12) h += 12 }
    if (ampm === 'AM' || t.ampm === '오전') { if (h === 12) h = 0 }
    if (Number.isFinite(h) && Number.isFinite(mm)) return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
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

export const useRoutineFormStore = defineStore('routineForm', {
  state: () => ({
    mode: 'create',
    routineId: null,
    title: '',
    repeatType: 'daily',
    repeatDaily: null,
    repeatWeeks: '',
    repeatWeekDays: [],
    weeklyDaily: false,
    repeatMonthDays: [],
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
      if (state.repeatType === 'daily') {
        if (!Number.isInteger(state.repeatDaily)) return null
        const n = state.repeatDaily
        if (n === 0) return { freq: 'once', anchor: anchorISO }
        const interval = Math.min(6, Math.max(1, n))
        return { freq: 'daily', interval, anchor: anchorISO }
      }
      if (state.repeatType === 'weekly') {
        const interval = parseInterval(state.repeatWeeks)
        const weekDaysKor = state.weeklyDaily ? ['월','화','수','목','금','토','일'] : state.repeatWeekDays
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
      const normalizedType = state.repeatType
      const dailyInterval =
        normalizedType === 'daily'
          ? (Number.isInteger(state.repeatDaily) ? state.repeatDaily : null)
          : null
      const endForTodayOnly =
        normalizedType === 'daily' && dailyInterval === 0 ? anchorISO : null
      // 주간일 때 요일 배열: 사용자가 고른 요일이 하나라도 있으면 그것을 우선.
      // 비어있을 때만 weeklyDaily 토글(매일)을 적용.
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
   
    setRepeatWeekDays(daysKor) {
    const a = Array.isArray(daysKor) ? daysKor : []
    this.repeatWeekDays = a
    // 사용자가 일부 요일만 고르면 "매일" 토글은 자동 해제
    this.weeklyDaily = isAllKoreanWeekdays(a)
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

      // ✅ “오늘만(once)”일 때 과거시간 방지
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
          const hm = parseHM(this.alarmTime || payload.alarmTime)
          const routineId = res?.id
          const title = this.title || payload.title || '알림'
          const baseId = routineId ? `routine-${routineId}` : null

          if (!routineId || !hm) return res

          await waitBridgeReady()
          // 먼저 이전 것 전체 purge
          await cancelOnIOS(baseId)

          const type = payload.repeatType
          const tz = this.tz || 'Asia/Seoul'
          const hour = hm.hour
          const minute = hm.minute

          // ── DAILY 모드 처리
          if (type === 'daily') {
            const n = Number(payload.repeatEveryDays || 0)

            // 오늘만(once)
            if (n === 0) {
              const dateISO = safeISOFromDateObj(payload.startDate) || payload.start || todayISO()
              const atISO = toAtISO(dateISO, hm)
              const atMs = atISOToEpochMs(atISO)
              if (atMs && atMs > Date.now()) {
                await scheduleOnIOS({
                  routineId,
                  title,
                  repeatMode: 'once',
                  fireTimesEpoch: [Math.floor(atMs / 1000)],
                  sound: 'ruffysound001.wav'
                })
              }
              return res
            }

            // 매일(=1)은 없음 → 주간 월~일 7개로 대체 (종료일 없을 때만 네이티브)
            if (n === 1) {
              const endISO = safeISOFromDateObj(payload.endDate) || payload.end || undefined
              if (!endISO) {
                await scheduleWeekly(baseId, hour, minute, [1,2,3,4,5,6,7], title)
                return res
              }
              // 종료일 있으면 projection으로 14일치
              const projDef = {
                repeatMode: 'weekly',
                mode: 'weekly',
                hour, minute,
                intervalWeeks: 1,
                weekdays: [1,2,3,4,5,6,7],
                startDate: safeISOFromDateObj(payload.startDate) || payload.start || todayISO(),
                endDate: endISO,
                alarm: { hour, minute }
              }
              const epochsMs = projectInstances(projDef, Date.now(), tz)
              if (Array.isArray(epochsMs) && epochsMs.length) {
                const fireTimesEpoch = epochsMs.map(ms => Math.floor(ms / 1000))
                await scheduleOnIOS({ routineId, title, repeatMode: 'once', fireTimesEpoch, sound: 'ruffysound001.wav' })
              }
              return res
            }

            // N일마다(≥2) → projection 14일치
            if (n >= 2) {
              const projDef = {
                repeatMode: 'daily',
                mode: 'daily',
                hour, minute,
                intervalDays: n,
                startDate: safeISOFromDateObj(payload.startDate) || payload.start || todayISO(),
                endDate: safeISOFromDateObj(payload.endDate) || payload.end || undefined,
                alarm: { hour, minute }
              }
              const epochsMs = projectInstances(projDef, Date.now(), tz)
              if (Array.isArray(epochsMs) && epochsMs.length) {
                const fireTimesEpoch = epochsMs.map(ms => Math.floor(ms / 1000))
                await scheduleOnIOS({ routineId, title, repeatMode: 'once', fireTimesEpoch, sound: 'ruffysound001.wav' })
              }
              return res
            }
          }

          // ── WEEKLY
          if (type === 'weekly') {
            const m = String(payload.repeatWeeks || '').match(/(\d+)/)
            const intervalW = m ? Math.max(1, parseInt(m[1], 10)) : 1
            const days = Array.isArray(payload.repeatWeekDays) ? payload.repeatWeekDays.slice() : []

            // interval=1 & 종료일 없음 → 네이티브 요일 반복
            const endISO = safeISOFromDateObj(payload.endDate) || payload.end || undefined
            if (intervalW === 1 && !endISO && days.length) {
              await scheduleWeekly(baseId, hour, minute, days, title)
              return res
            }

            // 그 외는 projection 14일치
            const projDef = {
              repeatMode: 'weekly',
              mode: 'weekly',
              hour, minute,
              intervalWeeks: intervalW,
              weekdays: days,
              startDate: safeISOFromDateObj(payload.startDate) || payload.start || todayISO(),
              endDate: endISO,
              alarm: { hour, minute }
            }
            const epochsMs = projectInstances(projDef, Date.now(), tz)
            if (Array.isArray(epochsMs) && epochsMs.length) {
              const fireTimesEpoch = epochsMs.map(ms => Math.floor(ms / 1000))
              await scheduleOnIOS({ routineId, title, repeatMode: 'once', fireTimesEpoch, sound: 'ruffysound001.wav' })
            }
            return res
          }

          // ── MONTHLY → projection 14일치
          if (type === 'monthly') {
            const projDef = {
              repeatMode: 'monthly',
              mode: 'monthly',
              hour, minute,
              byMonthDay: Array.isArray(payload.repeatMonthDays) ? payload.repeatMonthDays : [],
              startDate: safeISOFromDateObj(payload.startDate) || payload.start || todayISO(),
              endDate: safeISOFromDateObj(payload.endDate) || payload.end || undefined,
              alarm: { hour, minute }
            }
            const epochsMs = projectInstances(projDef, Date.now(), tz)
            if (Array.isArray(epochsMs) && epochsMs.length) {
              const fireTimesEpoch = epochsMs.map(ms => Math.floor(ms / 1000))
              await scheduleOnIOS({ routineId, title, repeatMode: 'once', fireTimesEpoch, sound: 'ruffysound001.wav' })
            }
            return res
          }

        } catch (e) {
          console.warn('[routineForm] schedule error', e)
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
