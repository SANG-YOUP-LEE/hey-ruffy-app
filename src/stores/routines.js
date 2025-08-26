import { defineStore } from "pinia";
import { ref } from "vue";
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { normalize, isActive, isDue } from "@/utils/recurrence";

export const useRoutinesStore = defineStore("routines", () => {
  const routines = ref([]);
  const processingIds = ref([]);
  const editingId = ref(null);
  const lastError = ref(null);
  const currentUid = ref(null);

  function isProcessing(id) {
    return processingIds.value.includes(id);
  }
  function _markStart(id) {
    if (!processingIds.value.includes(id)) processingIds.value.push(id);
  }
  function _markEnd(id) {
    processingIds.value = processingIds.value.filter(v => v !== id);
  }
  function _docRef(id) {
    if (!currentUid.value) throw new Error("NO_UID");
    return doc(db, "users", currentUid.value, "routines", id);
  }

  async function load(uid) {
    currentUid.value = uid;
    const snap = await getDocs(collection(db, "users", uid, "routines"));
    routines.value = snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
  }

  function listForDate(dateISO) {
    return routines.value.filter(r =>
      isActive(dateISO, r.start, r.end) &&
      isDue(dateISO, r.rule, r.rule?.anchor || r.start)
    );
  }

  async function updateRoutine(id, patch) {
    _markStart(id);
    lastError.value = null;
    try {
      await updateDoc(_docRef(id), { ...patch, updatedAt: serverTimestamp() });
    } catch (e) {
      lastError.value = e;
      throw e;
    } finally {
      _markEnd(id);
    }
  }

  async function deleteRoutine(id) {
    _markStart(id);
    lastError.value = null;
    try {
      await deleteDoc(_docRef(id));
    } catch (e) {
      lastError.value = e;
      throw e;
    } finally {
      _markEnd(id);
    }
  }

  function startEdit(id) { editingId.value = id; }
  function clearEdit() { editingId.value = null; }

  return {
    routines, processingIds, editingId, lastError,
    load, listForDate,
    isProcessing, updateRoutine, deleteRoutine,
    startEdit, clearEdit,
  };
});
