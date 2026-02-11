import { initializeApp } from "firebase/app";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyD_NYdmUhtaaBWt0H3ilNX0iNh-aJ1kARY",
  authDomain: "emissions-map-uk.firebaseapp.com",
  projectId: "emissions-map-uk",
  storageBucket: "emissions-map-uk.firebasestorage.app",
  messagingSenderId: "341699421952",
  appId: "1:341699421952:web:07849473066514a4e435e5",
  measurementId: "G-54SHK2N73Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app);