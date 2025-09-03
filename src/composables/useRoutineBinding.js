// src/composables/useRoutineBinding.js
import { auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { authReadyPromise } from '@/lib/authReady'

export function useRoutineBinding(rStore, mv, onUpdate) {
  let stopAuth = null
  let currentUid = null
  const update = () => { if (onUpdate) onUpdate() }

  const bindFor = async (uid) => {
    currentUid = uid
    mv.setLoading(true)
    await rStore.bind(uid)
    mv.setLoading(false)
    mv.setFetched(true)
    update()
  }

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
    if (auth.currentUser) await bindFor(auth.currentUser.uid)
    stopAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.uid !== currentUid) bindFor(user.uid)
      else if (!user) { currentUid = null; releaseAll() }
    })
  }

  const disposeBinding = () => { if (stopAuth) stopAuth(); stopAuth = null }

  const refreshBinding = async () => {
    if (!currentUid) return
    rStore.release()
    rStore.items = []
    mv.setLoading(true)
    mv.setFetched(false)
    await rStore.bind(currentUid)
    mv.setLoading(false)
    mv.setFetched(true)
    update()
  }

  return { initBinding, disposeBinding, refreshBinding }
}
