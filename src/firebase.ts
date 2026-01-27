// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

//에 있는 본인의 설정을 여기에 붙여넣으세요.
const firebaseConfig = {
  apiKey: "AIzaSy...", 
  authDomain: "zero-gap-42996.firebaseapp.com",
  projectId: "zero-gap-42996",
  storageBucket: "zero-gap-42996.firebasestorage.app",
  messagingSenderId: "107583385238",
  appId: "1:107583385238:web:..." 
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); //에서 만든 DB 연결