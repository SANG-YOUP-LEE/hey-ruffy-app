// src/utils/iosNotify.js
import { Capacitor } from '@capacitor/core'

/** ---------------------------
 *  🔑 ID 규칙 통일 (핵심 포인트)
 *  - baseId = routine-u-<uid>__<rid>
 *  - 절대 rt-…(임시)로 스케줄 금지
 *  - 하위 id:
 *      - daily : <baseId>-daily
 *      - once  : <baseId>-once-<epochMs>
 *      - weekly: <baseId>-w-<iosWeekday>__wd<iosWeekday>
 * -------------------------------- */
export const legacyBaseOf = (rid) => `routine-${rid}`            // (호환용)
export const baseOf = (uid, rid) => (uid ? `routine-u-${uid}__${rid}` : legacyBaseOf(rid))

const mh = () => window?.webkit?.messageHandlers?.notify
const log = (...args) => console.debug('[iosNotify]', ...args)

export function isBridgeAvailable() {
  const handler = mh()
  return !!(handler && typeof handler.postMessage === 'function')
}

export async function waitBridgeReady(maxTries = 25, delayMs = 120) {
  if (isBridgeAvailable()) return true
  for (let i = 0; i < maxTries; i++) {
    await new Promise(r => setTimeout(r, delayMs))
    if (isBridgeAvailable()) return true
  }
  return false
}

function safePost(payload) {
  try {
    const handler = mh()
    if (!handler || typeof handler.postMessage !== 'function') return
    handler.postMessage(payload)
  } catch {}
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const DEFAULT_SOUND = 'ruffysound001.wav'

// ✅ id 생성 함수들을 uid 포함 버전으로 교체 (legacy는 내부 호환용으로만 유지)
const idDaily = (uid, rid) => `${baseOf(uid, rid)}-daily`
const idOnce  = (uid, rid, tsMs) => `${baseOf(uid, rid)}-once-${tsMs}`

const toInt = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v)
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return Math.trunc(n)
  }
  return undefined
}

const KOR_DAY = { '일':1,'월':2,'화':3,'수':4,'목':5,'금':6,'토':7 }
const ENG_DAY = { su:1, sun:1, mo:2, mon:2, tu:3, tue:3, we:4, wed:4, th:5, thu:5, fr:6, fri:6, sa:7, sat:7 }
const ICS_DAY = { SU:1, MO:2, TU:3, WE:4, TH:5, FR:6, SA:7 }

function mapOneDayToken(d) {
  if (d == null) return undefined
  if (typeof d === 'number') {
    if (d >= 1 && d <= 7) return d
    if (d >= 0 && d <= 6) return d + 1
    return undefined
  }
  const s = String(d).trim()
  if (!s) return undefined
  const head = s.slice(0, 1)
  if (KOR_DAY[head]) return KOR_DAY[head]
  if (ENG_DAY[s.toLowerCase()]) return ENG_DAY[s.toLowerCase()]
  if (ICS_DAY[s.toUpperCase()]) return ICS_DAY[s.toUpperCase()]
  const n = toInt(s)
  if (n && n >= 1 && n <= 7) return n
  return undefined
}

function normalizeWeekdays(raw) {
  if (!raw) return []
  let arr = []
  if (Array.isArray(raw)) {
    arr = raw.map(mapOneDayToken).filter(Boolean)
  } else if (typeof raw === 'object') {
    arr = Object.entries(raw)
      .filter(([, v]) => !!v)
      .map(([k]) => mapOneDayToken(k))
      .filter(Boolean)
  } else {
    const one = mapOneDayToken(raw)
    if (one) arr = [one]
  }
  return Array.from(new Set(arr)).sort((a, b) => a - b)
}

// 내부: 월=1 … 일=7  -> iOS: 일=1 … 토=7 로 변환
function toIOSWeekdays(arr = []) {
  return arr.map(n => (n === 7 ? 1 : n + 1))
}

const _pad2 = (n) => String(n ?? 0).padStart(2, '0')

