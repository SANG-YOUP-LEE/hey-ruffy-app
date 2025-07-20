import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBCn2I73I8Ignpw532txh3hue8QGeW3TJM",
  authDomain: "hey-ruffy.firebaseapp.com",
  projectId: "hey-ruffy",
  storageBucket: "hey-ruffy.appspot.com", 
  messagingSenderId: "526190494887",
  appId: "1:526190494887:web:c5b0212efdc4f393ac0782",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 
