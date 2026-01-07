import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYQfhtrxJmjksotey2stheX3_NtSusvXE",
  authDomain: "react-expo-919c5.firebaseapp.com",
  projectId: "react-expo-919c5",
  storageBucket: "react-expo-919c5.firebasestorage.app",
  messagingSenderId: "128204597058",
  appId: "1:128204597058:web:25301d2e79cf092fa1cadb"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
