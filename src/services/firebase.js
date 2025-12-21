import { initializeApp } from 'firebase/app';
import { 
    getDatabase, 
    ref, 
    get, 
    child, 
    onValue, // <--- NEW: Needed for realtime vocab updates
    update,  // <--- NEW: Needed for saving edits
    set,
    push,
    increment
} from 'firebase/database';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInAnonymously, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut 
} from 'firebase/auth';

// TODO: PASTE YOUR ACTUAL FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyCf-bliVUmDXtujsXhj35qAyXuYUDli_TM",
  authDomain: "polyglot121725.firebaseapp.com",
  databaseURL: "https://polyglot121725-default-rtdb.firebaseio.com",
  projectId: "polyglot121725",
  storageBucket: "polyglot121725.firebasestorage.app",
  messagingSenderId: "847375215592",
  appId: "1:847375215592:web:294ede3e908d11509ed25d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
    app,
    db,
    auth,
    googleProvider,
    // Database exports
    ref,
    get,
    child,
    onValue, // Exporting this so vocabService can use it
    update,  // Exporting this so edit modals can save
    set,
    increment,
    push,
    // Auth exports
    onAuthStateChanged,
    signInAnonymously,
    signInWithPopup,
    signOut
};
