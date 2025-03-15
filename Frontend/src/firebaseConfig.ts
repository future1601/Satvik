import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "enter your api-key",
    authDomain: "satvik-app-3776e.firebaseapp.com",
    projectId: "satvik-app-3776e",
    storageBucket: "satvik-app-3776e.firebasestorage.app",
    messagingSenderId: "534508931892",
    appId: "1:534508931892:web:0ccc35cd915089b0707361",
    measurementId: "G-NJ73CXFGXS"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// For backwards compatibility with your existing code
const firebase = {
  auth: () => auth,
  firestore: () => firestore,
  apps: [app]
};

export { firebase, auth, firestore }; 
