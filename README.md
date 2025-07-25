# Flow - English Teaching Platform

A modern web application for managing English teaching classes and students. Built with HTML, CSS, and JavaScript.

## Features

### For Teachers (Admin)
- **Secure Login**: Access with username "tamar" and code "4378"
- **User Management**: Create new student accounts with unique usernames and codes
- **Calendar Management**: Interactive calendar to schedule and manage classes
- **Class Scheduling**: Add classes with detailed information (date, time, teacher, location, name)

### For Students
- **Easy Access**: Login with username and code provided by the teacher
- **Class View**: See all scheduled classes in a clean, organized format
- **Class Details**: View date, time, teacher, and location for each class

## How to Use

### Getting Started
1. Open `index.html` in a web browser
2. The app will load with a beautiful login screen

### For Teachers (Tamar)
1. **Login**: Enter username "tamar" and code "4378"
2. **Admin Dashboard**: You'll see two options:
   - **See Your Calendar**: View and manage the class calendar
   - **Add User**: Create new student accounts

#### Adding Students
1. Click "Add User" from the admin dashboard
2. Enter a username and code for the new student
3. Click "Create User" - the student can now login with these credentials

#### Managing Classes
1. Click "See Your Calendar" from the admin dashboard
2. Navigate through months using the arrow buttons
3. Click on any date to add a class
4. Fill in the class details:
   - **Date**: Automatically set to the selected date
   - **Hour**: Time of the class
   - **Teacher**: Name of the teacher
   - **Location**: Where the class takes place
   - **Name**: Name/title of the class
5. Click "Create Class" to save

### For Students
1. **Login**: Enter the username and code provided by your teacher
2. **View Classes**: See all your scheduled classes listed with details
3. **Class Information**: Each class shows:
   - Class name
   - Date and time
   - Teacher name
   - Location

## Technical Details

### Storage
- Uses Firebase Firestore for cloud data persistence
- All data is stored securely in the cloud
- Data syncs across all devices and users
- Automatic backup and data recovery

### Security
- Simple authentication system with username/code pairs
- Admin access restricted to specific credentials
- Student access limited to their own classes

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Modern, clean interface with smooth animations
- Professional color scheme and typography

## File Structure
```
flow-app/
├── index.html      # Main HTML structure
├── style.css       # Styling and responsive design
├── app.js          # JavaScript functionality
└── README.md       # This file
```

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- No external dependencies except Font Awesome icons

## Firebase Setup Instructions

### Prerequisites
1. Create a Firebase account at [https://firebase.google.com](https://firebase.google.com)
2. Create a new Firebase project

### Setup Steps
1. **Enable Firestore Database**:
   - Go to your Firebase project console
   - Navigate to "Firestore Database"
   - Click "Create Database"
   - Choose "Start in test mode" for development

2. **Get Firebase Configuration**:
   - Go to Project Settings (gear icon)
   - Scroll down to "Your apps" section
   - Click "Add app" and choose "Web"
   - Register your app and copy the configuration

3. **Update Configuration**:
   - Open `firebace.js` file
   - Replace the placeholder configuration with your actual Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

4. **Security Rules** (Optional):
   - In Firestore Database, go to "Rules" tab
   - Update rules for production use:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /flowData/{document} {
         allow read, write: if true; // For development
       }
     }
   }
   ```

## Future Enhancements
- Email notifications for class reminders
- Multiple teacher support
- Class attendance tracking
- Payment integration
- Mobile app version

## Support
For questions or issues, please contact the development team.

---

**Flow English Teaching Platform** - Making English education management simple and efficient. 

## ✅ **Loading Screen Timing is Already Correct**

The loading screen:
1. **Appears immediately** when login is submitted
2. **Shows for exactly 1 second** (1000 milliseconds)
3. **Automatically transitions** to the appropriate dashboard

### **Current Flow:**
1. User enters username and code
2. Clicks "Enter" button
3. Login form fades out immediately
4. Loading screen appears with animated graduation cap
5. After exactly 1 second, loading screen disappears
6. User is taken to their dashboard (admin or student)

The timing is already set to exactly one second as you requested! The loading screen provides a nice visual transition and gives users feedback that their login is being processed. 🎉 "# flowineanglish" 
