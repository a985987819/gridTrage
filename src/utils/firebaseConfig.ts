// src/utils/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 替换为你的 Firebase 配置（从 Firebase 控制台获取）
const firebaseConfig = {
  apiKey: "AIzaSyBn0hq8M-NF0KCA7BFoOdWNR-o3BriaOiI",
  authDomain: "grid-trade-b1158.firebaseapp.com",
  projectId: "grid-trade-b1158",
  storageBucket: "grid-trade-b1158.firebasestorage.app",
  messagingSenderId: "1030377784580",
  appId: "1:1030377784580:web:35094592bafec5db3f3c51"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
// 初始化 Firestore 数据库
export const db = getFirestore(app);
