// Töltsd ki a Firebase projekted webapp konfigurációjával
// (Firebase Console → Project settings → General → Your apps → SDK setup and configuration).
// Ezek az értékek NEM titkosak, nyugodtan commitolhatók és tölthetők fel GitHubra:
// a védelmet a Firestore biztonsági szabályok (firestore.rules) adják, nem ezek eltitkolása.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let db = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY" && window.firebase) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}