function ensureThreeLine(payload, src) {
  const modeSrc = src?.repeatMode || src?.mode || payload?.repeatMode || 'daily'
  const mode = String(modeSrc).toLowerCase()
  const label = mode.startsWith('weekly') ? 'Weekly'
              : mode.startsWith('monthly') ? 'Monthly'
              : (mode === 'once' || mode === 'today') ? 'One-time'
              : 'Daily'

  const pick = (a,b,c,d) => a ?? b ?? c ?? d

  let rawH = pick(
    Number(src?.hour), Number(src?.alarm?.hour),
    Number(payload?.hour), Number(payload?.alarm?.hour)
  )
  let rawM = pick(
    Number(src?.minute), Number(src?.alarm?.minute),
    Number(payload?.minute), Number(payload?.alarm?.minute)
  )

  if (!Number.isFinite(rawH) || !Number.isFinite(rawM)) {
    const str = src?.alarmTime || payload?.alarmTime
    if (typeof str === 'string') {
      const s0 = str.trim().replace(/[.\u00B7\s]+/g, ':').replace(/:+/g, ':')
      let m = s0.match(/^(?:\s*(오전|오후|AM|PM)\s+)?(\d{1,2}):(\d{2})(?:\s*(오전|오후|AM|PM))?$/i)
      if (m && (m[1] || m[4])) {
        let h = +m[2], mm = +m[3]
        const tag = (m[1] || m[4] || '').toUpperCase()
        if (tag === 'PM' || tag === '오후') { if (h < 12) h += 12 }
        if (tag === 'AM' || tag === '오전') { if (h === 12) h = 0 }
        rawH = h; rawM = mm
      } else {
        m = s0.match(/^(\d{1,2}):(\d{2})$/)
        if (m) { rawH = +m[1]; rawM = +m[2] }
      }
    }
  }

  if (!Number.isFinite(rawH) || !Number.isFinite(rawM)) {
    const ts = Number(src?.timestamp ?? payload?.timestamp)
    if (Number.isFinite(ts) && ts > 0) {
      const ms = ts > 1e12 ? ts : ts * 1000
      const d = new Date(ms)
      rawH = d.getHours()
      rawM = d.getMinutes()
    }
  }

  const hh = Number.isFinite(rawH) ? _pad2(rawH) : '00'
  const mm = Number.isFinite(rawM) ? _pad2(rawM) : '00'

  const routineTitle =
    (src?.title || src?.name || payload?.title || payload?.name || '').trim() || '(제목없음)'

  // 제목은 앱 이름, 서브타이틀에 루틴명, 본문은 3줄 구성을 유지
  return {
    ...payload,
    title: 'Hey Ruffy',
    subtitle: routineTitle,
    body: `${routineTitle}\n[${hh}:${mm} · ${label}] 달성현황을 체크해주세요`,
  }
}

async function purgeThenSchedule(base, scheduleFn, delayMs = 350) {
  if (base) safePost({ action: 'purgeBase', baseId: base })
  if (delayMs > 0) await sleep(delayMs)
  await scheduleFn()
}

const MAX_GLOBAL = 64
const MAX_PER_ROUTINE = 16

function applyCaps(payloads, maxGlobal = MAX_GLOBAL, maxPerRoutine = MAX_PER_ROUTINE) {
  const byBase = new Map()
  const out = []
  for (const p of payloads) {
    const b = p.baseId || ''
    const cnt = byBase.get(b) || 0
    if (cnt >= maxPerRoutine) continue
    if (out.length >= maxGlobal) break
    out.push(p)
    byBase.set(b, cnt + 1)
  }
  return out
}

async function commitSchedules(payloads) {
  if (!(await waitBridgeReady())) return
  const sliced = applyCaps(payloads)
  for (const p of sliced) safePost(ensureThreeLine(p, p))
}

/** ------------------------------------------------
 *  스케줄러 (baseId 직접 받는 버전은 유지: scheduleWeekly, scheduleOneShot)
 *  ------------------------------------------------ */

export async function scheduleWeekly(baseIdStr, hour, minute, days, title, body) {
  const h = toInt(hour), m = toInt(minute)
  if (!baseIdStr || !Number.isFinite(h) || !Number.isFinite(m)) return
  const internalWeekdays = normalizeWeekdays(days)
  if (!internalWeekdays.length) return

  const iosWeekdays = toIOSWeekdays(internalWeekdays)

  const batch = iosWeekdays.map(wd => ({
    action: 'schedule',
    id: `${baseIdStr}-w-${wd}__wd${wd}`,
    baseId: baseIdStr,
    repeatMode: 'weekly',
    hour: h,
    minute: m,
    alarm: { hour: h, minute: m },
    weekday: wd,
    weekdays: [wd],
    sound: DEFAULT_SOUND,
    title,
    name: title,
    body
  }))

  await purgeThenSchedule(baseIdStr, async () => {
    await commitSchedules(batch)
  })
}

