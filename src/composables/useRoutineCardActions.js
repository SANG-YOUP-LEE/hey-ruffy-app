// Pinia store for routines (삭제/수정 전담)
import { defineStore } from 'pinia'
import { db, auth } from '@/firebase'
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

export const useRoutinesStore = defineStore('routines', {
  state: () => ({
    processingIds: [],   // 진행중 아이디(스피너/중복클릭 방지)
    editingId: null,     // 수정 중인 다짐 id (편집 모달 트리거용)
    lastError: null,
  }),
  getters: {
    isProcessing: (state) => (id) => state.processingIds.includes(id),
  },
  actions: {
    _requireUser() {
      const u = auth.currentUser
      if (!u) throw new Error('AUTH_REQUIRED')
      return u
    },
    _docRef(id) {
      const u = this._requireUser()
      return doc(db, 'users', u.uid, 'routines', id)
    },
    _markStart(id) {
      if (!this.processingIds.includes(id)) this.processingIds.push(id)
    },
    _markEnd(id) {
      this.processingIds = this.processingIds.filter(v => v !== id)
    },

    async updateRoutine(id, patch) {
      this._markStart(id)
      this.lastError = null
      try {
        await updateDoc(this._docRef(id), { ...patch, updatedAt: serverTimestamp() })
      } catch (e) {
        this.lastError = e
        throw e
      } finally {
        this._markEnd(id)
      }
    },

    async deleteRoutine(id) {
      this._markStart(id)
      this.lastError = null
      try {
        await deleteDoc(this._docRef(id))
      } catch (e) {
        this.lastError = e
        throw e
      } finally {
        this._markEnd(id)
      }
    },

    startEdit(id) { this.editingId = id },
    clearEdit() { this.editingId = null },
  },
})
