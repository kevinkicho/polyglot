import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, child } from 'firebase/database';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCf-bliVUmDXtujsXhj35qAyXuYUDli_TM",
  authDomain: "polyglot121725.firebaseapp.com",
  databaseURL: "https://polyglot121725-default-rtdb.firebaseio.com",
  projectId: "polyglot121725",
  storageBucket: "polyglot121725.firebasestorage.app",
  messagingSenderId: "847375215592",
  appId: "1:847375215592:web:294ede3e908d11509ed25d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Named Exports
export { 
    app, 
    db, 
    auth, 
    ref, 
    get, 
    child, 
    signInAnonymously, 
    signInWithPopup, 
    googleProvider 
};
