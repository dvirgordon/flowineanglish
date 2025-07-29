import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCxesJQTysh-4b7FlbMui4aoepG04Z2aDY",
  authDomain: "flow-in-eanglish.firebaseapp.com",
  projectId: "flow-in-eanglish",
  storageBucket: "flow-in-eanglish.appspot.com",
  messagingSenderId: "936622998158",
  appId: "1:936622998158:web:f496a1d03d671c61c67fdf",
  measurementId: "G-GXFGMEPRVB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { auth, db };
