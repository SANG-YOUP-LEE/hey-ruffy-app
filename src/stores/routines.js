import { defineStore } from 'pinia'

function nowTs() {
  return Date.now()
}

function ensureId() {
  return 'rt-' + Math.random().toString(36).slice(2, 10)
}

function normalizeRoutine(r) {
  const id = r.id || ensureId()
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
    startDate: r.startDate || null,
    endDate: r.endDate || null,
    alarmTime: r.alarmTime || null,
    isPaused: !!r.isPaused,
    walkDoneCount: Number(r.walkDoneCount ?? 0),
    statuses: r.statuses || r.progress || {},
    createdAt: r.createdAt || nowTs(),
    updatedAt: r.updatedAt || nowTs()
  }
}

export const useRoutinesStore = defineStore('routines', {
  state: () => ({
    items: [],
    deleteMode: false,
    deleteTargets: [],
    selectedPeriod: 'T',
    selectedFilter: 'notdone'
  }),

  actions: {
    addRoutine(r) {
      const n = normalizeRoutine(r || {})
      const i = this.items.findIndex(v => v.id === n.id)
      if (i === -1) this.items.unshift(n)
      else this.items.splice(i, 1, { ...this.items[i], ...n, updatedAt: nowTs() })
    },

    updateRoutine(id, payload) {
      const i = this.items.findIndex(v => v.id === id)
      if (i < 0) return
      const next = normalizeRoutine({ ...this.items[i], ...payload, id })
      next.updatedAt = nowTs()
      this.items.splice(i, 1, next)
    },

    deleteRoutines(ids) {
      const set = new Set([].concat(ids || []))
      this.items = this.items.filter(v => !set.has(v.id) && !set.has(String(v.id).split('-')[0]))
      this.deleteTargets = []
      this.deleteMode = false
    },

    togglePause({ id, isPaused }) {
      const i = this.items.findIndex(v => v.id === id)
      if (i < 0) return
      const it = { ...this.items[i], isPaused: !!isPaused, updatedAt: nowTs() }
      this.items.splice(i, 1, it)
    },

    changeStatus({ id, status, date }) {
      const i = this.items.findIndex(v => v.id === id)
      if (i < 0 || !date) return
      const it = { ...this.items[i] }
      const prev = it.statuses?.[date]
      const nextStatuses = { ...(it.statuses || {}), [date]: status }
      let nextWalk = Number(it.walkDoneCount || 0)
      const hasWalk = !!(it.ruffy && it.course && it.goalCount)
      if (hasWalk) {
        if (prev !== 'done' && status === 'done') nextWalk += 1
        else if (prev === 'done' && status !== 'done') nextWalk = Math.max(0, nextWalk - 1)
      }
      it.statuses = nextStatuses
      it.walkDoneCount = nextWalk
      it.updatedAt = nowTs()
      this.items.splice(i, 1, it)
    },

    setDeleteMode(on) {
      this.deleteMode = !!on
      if (!on) this.deleteTargets = []
    },

    toggleSelect({ id, checked }) {
      const baseId = String(id).split('-')[0]
      const has = this.deleteTargets.includes(baseId)
      if (checked && !has) this.deleteTargets = [...this.deleteTargets, baseId]
      if (!checked && has) this.deleteTargets = this.deleteTargets.filter(v => v !== baseId)
    },

    setPeriod(mode) {
      this.selectedPeriod = mode
      this.setDeleteMode(false)
    },

    setFilter(filter) {
      this.selectedFilter = filter
    }
  }
})