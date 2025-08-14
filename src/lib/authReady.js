// src/lib/authReady.js
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'

export const authReadyPromise = new Promise(resolve => {
  const off = onAuthStateChanged(auth, () => {
    off()
    resolve()
  })
})
