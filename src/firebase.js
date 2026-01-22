import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ⚠️ REEMPLAZA ESTO CON TUS DATOS REALES DE FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyDXz9mINTWOhFH8pa3w77msS_Qi1wLmg1E", 
  authDomain: "sartor-flota.firebaseapp.com",
  projectId: "sartor-flota",
  storageBucket: "sartor-flota.firebasestorage.app",
  messagingSenderId: "519096044105",
  appId: "1:519096044105:web:5bed12f6c5ea49ea890d98"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);