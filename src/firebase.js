// src/firebase.js
import { initializeApp } from 'firebase/app'
import {
  initializeAuth,
  indexedDBLocalPersistence, // <- 중요
  browserLocalPersistence,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBCn2I73I8Ignpw532txh3hue8QGeW3TJM',
  authDomain: 'hey-ruffy.firebaseapp.com',
  projectId: 'hey-ruffy',
  storageBucket: 'hey-ruffy.appspot.com',
  messagingSenderId: '526190494887',
  appId: '1:526190494887:web:c5b0212efdc4f393ac0782',
}

const app = initializeApp(firebaseConfig)

// ✅ Capacitor(WebView)에서도 세션 유지되도록 영속화 지정
const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,    // 1순위
    browserLocalPersistence,      // 2순위(대체)
  ],
})

const db = getFirestore(app)

export { auth, db }