export async function scheduleOneShot(baseIdStr, tsMs, title, body) {
  if (!baseIdStr || !tsMs) return
  const ms = Number(tsMs)
  const id = `${baseIdStr}-once-${ms}`
  const payload = [{
    action: 'schedule',
    id,
    baseId: baseIdStr,
    repeatMode: 'once',
    timestamp: Math.floor((ms >= 1e12 ? ms : ms * 1000) / 1000),
    sound: DEFAULT_SOUND,
    title,
    name: title,
    body
  }]
  await purgeThenSchedule(baseIdStr, async () => {
    await commitSchedules(payload)
  })
}

/** ------------------------------------------------
 *  네이티브 브리지 유틸
 *  ------------------------------------------------ */

export async function setEditingRoutine(editing) {
  try {
    const NC = Capacitor?.Plugins?.NotifyCenterBridge
    if (NC?.setEditing) {
      await NC.setEditing({ editing: !!editing })
    }
  } catch (_) {}
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('isEditingRoutine', editing ? '1' : '0')
      if (editing) localStorage.setItem('isEditingRoutineSince', String(Date.now()))
    }
  } catch (_) {}
}

export async function cancelOnIOS(idOrBase) {
  if (!(await waitBridgeReady())) return
  if (!idOrBase) return
  const raw = String(idOrBase)
  // baseId 형태면 purgeBase로 처리 (u-여부/legacy 모두 허용)
  if (raw.startsWith('routine-u-') || raw.startsWith('routine-')) {
    safePost({ action: 'purgeBase', baseId: raw })
  } else {
    safePost({ action: 'cancel', id: raw })
  }
}

export async function purgeAll() {
  if (!(await waitBridgeReady())) return
  safePost({ action: 'purgeAll' })
}

export async function dumpPending(tag = 'manual', limit = 10) {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'development') return
  if (!(await waitBridgeReady())) return
  safePost({ action: 'dumpPending', tag, limit })
}

export async function debugPingOnIOS(sec = 20, tag = 'rt_ping') {
  if (!(await waitBridgeReady())) return
  const s = toInt(sec) ?? 20
  safePost({ action: 'debugPing', baseId: tag, seconds: s })
}

export function purgeBase(baseIdStr) {
  if (!baseIdStr) return
  safePost({ action: 'purgeBase', baseId: baseIdStr })
}

export function purgeBases(baseIds = []) {
  for (const b of baseIds) purgeBase(b)
}

// ✅ uid 포함 형태로 변경
export function purgeRoutineAll(uid, rid) {
  if (!rid) return
  const b = baseOf(uid, rid)
  safePost({ action: 'purgeBase', baseId: b })
}

/** ------------------------------------------------
 *  스케줄 API (rid만 받던 것 → uid+rid 받도록 변경)
 *  ------------------------------------------------ */

export async function scheduleDaily({ uid, rid, hour, minute, title }) {
  if (!uid || !rid) return
  const h = toInt(hour), m = toInt(minute)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return
  const b = baseOf(uid, rid)
  const payload = [{
    action: 'schedule',
    id: idDaily(uid, rid),
    baseId: b,
    repeatMode: 'daily',
    hour: h,
    minute: m,
    alarm: { hour: h, minute: m },
    sound: DEFAULT_SOUND,
    title,
    name: title,
  }]
  await purgeThenSchedule(b, async () => {
    await commitSchedules(payload)
  })
}

export async function scheduleOnce({ uid, rid, atMs, title }) {
  if (!uid || !rid || !atMs) return
  const b = baseOf(uid, rid)
  const tsMs = Number(atMs)
  const payload = [{
    action: 'schedule',
    id: idOnce(uid, rid, tsMs),
    baseId: b,
    repeatMode: 'once',
    timestamp: Math.floor(tsMs / 1000),
    sound: DEFAULT_SOUND,
    title,
    name: title,
  }]
  await purgeThenSchedule(b, async () => {
    await commitSchedules(payload)
  })
}

