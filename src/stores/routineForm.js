// src/stores/routineForm.js
import { defineStore } from 'pinia'
import { db } from '@/firebase'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const KOR_TO_ICS = { 월:'MO', 화:'TU', 수:'WE', 목:'TH', 금:'FR', 토:'SA', 일:'SU' }
const p = n => String(n).padStart(2,'0')
const toISO = d => (d ? `${d.year}-${p(d.month)}-${p(d.day)}` : null)
const weeklyDaysToICS = arr => (arr||[]).map(k=>KOR_TO_ICS[String(k).replace(/['"]/g,'')]).filter(Boolean)
const parseInterval = s => { const m=String(s||'').match(/(\d+)/); return m?+m[1]:1 }
const safeISOFromDateObj = obj => { const s = toISO(obj); return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s !== '0000-00-00' && s !== '0-00-00') ? s : null }
const getBaseId = (id) => String(id || '').split('-')[0]
const normalizeCardSkinStrict = (v) => {
  const m = String(v || '').match(/(\d{1,2})/)
  const n = m && m[1] ? m[1].padStart(2,'0') : '01'
  return `option${n}`
}
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
const deepClean = (v) => {
  if (Array.isArray(v)) return v.filter(x => x !== undefined).map(deepClean)
  if (v && typeof v === 'object') { const r = {}; Object.entries(v).forEach(([k,val]) => { if (val !== undefined) r[k] = deepClean(val) }); return r }
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

export const useRoutineFormStore = defineStore('routineForm', {
  state: () => ({
    mode: 'create',
    routineId: null,
    title: '',
    repeatType: 'daily',
    // ✅ 일간: 숫자 interval(1~6)로 전환
    repeatDaily: 1,
    repeatWeeks: '',
    repeatWeekDays: [],
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
    tz: 'Asia/Seoul'
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
      // ✅ 일간 interval은 repeatDaily(숫자) 사용, 주간은 기존 weeks 파싱
      const interval =
        state.repeatType === 'daily'
          ? (Number.isInteger(state.repeatDaily) && state.repeatDaily > 0 ? state.repeatDaily : 1)
          : parseInterval(state.repeatWeeks)

      const base = { freq: state.repeatType, interval, anchor: anchorISO }
      if (state.repeatType === 'weekly') return { ...base, byWeekday: weeklyDaysToICS(state.repeatWeekDays) }
      if (state.repeatType === 'monthly') return { ...base, byMonthDay: (state.repeatMonthDays||[]).map(Number) }
      return base
    },
    payload(state) {
      const hasStart = !!safeISOFromDateObj(state.startDate)
      const hasEnd = !!safeISOFromDateObj(state.endDate)
      const anchorISO = hasStart ? safeISOFromDateObj(state.startDate) : todayISO()
      const cleaned = {
        title: state.title,
        repeatType: state.repeatType,
        // ✅ 일간: 더 이상 요일 배열을 저장하지 않음. interval을 별도 필드로 저장.
        repeatDays: [], // (이전 필드 호환: 빈 배열로 유지)
        repeatEveryDays: state.repeatType === 'daily'
          ? (Number.isInteger(state.repeatDaily) ? state.repeatDaily : 1)
          : null,
        repeatWeeks: state.repeatType === 'weekly' ? state.repeatWeeks || '' : '',
        repeatWeekDays: state.repeatType === 'weekly' ? [...(state.repeatWeekDays||[])] : [],
        repeatMonthDays: state.repeatType === 'monthly' ? [...(state.repeatMonthDays||[])] : [],
        startDate: hasStart ? state.startDate : null,
        endDate: hasEnd ? state.endDate : null,
        alarmTime: state.alarmTime,
        ruffy: state.isWalkModeOff ? null : state.ruffy,
        course: state.isWalkModeOff ? null : state.course,
        goalCount: state.isWalkModeOff ? null : state.goalCount,
        colorIndex: state.colorIndex,
        cardSkin: normalizeCardSkinStrict(state.cardSkin),
        comment: sanitizeComment(state.comment),
        hasWalk: this.hasWalk,
        tz: state.tz,
        rule: this.icsRule,        // ✅ 위에서 interval 반영된 규칙
        start: anchorISO,
        ...(hasEnd ? { end: safeISOFromDateObj(state.endDate) } : {})
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
      // ✅ 일간 interval 기본값
      this.repeatDaily = 1
      this.repeatWeeks = ''
      this.repeatWeekDays = []
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
      // ✅ 기존 데이터 호환: repeatEveryDays가 있으면 사용, 없으면 1
      this.repeatDaily = Number.isFinite(+routine.repeatEveryDays) && +routine.repeatEveryDays > 0
        ? +routine.repeatEveryDays
        : 1
      this.repeatWeeks = routine.repeatWeeks || ''
      this.repeatWeekDays = routine.repeatWeekDays || []
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
      if (!this.title || String(this.title).trim() === '') { this.setError('title','다짐 제목을 입력해주세요.'); return false }
      if (!this.repeatType) { this.setError('repeat','반복 주기를 선택해주세요.'); return false }
      // ✅ 일간 검증: 숫자 interval(1~6)
      if (this.repeatType === 'daily') {
        if (!Number.isInteger(this.repeatDaily) || this.repeatDaily < 1 || this.repeatDaily > 6) {
          this.setError('repeat','반복 주기를 선택해주세요.')
          return false
        }
      }
      if (this.repeatType === 'weekly' && (!this.repeatWeeks || !this.repeatWeekDays || this.repeatWeekDays.length === 0)) { this.setError('repeat','반복 주기를 선택해주세요.'); return false }
      if (this.repeatType === 'monthly' && (!this.repeatMonthDays || this.repeatMonthDays.length === 0)) { this.setError('repeat','반복 주기를 선택해주세요.'); return false }
      if (!Number.isInteger(this.colorIndex)) { this.setError('priority','다짐 색상을 선택해주세요.'); return false }
      const sc = sanitizeComment(this.comment)
      if (this.comment && this.comment.trim().length > 200) { this.setError('comment','코멘트는 200자 이내로 입력해주세요.'); return false }
      if (!this.isWalkModeOff) {
        if (!this.ruffy) { this.setError('ruffy','러피를 선택해주세요.'); return false }
        if (!this.course || String(this.course).trim() === '') { this.setError('course','코스를 선택해주세요.'); return false }
        if (!Number.isInteger(this.goalCount) || this.goalCount <= 0) { this.setError('goal','목표 횟수를 선택해주세요.'); return false }
      }
      if (sc === null) this.comment = ''
      return true
    },
    async save() {
      if (!this.validate()) return { ok:false }
      try {
        const auth = getAuth()
        const user = auth.currentUser
        if (!user) return { ok:false, error:'로그인이 필요합니다.' }
        const payload = this.payload
        if (this.mode === 'edit' && this.routineId) {
          const rid = getBaseId(this.routineId)
          await setDoc(
            doc(db, 'users', user.uid, 'routines', rid),
            { ...payload, updatedAt: serverTimestamp() },
            { merge: true }
          )
          return { ok:true, id: rid, data: payload }
        } else {
          const colRef = collection(db, 'users', user.uid, 'routines')
          const docRef = await addDoc(colRef, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
          return { ok:true, id: docRef.id, data: payload }
        }
      } catch (e) {
        return { ok:false, error: String(e && e.message ? e.message : e) }
      }
    }
  }
})
