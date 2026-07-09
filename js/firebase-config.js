/**
 * NEP DELIVERY CONTROL - FIREBASE CONFIG
 * Configuração do Firebase (Firestore + Authentication)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    doc,
    deleteDoc,
    arrayUnion,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    getDoc,
    setDoc,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCqwJ64SjXQf_ekZhRZcF4nN_Fqhwvxi_Q",
    authDomain: "ecossistema-nep.firebaseapp.com",
    projectId: "ecossistema-nep",
    storageBucket: "ecossistema-nep.firebasestorage.app",
    messagingSenderId: "1041112586342",
    appId: "1:1041112586342:web:0b7dc02b242cd3dbe635a7",
    measurementId: "G-JTQQ1SVMMV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export for use in other modules
export {
    // App
    app,

    // Firestore
    db,
    collection,
    addDoc,
    onSnapshot,
    updateDoc,
    doc,
    deleteDoc,
    arrayUnion,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    setDoc,
    limit,
    serverTimestamp,
    Timestamp,

    // Auth
    auth,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    updateEmail,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    deleteUser
};
