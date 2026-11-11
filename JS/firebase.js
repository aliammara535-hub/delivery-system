
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAr4DL5bLyv9Lo-nz4q9XM3fvD02xAszYE",
  authDomain: "delivery-system-bce49.firebaseapp.com",
  projectId: "delivery-system-bce49",
  storageBucket: "delivery-system-bce49.firebasestorage.app",
  messagingSenderId: "80516438271",
  appId: "1:80516438271:web:e7c2807e9dd2130c7c14ca"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export { collection, addDoc, getDocs };
