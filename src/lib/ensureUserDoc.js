import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/firebase"

export async function ensureUserDoc(user) {
  if (!user?.uid) return
  const ref = doc(db, "users", user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || "",
      nickname: user.displayName || "",
      selectedRuffy: "",
      selectedColor: "blue",
      verified: !!user.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  }
}
