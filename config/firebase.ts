import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCom34TtZ0qxQAGy7pa2JQvsXzSY0l9gYs",
  authDomain: "dasep-project.firebaseapp.com",
  projectId: "dasep-project",
  storageBucket: "dasep-project.appspot.com",
  messagingSenderId: "665233103728",
  appId: "1:665233103728:web:52f96a0242d4bc4952cdb5",
  measurementId: "G-BJY3NTT1TB"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
