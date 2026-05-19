import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAy4rz4yzIODaMydhR0adgNgAm_82hZjW4",
  authDomain: "coach-berry-stat-tracker.firebaseapp.com",
  projectId: "coach-berry-stat-tracker",
  storageBucket: "coach-berry-stat-tracker.firebasestorage.app",
  messagingSenderId: "850940223958",
  appId: "1:850940223958:web:0af5aa02757943f2974477",
  measurementId: "G-ZGCD0R663H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
