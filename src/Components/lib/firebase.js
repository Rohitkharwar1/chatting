// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "reactchat-25427.firebaseapp.com",
  projectId: "reactchat-25427",
  storageBucket: "reactchat-25427.appspot.com",
  messagingSenderId: "975090592500",
  appId: "1:975090592500:web:3a3125e1a5818fda698ca1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
