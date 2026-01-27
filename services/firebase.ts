
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCYRqF3j0cTF0v6_dvmm2-XhMVLeicceqk",
  authDomain: "padelrank-pro-app-2025.firebaseapp.com",
  projectId: "padelrank-pro-app-2025",
  storageBucket: "padelrank-pro-app-2025.firebasestorage.app",
  messagingSenderId: "263911970128",
  appId: "1:263911970128:web:8778030a3064c83787c855"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Secondary App for Creating Users without Logout
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
