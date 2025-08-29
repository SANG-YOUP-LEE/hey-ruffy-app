// src/utils/iosRoutineScheduler.js
import { getFirestore, collection, query, onSnapshot } from 'firebase/firestore'
import { scheduleOnIOS, cancelOnIOS, cancelAllOnIOS } from '@/utils/iosNotify'

const fpMap = new Map()
const isIosWebView = () => !!(window.webkit?.messageHandlers?.notify)

function fingerprint(r) {
  const a = r?.alarm || {}
  return JSON.stringify({
    repeatMode: r?.repeatMode ?? null,
    hour: a.hour ?? null,
    minute: a.minute ?? null,
    weekdays: a.weekdays ?? null,
    onceAt: a.onceAt ?? null,
  })
}

export function initIOSRoutineScheduler(uid) {
  if (!uid || !isIosWebView()) return () => {}

  const db = getFirestore()
  const q = query(collection(db, 'users', uid, 'routines'))

  const unsub = onSnapshot(q, (snap) => {
    snap.docChanges().forEach(({ type, doc }) => {
      const d = doc.data() || {}
      const r = {
        id: doc.ref.path.replace(/\//g, '_'),
        name: d.name,
        repeatMode: d.repeatMode,
        alarm: d.alarm || null,
      }

      if (type === 'removed') {
        cancelOnIOS(r.id)
        fpMap.delete(r.id)
        return
      }

      const newFP = fingerprint(r)
      const oldFP = fpMap.get(r.id)
      if (newFP !== oldFP) {
        const oncePast = r.repeatMode === 'once' && (r?.alarm?.onceAt ?? 0) * 1000 < Date.now()
        if (!oncePast) {
          cancelOnIOS(r.id)
          scheduleOnIOS(r)
        }
        fpMap.set(r.id, newFP)
      }
    })
  })

  return () => { unsub?.() }
}

export function rescheduleAllIOS(routines) {
  if (!isIosWebView()) return
  cancelAllOnIOS()
  fpMap.clear()
  routines.forEach((r) => {
    const oncePast = r.repeatMode === 'once' && (r?.alarm?.onceAt ?? 0) * 1000 < Date.now()
    if (oncePast) return
    scheduleOnIOS(r)
    fpMap.set(r.id, fingerprint(r))
  })
}
