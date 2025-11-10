import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBwzPJqcax9SFY9c8lNElz7Ql9PX93sdrE",
  authDomain: "simo-4e7c2.firebaseapp.com",
  projectId: "simo-4e7c2",
  storageBucket: "simo-4e7c2.firebasestorage.app",
  messagingSenderId: "480543647299",
  appId: "1:480543647299:web:326d5ca6a3b4cbb04716f6",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Configurar la región correcta (us-central1 es la predeterminada)
export const functions = getFunctions(app, 'us-central1');

// Solo para desarrollo local (comenta o elimina en producción)
// connectFunctionsEmulator(functions, "localhost", 5001);

export default app;