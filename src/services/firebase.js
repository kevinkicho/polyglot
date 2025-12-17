import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCf-bliVUmDXtujsXhj35qAyXuYUDli_TM",
  authDomain: "polyglot121725.firebaseapp.com",
  projectId: "polyglot121725",
  storageBucket: "polyglot121725.firebasestorage.app",
  messagingSenderId: "847375215592",
  appId: "1:847375215592:web:294ede3e908d11509ed25d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the app instance (useful if you add Database/Auth later)
export { app };
