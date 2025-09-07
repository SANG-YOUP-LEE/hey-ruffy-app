// src/stores/auth.js
import { defineStore } from 'pinia'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'

let inited = false
let unsub = null
let readyResolve = null
let readyPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false,
    profile: null,
  }),
  actions: {
    async initOnce() {
      if (inited) return readyPromise || Promise.resolve()
      inited = true
      const auth = getAuth()
      this.user = auth.currentUser
      readyPromise = new Promise(r => { readyResolve = r })
      unsub = onAuthStateChanged(auth, async (u) => {
        const uid = u?.uid || null
        this.user = u || null
        if (uid) {
          try {
            const snap = await getDoc(doc(db, 'users', uid))
            if (this.user?.uid === uid) this.profile = snap.exists() ? snap.data() : null
          } catch { if (this.user?.uid === uid) this.profile = null }
        } else {
          this.profile = null
        }
        this.ready = true
        if (readyResolve) { readyResolve(); readyResolve = null }
      })
      return readyPromise
    },
    async refreshProfile() {
      const uid = this.user?.uid
      if (!uid) { this.profile = null; return }
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (this.user?.uid === uid) this.profile = snap.exists() ? snap.data() : null
      } catch { if (this.user?.uid === uid) this.profile = null }
    },
    dispose() {
      unsub?.(); unsub = null
      inited = false
      readyResolve = null
      readyPromise = null
      this.user = null
      this.profile = null
      this.ready = false
    },
    async ensureReady() {
      await this.initOnce()
      if (this.ready) return
      if (readyPromise) await readyPromise
    }
  }
})