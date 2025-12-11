// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCCeeYwhP4ra6xnM3QJv9z6fMLaU37v8Xk",
    authDomain: "shokupan-e1a28.firebaseapp.com",
    projectId: "shokupan-e1a28",
    storageBucket: "shokupan-e1a28.firebasestorage.app",
    messagingSenderId: "228374610082",
    appId: "1:228374610082:web:cc5bccfabfd8759c5517fb",
    measurementId: "G-XRQ8PXWR19"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
