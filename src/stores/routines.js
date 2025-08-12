// src/stores/routines.js
import { defineStore } from "pinia";
import { ref } from "vue";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { normalize, isActive, isDue } from "@/utils/recurrence";

export const useRoutinesStore = defineStore("routines", () => {
  const routines = ref([]);

  async function load(uid) {
    const snap = await getDocs(collection(db, "users", uid, "routines"));
    routines.value = snap.docs.map(d => ({
      id: d.id,
      ...normalize(d.data()),
    }));
  }

  function listForDate(dateISO) {
    return routines.value.filter(r =>
      isActive(dateISO, r.start, r.end) &&
      isDue(dateISO, r.rule, r.rule?.anchor || r.start)
    );
  }

  return { routines, load, listForDate };
});
