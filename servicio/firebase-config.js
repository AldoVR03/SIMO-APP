import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBwzPJqcax9SFY9c8lNElz7Ql9PX93sdrE",
  authDomain: "simo-4e7c2.firebaseapp.com",
  projectId: "simo-4e7c2",
  storageBucket: "simo-4e7c2.firebasestorage.app",
  messagingSenderId: "480543647299",
  appId: "1:480543647299:web:326d5ca6a3b4cbb04716f6",
};

// App principal (con persistencia para el admin/usuarios normales)
const app = initializeApp(firebaseConfig);

// Segunda app solo para crear usuarios (sin persistencia)
// Nota: Esto permite crear usuarios sin desconectar al usuario actual
const secondaryApp = initializeApp(firebaseConfig, "Secondary");

export const db = getFirestore(app);

// Auth principal con persistencia
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Auth secundario SIN persistencia (para crear usuarios sin cerrar sesión)
export const secondaryAuth = getAuth(secondaryApp);

export const functions = getFunctions(app, 'us-central1');

export default app;