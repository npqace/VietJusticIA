// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// TODO: Add your own Firebase configuration from the Firebase console
// IMPORTANT: REPLACE THE PLACEHOLDER VALUES BELOW WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCLWic4OMOzwXMryeO9rKNF1DSzV9Dh0GY",
  authDomain: "vietjusticia-67e34.firebaseapp.com",
  projectId: "vietjusticia-67e34",
  storageBucket: "vietjusticia-67e34.firebasestorage.app",
  messagingSenderId: "674210851279",
  appId: "1:674210851279:web:8b33bf52bc05a475f4caba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);
