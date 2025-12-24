import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Paste your config object here from the Firebase Console
  apiKey: "AIzaSyCK7IYianikcS6H3xEn2G80J_coP2WXoW8",
  authDomain: "agentic-career-lab-7ba6f.firebaseapp.com",
  projectId: "agentic-career-lab-7ba6f",
  storageBucket: "agentic-career-lab-7ba6f.firebasestorage.app",
  messagingSenderId: "688406732016",
  appId: "1:688406732016:web:648da77c1f209f2835f635"
};

// ADD THIS TEMPORARY LINE:
console.log("Firebase API Key check:", firebaseConfig.apiKey);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);