// src/stores/scheduler.js
import { defineStore } from 'pinia'
import { waitBridgeReady, scheduleOnIOS, cancelOnIOS } from '@/utils/iosNotify'

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const baseOf = (routineId) => `routine-${String(routineId ?? '').trim()}`

// 12시간제 → 24시간제 변환
function resolveAlarmHM(r) {
  const a = r?.alarmTime
  if (a && a.hour != null && a.minute != null) {
    let h = parseInt(a.hour, 10) % 12
    const m = parseInt(a.minute, 10)
    const ampm = String(a.ampm || '').toUpperCase()
    if (ampm === '오후' || ampm === 'PM') h += 12
    if ((ampm === '오전' || ampm === 'AM') && a.hour == 12) h = 0
    if ((ampm === '오후' || ampm === 'PM') && a.hour == 12) h = 12
    return { hour: h, minute: m }
  }
  return { hour: Number(r?.hour ?? r?.alarm?.hour), minute: Number(r?.minute ?? r?.alarm?.minute) }
}

// 마지막 등록 상태 기억
const lastIdsByBase = new Map()

// 루틴 → 필요한 알람 id와 페이로드 계산
function computeDesired(r) {
  const baseId = baseOf(r.id)
  const { hour, minute } = resolveAlarmHM(r)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { baseId, items: [] }

  const title = r.title || ''
  const mode = String(r.repeatType || 'daily').toLowerCase()
  const items = []

  if (mode.startsWith('daily')) {
    items.push({
      id: `${baseId}-daily`,
      rid: r.id,
      repeatMode: 'daily',
      hour, minute, title,
    })
  } else if (mode.startsWith('week')) {
    const days = Array.isArray(r.repeatWeekDays) ? r.repeatWeekDays : r.repeatDays || []
    if (days.length === 7) {
      items.push({
        id: `${baseId}-daily`,
        rid: r.id,
        repeatMode: 'daily',
        hour, minute, title,
      })
    } else if (days.length) {
      items.push({
        id: `${baseId}-weekly`,
        rid: r.id,
        repeatMode: 'weekly',
        hour, minute, title,
        weekdays: days,
      })
    }
  } else if (mode.startsWith('month')) {
    const md = Array.isArray(r.repeatMonthDays) ? r.repeatMonthDays : []
    md.forEach(d => {
      items.push({
        id: `${baseId}-m-${d}`,
        rid: r.id,
        repeatMode: 'monthly-date',
        hour, minute, title,
        day: d,
      })
    })
  }

  return { baseId, items }
}

export const useSchedulerStore = defineStore('scheduler', {
  actions: {
    // 루틴 전체 재하이드레이트 (purge 없음)
    async rehydrateFromRoutines(list = []) {
      if (!Array.isArray(list) || !list.length) return
      await waitBridgeReady()

      for (const r of list) {
        if (!r || r.isPaused) continue
        const { baseId, items } = computeDesired(r)

        const prevIds = lastIdsByBase.get(baseId) || new Set()
        const nextIds = new Set(items.map(i => i.id))

        // 필요 없는 id는 cancel
        for (const oldId of prevIds) {
          if (!nextIds.has(oldId)) {
            await cancelOnIOS(oldId)
            await sleep(10)
          }
        }

        // 새 id는 schedule
        for (const it of items) {
          if (!prevIds.has(it.id)) {
            await scheduleOnIOS(it)
            await sleep(10)
          }
        }

        // 상태 갱신
        lastIdsByBase.set(baseId, nextIds)
      }
    },

    // 특정 루틴만 다시 예약
    async reschedule(routine) {
      if (!routine) return
      await this.rehydrateFromRoutines([routine])
    },

    // 특정 루틴 제거
    async cancelRoutine(routineId) {
      const baseId = baseOf(routineId)
      const prev = lastIdsByBase.get(baseId)
      if (prev) {
        for (const id of prev) {
          await cancelOnIOS(id)
          await sleep(10)
        }
        lastIdsByBase.delete(baseId)
      }
    }
  }
})