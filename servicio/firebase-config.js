// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBwzPJqcax9SFY9c8lNElz7Ql9PX93sdrE",
  authDomain: "simo-4e7c2.firebaseapp.com",
  projectId: "simo-4e7c2",
  storageBucket: "simo-4e7c2.firebasestorage.app",
  messagingSenderId: "480543647299",
  appId: "1:480543647299:web:326d5ca6a3b4cbb04716f6",
};

// Inicializar app
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

// Inicializar Auth con persistencia en AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
