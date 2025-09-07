// src/composables/useRoutineBinding.js
import { computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function useRoutineBinding(rStore, mv, onUpdate) {
  const auth = useAuthStore()
  const uidRef = computed(() => auth.user?.uid || null)

  let stopWatch = null
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
    await auth.initOnce()
    if (stopWatch) return
    stopWatch = watch(uidRef, async (uid) => {
      if (uid && uid !== currentUid) {
        await bindFor(uid)
      } else if (!uid && currentUid) {
        currentUid = null
        releaseAll()
      } else if (!uid && currentUid == null) {
        releaseAll()
      }
    }, { immediate: true })
  }

  const disposeBinding = () => {
    if (stopWatch) { stopWatch(); stopWatch = null }
  }

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