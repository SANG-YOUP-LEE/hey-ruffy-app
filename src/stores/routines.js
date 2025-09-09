// src/stores/routines.js
import { defineStore } from 'pinia'
import {
  bindRoutines,
  setStatus as repoSetStatus,
  togglePause as repoTogglePause,
  deleteMany as repoDeleteMany,
} from '@/stores/routinesRepo'
import { purgeBases } from '@/utils/iosNotify' // ✅ 추가

/* ───────── helpers ───────── */
const nowTs = () => Date.now()

/** Firestore Timestamp | number | Date | undefined → ms(number) */
const toMs = (v) => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'object' && ('seconds' in v || 'nanoseconds' in v)) {
    try { return v.toMillis ? v.toMillis() : (v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6)) } catch { return 0 }
  }
  return 0
}

/** alarmTime은 문자열("HH:mm") 또는 객체({ampm,hour,minute}) 모두 허용 */
const normalizeAlarm = (a) => {
  if (!a) return null
  if (typeof a === 'string') {
    const m = a.match(/^(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const h24 = Math.max(0, Math.min(23, +m[1]))
    const minute = m[2]
    const ampm = h24 < 12 ? '오전' : '오후'
    const h12 = ((h24 + 11) % 12) + 1
    return { ampm, hour: String(h12).padStart(2, '0'), minute }
  }
  const ampm =
    a.ampm === '오전' || a.ampm === 'AM'
      ? '오전'
      : a.ampm === '오후' || a.ampm === 'PM'
      ? '오후'
      : ''
  const hour = String(a.hour ?? '').padStart(2, '0')
  const minute = String(a.minute ?? '').padStart(2, '0')
  if (!ampm || !/^\d{2}$/.test(hour) || !/^\d{2}$/.test(minute)) return null
  return { ampm, hour, minute }
}

/** 단일 루틴 정규화 (id는 원본 유지!!) */
function normalizeRoutine(r) {
  const id = String(r.id || '').trim() || ('rt-' + Math.random().toString(36).slice(2, 10))
  return {
    id, // Firestore 문서 id 그대로

    // 기본 정보
    title: r.title || '',
    comment: r.comment || '',
    colorIndex: Number(r.colorIndex ?? 0),
    cardSkin: r.cardSkin || '',

    // 산책 관련
    course: r.course || '',
    ruffy: r.ruffy || '',
    goalCount: Number(r.goalCount ?? 0),

    // 반복 규칙 (뷰/필터가 참조함)
    repeatType: r.repeatType || 'daily'
    ,
    repeatEveryDays: r.repeatEveryDays ?? null,      // ★ 누락 보완
    repeatDays: Array.isArray(r.repeatDays) ? r.repeatDays : [],
    repeatWeeks: r.repeatWeeks || '',
    repeatWeekDays: Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : [],
    repeatMonthDays: Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : [],
    rule: r.rule || null,                             // ★ 누락 보완
    start: r.start || null,                           // ★ 누락 보완 (문자열 YYYY-MM-DD 가능)
    end: r.end || null,                               // ★ 누락 보완

    // 기간
    startDate: r.startDate || null,
    endDate: r.endDate || null,

    // 알람
    alarmTime: normalizeAlarm(r.alarmTime),

    // 상태
    isPaused: !!r.isPaused,
    walkDoneCount: Number(r.walkDoneCount ?? 0),
    statuses: r.statuses || r.progress || {},

    // 시간 스탬프 정규화
    createdAt: toMs(r.createdAt) || nowTs(),
    updatedAt: toMs(r.updatedAt) || nowTs(),
    createdAtMs: toMs(r.createdAtMs) || toMs(r.createdAt) || nowTs(),
    updatedAtMs: toMs(r.updatedAtMs) || toMs(r.updatedAt) || nowTs(),
  }
}

/** 스냅샷 배열 → 정규화 + 동일 id 기준 중복 제거(최신 updatedAt 우선) */
function normalizeAndDedupe(list) {
  const map = new Map()
  for (const raw of list || []) {
    const n = normalizeRoutine(raw || {})
    const key = n.id
    const prev = map.get(key)
    if (!prev || toMs(n.updatedAt) > toMs(prev.updatedAt)) {
      map.set(key, n)
    }
  }
  return Array.from(map.values()).sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt))
}

