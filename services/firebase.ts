/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { Analytics, getAnalytics } from "firebase/analytics";

// `npm run dev:emulator` (VITE_USE_EMULATORS=true): local Auth/Firestore emulators on a demo project,
// so local testing never touches production data. Start them with `npm run emulators`.
export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

const prodConfig = {
  apiKey: "AIzaSyCYRqF3j0cTF0v6_dvmm2-XhMVLeicceqk",
  authDomain: "padelrank-pro-app-2025.firebaseapp.com",
  projectId: "padelrank-pro-app-2025",
  storageBucket: "padelrank-pro-app-2025.firebasestorage.app",
  messagingSenderId: "263911970128",
  appId: "1:263911970128:web:8778030a3064c83787c855",
  measurementId: "G-HJ6B562JW7"
};

export const firebaseConfig = useEmulators
  ? { ...prodConfig, apiKey: "demo-api-key", projectId: "demo-padelrank", authDomain: "demo-padelrank.firebaseapp.com", measurementId: undefined }
  : prodConfig;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics: Analytics | undefined = useEmulators ? undefined : getAnalytics(app);

// Secondary App for Creating Users without Logout
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectAuthEmulator(secondaryAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
