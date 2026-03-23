import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-key",
  authDomain: "hn-driver-18963.firebaseapp.com",
  projectId: "hn-driver-18963",
  storageBucket: "hn-driver-18963.firebasestorage.app",
  messagingSenderId: "580790588411",
  appId: "1:580790588411:web:5f8211eebd6df7916d315e",
  measurementId: "G-4CSRE5QHMY",
};

let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let storage: ReturnType<typeof getStorage>;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e) {
  // Firebase init failed — create minimal stubs so imports don't crash
  console.warn("[Firebase] Initialization failed, using stubs:", (e as Error)?.message);
  app = {} as any;
  auth = {} as any;
  db = {} as any;
  storage = {} as any;
}

export { auth, db, storage };
export default app;
