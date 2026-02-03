import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDBqylN1B_oRb2jKYmlCAfpbxP8hK-tlCU",
    authDomain: "tracking-system-3b6fc.firebaseapp.com",
    projectId: "tracking-system-3b6fc",
    storageBucket: "tracking-system-3b6fc.firebasestorage.app",
    messagingSenderId: "195199968268",
    appId: "1:195199968268:web:2ae5928ab9b7edbc3bfa29",
    measurementId: "G-STCR27DCDT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, db, auth, googleProvider, analytics };
