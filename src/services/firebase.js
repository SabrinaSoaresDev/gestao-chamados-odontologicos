import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAR9IHJFoeRldf0c8BEKvuK26MT3UIeNbs",
  authDomain: "gestao-chamados-odontologicos.firebaseapp.com",
  projectId: "gestao-chamados-odontologicos",
  storageBucket: "gestao-chamados-odontologicos.firebasestorage.app",
  messagingSenderId: "145169990092",
  appId: "1:145169990092:web:c548d634ccaa5209205d69",
  measurementId: "G-V5SKNDWKP6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);