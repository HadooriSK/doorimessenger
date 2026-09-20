const firebaseConfig = {
  apiKey: "AIzaSyAIV8HtZGe8RBzqcDLwc8RT2iY3TSWrnIk",
  authDomain: "doori-messenger.firebaseapp.com",
  projectId: "doori-messenger",
  storageBucket: "doori-messenger.firebasestorage.app",
  messagingSenderId: "774100584948",
  appId: "1:774100584948:web:f8df7918b33e5fdf8f11a1",
  measurementId: "G-7C15W6006F"
};

// Initialize Firebase using the Compat API
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
// db.settings({ experimentalForceLongPolling: true });

// Lösche alte ausstehende offline-Uploads, die den Browser einfrieren lassen
db.clearPersistence().catch(e => console.log("Clear persistence error:", e));

// Make them globally available for app.js
window.auth = auth;
window.db = db;
window.storage = storage;
