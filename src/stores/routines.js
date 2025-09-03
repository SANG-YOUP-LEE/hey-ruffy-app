// src/stores/routines.js
import { defineStore } from 'pinia'
import { bindRoutines, setStatus as repoSetStatus, togglePause as repoTogglePause, deleteMany as repoDeleteMany } from '@/stores/routinesRepo'

function nowTs() { return Date.now() }
function ensureId() { return 'rt-' + Math.random().toString(36).slice(2, 10) }
function baseId(id) { return String(id).split('-')[0] }
function tsToMs(v) {
  if (v == null) return 0
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v
  if (typeof v === 'object' && typeof v.seconds === 'number') return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6)
  return 0
}
function sortByRecent(a, b) {
  const bu = b.updatedAtMs || tsToMs(b.updatedAt) || 0
  const au = a.updatedAtMs || tsToMs(a.updatedAt) || 0
  if (bu !== au) return bu - au
  const bc = b.createdAtMs || tsToMs(b.createdAt) || 0
  const ac = a.createdAtMs || tsToMs(a.createdAt) || 0
  if (bc !== ac) return bc - ac
  return String(b.id).localeCompare(String(a.id))
}
function dedupeByBaseId(list=[]) {
  const map = new Map()
  for (const r of list) {
    const key = baseId(r.id || ensureId())
    const prev = map.get(key)
    const cur = normalizeRoutine({ ...r, id: key })
    if (!prev) { map.set(key, cur); continue }
    map.set(key, sortByRecent(cur, prev) < 0 ? prev : cur)
  }
  return Array.from(map.values())
}

function normalizeRoutine(r) {
  const id = r.id || ensureId()
  const createdAtMs = Number(r.createdAtMs ?? tsToMs(r.createdAt)) || 0
  const updatedAtMs = Number(r.updatedAtMs ?? tsToMs(r.updatedAt) ?? createdAtMs) || 0
  const repeatEveryDays = Number.isFinite(+r.repeatEveryDays) ? +r.repeatEveryDays : (r.repeatType==='daily' ? null : null)
  return {
    id,
    title: r.title || '',
    comment: r.comment || '',
    colorIndex: Number(r.colorIndex ?? 0),
    cardSkin: r.cardSkin || '',
    course: r.course || '',
    ruffy: r.ruffy || '',
    goalCount: Number(r.goalCount ?? 0),
    repeatType: r.repeatType || 'daily',
    repeatDays: Array.isArray(r.repeatDays) ? r.repeatDays : [],
    repeatWeeks: r.repeatWeeks || '',
    repeatWeekDays: Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : [],
    repeatMonthDays: Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : [],
    repeatEveryDays,
    startDate: r.startDate || null,
    endDate: r.endDate || null,
    alarmTime: r.alarmTime || null,
    isPaused: !!r.isPaused,
    walkDoneCount: Number(r.walkDoneCount ?? 0),
    statuses: r.statuses || r.progress || {},
    createdAt: r.createdAt || null,
    updatedAt: r.updatedAt || null,
    createdAtMs,
    updatedAtMs
  }
}

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
    _boundUid: null
  }),

  actions: {
    addRoutine(r) {
      const n = normalizeRoutine(r || {})
      const key = baseId(n.id)
      const i = this.items.findIndex(v => baseId(v.id) === key)
      if (i === -1) {
        this.items = [n, ...this.items].sort(sortByRecent)
      } else {
        const merged = sortByRecent(n, this.items[i]) < 0 ? this.items[i] : { ...this.items[i], ...n }
        this.items.splice(i, 1, merged)
        this.items.sort(sortByRecent)
      }
    },

    updateRoutine(id, payload) {
      const key = baseId(id)
      const i = this.items.findIndex(v => baseId(v.id) === key)
      if (i < 0) return
      const next = normalizeRoutine({ ...this.items[i], ...payload, id: key, updatedAtMs: nowTs() })
      this.items.splice(i, 1, next)
      this.items.sort(sortByRecent)
    },

    async deleteRoutines(ids) {
      const uid = this._boundUid
      const ridList = [].concat(ids || []).map(baseId)
      if (uid && ridList.length) {
        try { await repoDeleteMany(uid, ridList) } catch(e) {}
      }
      const set = new Set(ridList)
      this.items = this.items.filter(v => !set.has(baseId(v.id)))
      this.deleteTargets = []
      this.deleteMode = false
    },

    async togglePause({ id, isPaused }) {
      const uid = this._boundUid
      const rid = baseId(id)
      const i = this.items.findIndex(v => baseId(v.id) === rid)
      if (i < 0) return
      const it = { ...this.items[i], isPaused: !!isPaused, updatedAtMs: nowTs() }
      this.items.splice(i, 1, it)
      this.items.sort(sortByRecent)
      if (uid && rid) {
        try { await repoTogglePause(uid, rid, !!isPaused) } catch(e) {}
      }
    },

    async changeStatus({ id, status, date }) {
      const uid = this._boundUid
      const rid = baseId(id)
      const i = this.items.findIndex(v => baseId(v.id) === rid)
      if (i < 0 || !date) return
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
      it.updatedAtMs = nowTs()
      this.items.splice(i, 1, it)
      this.items.sort(sortByRecent)
      if (uid && rid) {
        try { await repoSetStatus(uid, rid, date, status, delta) } catch(e) {}
      }
    },

    setDeleteMode(on) {
      this.deleteMode = !!on
      if (!on) this.deleteTargets = []
    },

    toggleSelect({ id, checked }) {
      const rid = baseId(id)
      const has = this.deleteTargets.includes(rid)
      if (checked && !has) this.deleteTargets = [...this.deleteTargets, rid]
      if (!checked && has) this.deleteTargets = this.deleteTargets.filter(v => v !== rid)
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
          try {
            const safe = Array.isArray(list) ? list : []
            const deduped = dedupeByBaseId(safe).sort(sortByRecent)
            this.items = deduped
          } catch {
            this.items = []
          } finally {
            this.isLoading = false
            this.hasFetched = true
          }
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
    }
  }
})