/** ------------------------------------------------
 *  scheduleOnIOS(메시지 라우터)
 *    - msg.uid 가 있으면 현행 규칙 사용
 *    - 없으면 legacy(하위호환)로 동작
 *  ------------------------------------------------ */
export async function scheduleOnIOS(msg) {
  if (!(await waitBridgeReady())) return

  const modeRaw = msg?.mode || msg?.repeatMode
  const mode = typeof modeRaw === 'string' ? modeRaw.toLowerCase() : ''
  const isToday   = mode === 'today'
  const isOnce    = mode === 'once'
  const isDaily   = mode === 'daily'
  const isWeekly  = mode.startsWith('weekly')
  const isMonthly = mode.startsWith('monthly')

  const rid = msg?.routineId || msg?.routineID || msg?.rid
  const uid = msg?.uid || msg?.userId || msg?.userID || msg?.ownerUid || null

  if (rid) {
    const hour   = toInt(msg?.hour ?? msg?.alarm?.hour)
    const minute = toInt(msg?.minute ?? msg?.alarm?.minute)
    const b = uid ? baseOf(uid, rid) : legacyBaseOf(rid) // ← 호환

    // once/today: fireTimesEpoch[] 전체를 배치로 예약
    if (isToday || isOnce) {
      const now = Date.now()
      const toMs = (v) => {
        const n = Number(v)
        if (!Number.isFinite(n)) return null
        return n >= 1e12 ? Math.floor(n) : Math.floor(n * 1000)
      }

      let list = Array.isArray(msg?.fireTimesEpoch) ? msg.fireTimesEpoch.map(toMs).filter(Boolean) : []

      if (!list.length && Number.isFinite(hour) && Number.isFinite(minute)) {
        const d = new Date()
        d.setSeconds(0, 0)
        d.setHours(hour, minute, 0, 0)
        const t = d.getTime()
        if (t > now) list = [t]
      }

      const GRACE_MS = 500
      const future = list.filter(ms => ms >= now + GRACE_MS).sort((a,b)=>a-b)
      if (!future.length) return

      const batch = future.map(ms => ({
        action: 'schedule',
        id: uid ? idOnce(uid, rid, ms) : `${legacyBaseOf(rid)}-once-${ms}`,
        baseId: b,
        repeatMode: 'once',
        timestamp: Math.floor(ms / 1000),
        sound: DEFAULT_SOUND,
        title: msg.title || msg.name,
        name: msg.name || msg.title,
      }))

      await purgeThenSchedule(b, async () => {
        await commitSchedules(batch)
      })
      return
    }

    if (isDaily) {
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return
      const payload = [{
        action: 'schedule',
        id: uid ? idDaily(uid, rid) : `${legacyBaseOf(rid)}-daily`,
        baseId: b,
        repeatMode: 'daily',
        hour, minute,
        alarm: { hour, minute },
        sound: DEFAULT_SOUND,
        title: msg.title || msg.name,
        name: msg.name || msg.title,
      }]
      await purgeThenSchedule(b, async () => {
        await commitSchedules(payload)
      })
      return
    }

    if (isWeekly) {
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return

      let weekdays =
        Array.isArray(msg?.repeatWeekDays) ? msg.repeatWeekDays :
        Array.isArray(msg?.weekdays)      ? msg.weekdays      :
        (msg?.repeatWeekDays || msg?.weekday)

      weekdays = toIOSWeekdays(normalizeWeekdays(weekdays)) || []
      if (!weekdays.length) return

      const batch = weekdays.map(wd => ({
        action: 'schedule',
        id: `${b}-w-${wd}__wd${wd}`,
        baseId: b,
        repeatMode: 'weekly',
        hour, minute,
        alarm: { hour, minute },
        weekday: wd,
        weekdays: [wd],
        sound: DEFAULT_SOUND,
        title: msg.title || msg.name,
        name: msg.name || msg.title,
      }))

      await purgeThenSchedule(b, async () => {
        await commitSchedules(batch)
      })
      return
    }

    if (isMonthly) {
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return
      const days = Array.isArray(msg?.daysOfMonth) ? msg.daysOfMonth : (msg?.dayOfMonth != null ? [msg.dayOfMonth] : [])
      const doms = days.map(toInt).filter(d => Number.isFinite(d) && d >= 1 && d <= 31)
      if (!doms.length) return

      const batch = doms.map(dn => ({
        action: 'schedule',
        id: `${b}-m-${dn}`,
        baseId: b,
        repeatMode: 'monthly',
        hour, minute,
        alarm: { hour, minute },
        monthDay: dn,
        sound: DEFAULT_SOUND,
        title: msg.title || msg.name,
        name: msg.name || msg.title,
      }))

      await purgeThenSchedule(b, async () => {
        await commitSchedules(batch)
      })
      return
    }
  }

  // fallback 단일 예약(가능한 한 쓰지 않되, 호환 유지)
  const out = []
  const unified = (() => {
    const o = { action: 'schedule' }
    o.id = msg.id || msg.baseId || 'inline'
    o.repeatMode = msg.repeatMode || msg.repeatType || 'once'
    o.hour = toInt(msg.hour ?? msg?.alarm?.hour)
    o.minute = toInt(msg.minute ?? msg?.alarm?.minute)
    // baseId 우선, 없으면 legacy 규칙 (uid가 없을 때만)
    o.baseId = msg.baseId || (msg.routineId ? legacyBaseOf(msg.routineId) : undefined)
    o.title  = msg.title || msg.name || o.title
    o.name   = msg.name  || msg.title || o.name
    o.sound = DEFAULT_SOUND
    return o
  })()

  if (unified.repeatMode === 'today') {
    unified.repeatMode = 'once'
    if (!unified.timestamp) {
      if (Number.isFinite(unified.hour) && Number.isFinite(unified.minute)) {
        const d = new Date()
        d.setHours(unified.hour, unified.minute, 0, 0)
        const t = d.getTime()
        if (t > Date.now()) unified.timestamp = Math.floor(t / 1000)
      }
    }
  }
  if (unified.repeatMode === 'once' && unified.timestamp && unified.timestamp > 1e12) {
    unified.timestamp = Math.floor(unified.timestamp / 1000)
  }
  if ((unified.repeatMode === 'daily' || unified.repeatMode?.startsWith('weekly') || unified.repeatMode?.startsWith('monthly'))
      && (!Number.isFinite(unified.hour) || !Number.isFinite(unified.minute))) {
    return
  }
  if (unified.baseId) {
    out.push(unified)
    await purgeThenSchedule(unified.baseId, async () => {
      await commitSchedules(out)
    })
  } else {
    await commitSchedules([unified])
  }
}

