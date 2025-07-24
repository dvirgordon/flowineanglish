// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cloud storage service
class CloudStorage {
    // Save data to Firestore
    async saveData(key, data) {
        try {
            await setDoc(doc(db, 'flowData', key), { data: data, timestamp: new Date() });
            return true;
        } catch (error) {
            console.error('Error saving data to cloud:', error);
            return false;
        }
    }

    // Load data from Firestore
    async loadData(key) {
        try {
            const docRef = doc(db, 'flowData', key);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data().data;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error loading data from cloud:', error);
            return null;
        }
    }

    // Remove data from Firestore
    async removeData(key) {
        try {
            await deleteDoc(doc(db, 'flowData', key));
            return true;
        } catch (error) {
            console.error('Error removing data from cloud:', error);
            return false;
        }
    }

    // Update data in Firestore
    async updateData(key, data) {
        try {
            await updateDoc(doc(db, 'flowData', key), { data: data, timestamp: new Date() });
            return true;
        } catch (error) {
            console.error('Error updating data in cloud:', error);
            return false;
        }
    }
}

// Create global instance
window.cloudStorage = new CloudStorage();
