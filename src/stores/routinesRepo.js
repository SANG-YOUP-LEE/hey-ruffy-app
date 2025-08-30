// src/repos/routinesRepo.js
import { db } from '@/firebase'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore'
import { normalize as normalizeRecurrence } from '@/utils/recurrence'

export function bindRoutines(uid, onData, onError) {
  if (!uid || typeof onData !== 'function') return () => {}
  const q = query(collection(db, 'users', uid, 'routines'), orderBy('createdAt', 'desc'))
  const unsub = onSnapshot(
    q,
    snap => {
      const list = []
      snap.forEach(d => list.push({ id: d.id, ...normalizeRecurrence(d.data()) }))
      onData(list)
    },
    err => { if (typeof onError === 'function') onError(err) }
  )
  return unsub
}

export async function setStatus(uid, rid, key, status, delta = 0) {
  if (!uid || !rid || !key) return
  const ref = doc(db, 'users', uid, 'routines', rid)
  const payload = { [`statuses.${key}`]: status, updatedAt: serverTimestamp() }
  if (delta !== 0) payload.walkDoneCount = increment(delta)
  await updateDoc(ref, payload)
}

export async function togglePause(uid, rid, isPaused) {
  if (!uid || !rid) return
  const ref = doc(db, 'users', uid, 'routines', rid)
  await updateDoc(ref, { isPaused: !!isPaused, updatedAt: serverTimestamp() })
}

export async function deleteMany(uid, ridList) {
  if (!uid || !Array.isArray(ridList) || ridList.length === 0) return
  await Promise.all(ridList.map(rid => deleteDoc(doc(db, 'users', uid, 'routines', rid))))
}

export default { bindRoutines, setStatus, togglePause, deleteMany }