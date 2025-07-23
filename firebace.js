// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Cloud Storage Service
class CloudStorageService {
    constructor() {
        this.db = db;
    }

    // Save data to Firebase
    async saveData(collectionName, documentId, data) {
        try {
            await setDoc(doc(this.db, collectionName, documentId), data);
            console.log(`Data saved to ${collectionName}/${documentId}`);
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Load data from Firebase
    async loadData(collectionName, documentId) {
        try {
            const docRef = doc(this.db, collectionName, documentId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                console.log(`No data found in ${collectionName}/${documentId}`);
                return null;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }

    // Load all documents from a collection
    async loadAllData(collectionName) {
        try {
            const querySnapshot = await getDocs(collection(this.db, collectionName));
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error('Error loading all data:', error);
            return [];
        }
    }

    // Update data in Firebase
    async updateData(collectionName, documentId, data) {
        try {
            const docRef = doc(this.db, collectionName, documentId);
            await updateDoc(docRef, data);
            console.log(`Data updated in ${collectionName}/${documentId}`);
            return true;
        } catch (error) {
            console.error('Error updating data:', error);
            return false;
        }
    }

    // Delete data from Firebase
    async deleteData(collectionName, documentId) {
        try {
            await deleteDoc(doc(this.db, collectionName, documentId));
            console.log(`Data deleted from ${collectionName}/${documentId}`);
            return true;
        } catch (error) {
            console.error('Error deleting data:', error);
            return false;
        }
    }

    // Specific methods for Flow app data
    async saveUsers(users) {
        return await this.saveData('flowData', 'users', { users });
    }

    async loadUsers() {
        const data = await this.loadData('flowData', 'users');
        return data ? data.users : [];
    }

    async saveClasses(classes) {
        return await this.saveData('flowData', 'classes', { classes });
    }

    async loadClasses() {
        const data = await this.loadData('flowData', 'classes');
        return data ? data.classes : [];
    }

    async saveNotifications(notifications) {
        return await this.saveData('flowData', 'notifications', { notifications });
    }

    async loadNotifications() {
        const data = await this.loadData('flowData', 'notifications');
        return data ? data.notifications : [];
    }

    async saveCurrentUser(user) {
        return await this.saveData('flowData', 'currentUser', { user });
    }

    async loadCurrentUser() {
        const data = await this.loadData('flowData', 'currentUser');
        return data ? data.user : null;
    }

    async removeCurrentUser() {
        return await this.deleteData('flowData', 'currentUser');
    }
}

// Create global instance
window.cloudStorage = new CloudStorageService();

// Export for use in other modules
export { CloudStorageService, cloudStorage };
