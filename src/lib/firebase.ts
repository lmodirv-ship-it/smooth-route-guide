import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDv3EP3G9EYQ5o_dg5n6JQQ5V1JLzYB_sg",
  authDomain: "hn-driver-18963.firebaseapp.com",
  projectId: "hn-driver-18963",
  storageBucket: "hn-driver-18963.firebasestorage.app",
  messagingSenderId: "580790588411",
  appId: "1:580790588411:web:5f8211eebd6df7916d315e",
  measurementId: "G-4CSRE5QHMY",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