export function postIOS(payload) { safePost(payload) }

export const scheduleRoutineAlerts = scheduleOnIOS
export const cancelRoutineAlerts   = cancelOnIOS

export default {
  // helpers
  baseOf, legacyBaseOf,

  // bridge
  isBridgeAvailable,
  waitBridgeReady,
  purgeAllForBase,
  cancelOnIOS,
  dumpPending,
  debugPingOnIOS,
  purgeBase,
  purgeBases,
  purgeRoutineAll,
  purgeAll,
  postIOS,

  // schedulers
  scheduleWeekly,
  scheduleOneShot,
  scheduleDaily,
  scheduleOnce,
  scheduleOnIOS,
  scheduleRoutineAlerts,
  cancelRoutineAlerts,
}

/** ------------------------------------------------
 *  네이티브 purge 호출(최상위) : 유지
 * ------------------------------------------------ */
export async function setActiveGeneration(baseId, gen) {
  const NC = Capacitor?.Plugins?.NotifyCenterBridge
  if (!baseId || !gen) return
  try { await NC?.setActiveGeneration?.({ baseId, gen }) } catch {}
}

// ✅ 유일한 정의(그대로 유지)
export async function purgeAllForBase(baseId, opts = {}) {
  const { gen = '', dryRun = false, force = false, maxDelete = 4 } = opts
  const NC = Capacitor?.Plugins?.NotifyCenterBridge
  if (NC?.purgeBase) {
    try { await NC.purgeBase({ baseId, gen, dryRun, force, maxDelete }); return } catch {}
  }
  if (NC?.purgeAllForBase) {
    try { await NC.purgeAllForBase({ baseId, gen, dryRun, force, maxDelete }); return } catch {}
  }
  if (!(await waitBridgeReady())) return
  safePost({ action: 'purgeBase', baseId })
}
