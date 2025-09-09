const MAX_MONTHLY_DATES = 3
import { defineStore } from 'pinia'
import { db } from '@/firebase'
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { useSchedulerStore } from '@/stores/scheduler'

// ✅ iOS 네이티브 알림 브리지
import { scheduleOnIOS, cancelOnIOS } from '@/utils/iosNotify'

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

// ── 시간 파서/도우미 ─────────────────────────────────────
// ⬇️ 수정: 한글 '오전/오후'도 지원
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

    // 영어 AM/PM 12시간제: "AM 9:05" / "9:05 PM"
    m = s.match(/^(?:\s*(AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i)
    if (m && (m[1] || m[4])) {
      let h = +m[2], mm = +m[3]
      const ampm = (m[1] || m[4] || '').toUpperCase()
      if (ampm === 'PM' && h < 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0
      return { hour: Math.max(0, Math.min(23, h)), minute: Math.max(0, Math.min(59, mm)) }
    }

    // 한글 오전/오후 12시간제: "오전 9:05" / "9:05 오후"
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
  // ✅ hm 유효성 체크 추가
  if (!Number.isFinite(hm.hour) || !Number.isFinite(hm.minute)) return null
  // 고정 +09:00 (Asia/Seoul). 필요하면 tz 적용 로직 확장.
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

      // 주간인데 interval=1이고 7일 전부면 -> daily로 축약
      if (state.repeatType === 'weekly') {
        const intervalW = parseInterval(state.repeatWeeks)
        if (intervalW === 1 && (state.weeklyDaily || isAllKoreanWeekdays(state.repeatWeekDays))) {
          return { freq: 'daily', interval: 1, anchor: anchorISO }
        }
      }

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

      const weeklyIsDaily =
        state.repeatType === 'weekly' &&
        (parseInterval(state.repeatWeeks) === 1) &&
        (state.weeklyDaily || isAllKoreanWeekdays(state.repeatWeekDays))

      const normalizedType = weeklyIsDaily ? 'daily' : state.repeatType
      const dailyInterval =
        normalizedType === 'daily'
          ? (weeklyIsDaily ? 1 : (Number.isInteger(state.repeatDaily) ? state.repeatDaily : null))
          : null

      const endForTodayOnly =
        normalizedType === 'daily' && dailyInterval === 0 ? anchorISO : null

      const weeklyDaysNum =
        normalizedType === 'weekly'
          ? (state.weeklyDaily ? [1,2,3,4,5,6,7] : daysKorToNum(state.repeatWeekDays))
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
      if (!this.title || String(this.title).trim() === '') { this.setError('title','다짐 제목을 입력해주세요.'); return false }
      if (!this.repeatType) { this.setError('repeat','반복 주기를 선택해주세요.'); return false }

      if (this.repeatType === 'daily') {
        if (!Number.isInteger(this.repeatDaily) || this.repeatDaily < 0 || this.repeatDaily > 6) {
          this.setError('repeat','반복 주기를 선택해주세요.')
          return false
        }
      }

      if (this.repeatType === 'weekly') {
        const valid = this.weeklyDaily || (Array.isArray(this.repeatWeekDays) && this.repeatWeekDays.length > 0)
        if (!valid) { this.setError('repeat','요일을 선택하거나 “매일”을 선택해 주세요.'); return false }
      }

      if (this.repeatType === 'monthly') {
        if (!this.repeatMonthDays || this.repeatMonthDays.length === 0) {
          this.setError('repeat','반복 주기를 선택해주세요.'); return false
        }
        if (Array.isArray(this.repeatMonthDays) && this.repeatMonthDays.length > MAX_MONTHLY_DATES) {
          this.setError('repeat', `월간 날짜는 최대 ${MAX_MONTHLY_DATES}개까지 선택할 수 있어요.`); return false
        }
      }

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
      if (this.isSaving) return { ok:false }
      this.isSaving = true
      try {
        if (!this.validate()) return { ok:false }

        const auth = useAuthStore()
        await auth.ensureReady()
        const uid = auth.user?.uid
        if (!uid) return { ok:false, error:'로그인이 필요합니다.' }

        // ⬇️ 알람시간 포맷: UI 호환(객체) + iOS용(HH:mm) 동시 저장
        const basePayload = this.payload
        const hmParsed = parseHM(this.alarmTime || basePayload.alarmTime)

        let alarmTimeObj = null   // UI가 기대하는 형태
        let alarmHM = null        // iOS 스케줄링용 "HH:mm"
        if (hmParsed) {
          const h24 = hmParsed.hour
          const m = hmParsed.minute
          const ampmKor = h24 < 12 ? '오전' : '오후'
          const h12 = ((h24 % 12) || 12)      // 0,12 -> 12 처리
          alarmTimeObj = { ampm: ampmKor, hour: String(h12), minute: p(m) }
          alarmHM = `${p(h24)}:${p(m)}`
        }

        // 🔁 payload에 반영: alarmTime(객체), alarmHM(문자열) 둘 다 저장
        const payload = { ...basePayload, alarmTime: alarmTimeObj, alarmHM }

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

        // ── 앱 내부 스케줄러(기존) 유지 ─────────────────────
        try {
          const sch = useSchedulerStore()
          // iOS용 문자열이 있으면 우선, 없으면 객체도 파싱됨
          const hm = parseHM(alarmHM || this.alarmTime || payload.alarmTime)
          const routineId = res?.id
          const title = this.title || payload.title || '알림'

          if (routineId && hm) {
            if (this.icsRule?.freq === 'once') {
              const dateISO = payload?.start || safeISOFromDateObj(this.startDate) || todayISO()
              const atISO = toAtISO(dateISO, hm)
              if (atISO) {
                sch.reschedule(
                  { id: routineId, title, hour: hm.hour, minute: hm.minute },
                  { mode: 'ONCE', at: atISO }
                )
              }
            } else if (payload?.repeatType === 'daily') {
              const n = Number(payload?.repeatEveryDays || 0)
              sch.reschedule(
                { id: routineId, title, hour: hm.hour, minute: hm.minute },
                { mode: 'DAILY_EVERY_N', n: n > 0 ? n : 1 }
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
                // 내부 스케줄러가 MONTHLY 미지원일 수 있으니 호출은 유지하되, 네이티브가 실제 알림 담당
                sch.reschedule(
                  { id: routineId, title, hour: hm.hour, minute: hm.minute },
                  { mode: 'MONTHLY', days }
                )
              }
            }
          }
        } catch (e) {
          console.warn('[routineForm] schedule error', e)
        }

        // ── iOS 네이티브 로컬 알림 ───────────────────────
        try {
          // iOS용 문자열이 있으면 우선 사용 (없어도 객체 파싱됨)
          const hm = parseHM(alarmHM || this.alarmTime || payload.alarmTime)
          const routineId = res?.id
          const title = this.title || payload.title || '알람'
          const baseId = routineId ? `routine-${routineId}` : null

          if (routineId && hm) {
            // 편집 시 기존 알림 제거 (중복 방지)
            if (this.mode === 'edit' && baseId) {
              await cancelOnIOS(baseId) // baseId가 routine-로 시작 → purgeBase 동작
            }

            if (this.icsRule?.freq === 'once') {
              // 정확 날짜·시간 1회 알림: epoch(초) + 과거 방지
              const dateISO = payload?.start || safeISOFromDateObj(this.startDate) || todayISO()
              const atISO = toAtISO(dateISO, hm)
              const ms = atISOToEpochMs(atISO)
              const now = Date.now()

              if (ms && ms > now) {
                const sec = Math.floor(ms / 1000)
                await scheduleOnIOS({
                  id: baseId,
                  title,
                  repeatMode: 'once',
                  fireTimesEpoch: [sec],
                  sound: 'ruffysound001.wav'
                })
              } else {
                console.warn('[routineForm] once schedule skipped (past time)', { atISO })
              }
            } else if (payload?.repeatType === 'daily') {
              await scheduleOnIOS({
                id: baseId,
                title,
                repeatMode: 'daily',
                hour: hm.hour,
                minute: hm.minute,
                sound: 'ruffysound001.wav'
              })
            } else if (payload?.repeatType === 'weekly') {
              const days = Array.isArray(payload?.repeatWeekDays) ? payload.repeatWeekDays : []
              await scheduleOnIOS({
                id: baseId,
                title,
                repeatMode: 'weekly',
                weekdays: days,            // [1..7] (일=1 … 토=7)
                hour: hm.hour,
                minute: hm.minute,
                sound: 'ruffysound001.wav'
              })
            } else if (payload?.repeatType === 'monthly') {
              const days = Array.isArray(payload?.repeatMonthDays) ? payload.repeatMonthDays : []
              await scheduleOnIOS({
                id: baseId,
                title,
                repeatMode: 'monthly',
                monthDays: days,           // [1..31]
                hour: hm.hour,
                minute: hm.minute,
                sound: 'ruffysound001.wav'
              })
            } else {
              // 안전망: 매일
              await scheduleOnIOS({
                id: baseId,
                title,
                repeatMode: 'daily',
                hour: hm.hour,
                minute: hm.minute,
                sound: 'ruffysound001.wav'
              })
            }
          }
        } catch (e) {
          console.warn('[routineForm] iOS scheduleOnIOS error', e)
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
