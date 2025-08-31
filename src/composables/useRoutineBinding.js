// src/composables/useRoutineBinding.js
import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { authReadyPromise } from '@/lib/authReady'

export function useRoutineBinding(rStore, mv, onUpdate) {
  let stopAuth = null
  let currentUid = null
  const update = () => { if (onUpdate) onUpdate() }
  const bindFor = (uid) => { currentUid = uid; rStore.bind(uid) }
  const releaseAll = () => {
    rStore.release()
    rStore.items = []
    rStore.isLoading = false
    rStore.hasFetched = true
    mv.setLoading(false)
    mv.setFetched(true)
    update()
  }
  const initBinding = async () => {
    await authReadyPromise
    if (auth.currentUser) bindFor(auth.currentUser.uid)
    stopAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.uid !== currentUid) bindFor(user.uid)
      else if (!user) { currentUid = null; releaseAll() }
    })
  }
  const disposeBinding = () => { if (stopAuth) stopAuth(); stopAuth = null }
  const refreshBinding = () => { if (currentUid) rStore.bind(currentUid) }
  return { initBinding, disposeBinding, refreshBinding }
}