/* ───────── store ───────── */
export const useRoutinesStore = defineStore('routines', {
  state: () => ({
    items: [],
    deleteMode: false,
    deleteTargets: [],
    selectedPeriod: 'T',
    selectedFilter: 'notdone',
    isLoading: true,
    hasFetched: false,
    _unsubscribe: null,
    _boundUid: null,
  }),

  actions: {
    addRoutine(r) {
      const n = normalizeRoutine(r || {})
      const i = this.items.findIndex((v) => v.id === n.id)
      if (i === -1) this.items.unshift(n)
      else this.items.splice(i, 1, { ...this.items[i], ...n, updatedAt: nowTs(), updatedAtMs: nowTs() })
    },

    updateRoutine(id, payload) {
      const rid = String(id || '')
      const i = this.items.findIndex((v) => v.id === rid)
      if (i < 0) return
      const next = normalizeRoutine({ ...this.items[i], ...payload, id: rid })
      next.updatedAt = nowTs()
      next.updatedAtMs = nowTs()
      this.items.splice(i, 1, next)
    },

    async deleteRoutines(ids) {
      const uid = this._boundUid
      const ridList = []
      for (const v of [].concat(ids || [])) if (v) ridList.push(String(v))

      // ✅ iOS 알람 먼저 전량 취소 (routine-<id> 규칙)
      if (ridList.length) {
        try {
          const baseIds = ridList.map(id => `routine-${id}`)
          purgeBases(baseIds)
        } catch (_) {}
      }

      // Firestore 삭제
      if (uid && ridList.length) {
        try { await repoDeleteMany(uid, ridList) } catch (_) {}
      }
      const set = new Set(ridList)
      this.items = this.items.filter((v) => !set.has(v.id))
      this.deleteTargets = []
      this.deleteMode = false
    },

    async togglePause({ id, isPaused }) {
      const uid = this._boundUid
      const rid = String(id || '')
      const i = this.items.findIndex((v) => v.id === rid)
      if (i < 0) return
      const it = { ...this.items[i], isPaused: !!isPaused, updatedAt: nowTs(), updatedAtMs: nowTs() }
      this.items.splice(i, 1, it)
      if (uid && rid) {
        try { await repoTogglePause(uid, rid, !!isPaused) } catch (_) {}
      }
    },

    async changeStatus({ id, status, date }) {
      const uid = this._boundUid
      const rid = String(id || '')
      if (!rid || !date) return

      const i = this.items.findIndex((v) => v.id === rid)
      if (i < 0) return

      const it = { ...this.items[i] }
      const prev = it.statuses?.[date]
      const nextStatuses = { ...(it.statuses || {}), [date]: status }

      let nextWalk = Number(it.walkDoneCount || 0)
      const hasWalk = !!(it.ruffy && it.course && it.goalCount)
      let delta = 0
      if (hasWalk) {
        if (prev !== 'done' && status === 'done') { nextWalk += 1; delta = 1 }
        else if (prev === 'done' && status !== 'done') { nextWalk = Math.max(0, nextWalk - 1); delta = -1 }
      }

      it.statuses = nextStatuses
      it.walkDoneCount = nextWalk
      it.updatedAt = nowTs()
      it.updatedAtMs = nowTs()
      this.items.splice(i, 1, it)

      if (uid) {
        try { await repoSetStatus(uid, rid, date, status, delta) } catch (_) {}
      }
    },

    setDeleteMode(on) {
      this.deleteMode = !!on
      if (!on) this.deleteTargets = []
    },

    toggleSelect({ id, checked }) {
      const rid = String(id || '')
      const has = this.deleteTargets.includes(rid)
      if (checked && !has) this.deleteTargets = [...this.deleteTargets, rid]
      if (!checked && has) this.deleteTargets = this.deleteTargets.filter((v) => v !== rid)
    },

    setPeriod(mode) {
      this.selectedPeriod = mode
      this.setDeleteMode(false)
    },

    setFilter(filter) {
      this.selectedFilter = filter
    },

    resetFilter() {
      this.selectedFilter = 'notdone'
    },

    bind(uid) {
      if (!uid) return
      if (this._boundUid === uid && this._unsubscribe) return
      if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null }

      this.isLoading = true
      this.hasFetched = false
      this._boundUid = uid

      this._unsubscribe = bindRoutines(
        uid,
        (list) => {
          this.items = normalizeAndDedupe(list)
          this.isLoading = false
          this.hasFetched = true
        },
        () => {
          this.items = []
          this.isLoading = false
          this.hasFetched = true
        }
      )
    },

    release() {
      if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null }
      this._boundUid = null
    },
  },
})
