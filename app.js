// Flow English Teaching App
class FlowApp {
    constructor() {
        this.currentUser = null;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.users = [];
        this.classes = [];
        
        this.initializeApp();
        this.bindEvents();
    }

    // Initialize the app
    async initializeApp() {
        // Load data from cloud storage
        await this.loadDataFromCloud();
        
        // Set current date for calendar
        this.updateCalendarHeader();
        this.renderCalendar();
        
        // Check if user is already logged in
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.showMainDashboard();
        }
    }

    // Load all data from cloud storage
    async loadDataFromCloud() {
        try {
            this.users = await this.loadUsers();
            this.classes = await this.loadClasses();
        } catch (error) {
            console.error('Error loading data from cloud:', error);
            // Fallback to empty arrays if cloud loading fails
            this.users = [];
            this.classes = [];
        }
    }

    // Bind all event listeners
    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Add user button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showScreen('addUserScreen');
        });

        // Add user form
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddUser();
        });

        // Back buttons
        document.getElementById('backToDashboardBtn').addEventListener('click', () => {
            this.showMainDashboard();
        });

        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.updateCalendarHeader();
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.updateCalendarHeader();
            this.renderCalendar();
        });

        // Add class functionality
        document.getElementById('addClassBtn').addEventListener('click', () => {
            this.showModal('addClassModal');
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideModal('addClassModal');
        });

        document.getElementById('cancelClass').addEventListener('click', () => {
            this.hideModal('addClassModal');
        });

        document.getElementById('addClassForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddClass();
        });

        // Logout buttons
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('logoutBtn2').addEventListener('click', () => {
            this.logout();
        });
    }

    // Handle user login
    handleLogin() {
        const username = document.getElementById('username').value;
        const code = document.getElementById('code').value;

        // Check if it's the admin (Tamar)
        if (username === 'tamar' && code === '4378') {
            this.currentUser = { username: 'tamar', isAdmin: true };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.showMainDashboard();
            this.showMessage('Welcome back, Tamar!', 'success');
        } else {
            // Check if it's a regular user
            const user = this.users.find(u => u.username === username && u.code === code);
            if (user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.showMainDashboard();
                this.showMessage(`Welcome back, ${user.username}!`, 'success');
            } else {
                this.showMessage('Invalid username or code. Please try again.', 'error');
            }
        }

        // Clear form
        document.getElementById('loginForm').reset();
    }

    // Handle adding a new user
    async handleAddUser() {
        const username = document.getElementById('newUsername').value;
        const code = document.getElementById('newCode').value;

        // Check if user already exists
        if (this.users.find(u => u.username === username)) {
            this.showMessage('User already exists. Please choose a different username.', 'error');
            return;
        }

        try {
            // Create new user
            const newUser = {
                id: Date.now().toString(),
                username: username,
                code: code,
                isAdmin: false
            };

            this.users.push(newUser);
            const userSaved = await this.saveUsers();
            
            if (userSaved) {
                this.showMessage(`✅ User "${username}" created successfully and uploaded to cloud! They can now login from any device.`, 'success');
            } else {
                this.showMessage('Failed to save user to cloud. Please try again.', 'error');
                return;
            }
            
            document.getElementById('addUserForm').reset();
            this.showMainDashboard();
        } catch (error) {
            console.error('Error creating user:', error);
            this.showMessage('Failed to create user. Please check your internet connection and try again.', 'error');
        }
    }

    // Handle adding a new class
    async handleAddClass() {
        const date = document.getElementById('classDate').value;
        const hour = document.getElementById('classHour').value;
        const teacher = document.getElementById('classTeacher').value;
        const location = document.getElementById('classLocation').value;
        const name = document.getElementById('className').value;

        try {
            // Create new class
            const newClass = {
                id: Date.now().toString(),
                date: date,
                hour: hour,
                teacher: teacher,
                location: location,
                name: name,
                studentId: this.currentUser.isAdmin ? null : this.currentUser.id
            };

            this.classes.push(newClass);
            const classSaved = await this.saveClasses();
            
            if (classSaved) {
                this.showMessage('✅ Class added successfully and uploaded to cloud!', 'success');
            } else {
                this.showMessage('Failed to save class to cloud. Please try again.', 'error');
                return;
            }
            
            document.getElementById('addClassForm').reset();
            this.hideModal('addClassModal');
            this.renderCalendar();
            this.renderUserClasses();
        } catch (error) {
            console.error('Error adding class:', error);
            this.showMessage('Failed to add class. Please check your internet connection and try again.', 'error');
        }
    }

    // Show main dashboard
    showMainDashboard() {
        this.showScreen('mainDashboard');
        this.updateUserWelcome();
        this.showAdminControls();
        this.renderUserClasses();
    }

    // Update user welcome message
    updateUserWelcome() {
        document.getElementById('userName').textContent = this.currentUser.username;
    }

    // Show admin controls if user is admin
    showAdminControls() {
        const adminControls = document.getElementById('adminControls');
        if (this.currentUser.isAdmin) {
            adminControls.style.display = 'block';
        } else {
            adminControls.style.display = 'none';
        }
    }

    // Render user classes
    renderUserClasses() {
        const container = document.getElementById('userClasses');
        
        let userClasses;
        if (this.currentUser.isAdmin) {
            // Admin sees all classes
            userClasses = this.classes;
        } else {
            // Regular users see only their classes
            userClasses = this.classes.filter(c => c.studentId === this.currentUser.id);
        }

        if (userClasses.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No classes scheduled yet.</p>';
            return;
        }

        // Sort classes by date and time
        userClasses.sort((a, b) => new Date(a.date + ' ' + a.hour) - new Date(b.date + ' ' + b.hour));

        container.innerHTML = userClasses.map(cls => `
            <div class="class-card">
                <h3>${cls.name}</h3>
                <div class="class-details">
                    <div class="class-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${this.formatDate(cls.date)}</span>
                    </div>
                    <div class="class-detail">
                        <i class="fas fa-clock"></i>
                        <span>${cls.hour}</span>
                    </div>
                    <div class="class-detail">
                        <i class="fas fa-chalkboard-teacher"></i>
                        <span>${cls.teacher}</span>
                    </div>
                    <div class="class-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${cls.location}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update calendar header
    updateCalendarHeader() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const month = monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        document.getElementById('currentMonth').textContent = `${month} ${year}`;
    }

    // Render calendar
    renderCalendar() {
        const container = document.getElementById('calendarDates');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = '';
        const today = new Date();
        
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = this.isSameDate(currentDate, today);
            const hasClass = this.hasClassOnDate(currentDate);
            
            let className = 'calendar-date';
            if (!isCurrentMonth) className += ' other-month';
            if (isToday) className += ' today';
            if (hasClass) className += ' has-class';
            
            html += `
                <div class="${className}" data-date="${currentDate.toISOString().split('T')[0]}">
                    ${currentDate.getDate()}
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Add click events to calendar dates
        container.querySelectorAll('.calendar-date').forEach(dateEl => {
            dateEl.addEventListener('click', () => {
                this.selectDate(dateEl.dataset.date);
            });
        });
    }

    // Check if date has classes
    hasClassOnDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        if (this.currentUser.isAdmin) {
            return this.classes.some(cls => cls.date === dateStr);
        } else {
            return this.classes.some(cls => cls.date === dateStr && cls.studentId === this.currentUser.id);
        }
    }

    // Select a date
    selectDate(dateStr) {
        this.selectedDate = dateStr;
        document.getElementById('classDate').value = dateStr;
        this.showModal('addClassModal');
    }

    // Check if two dates are the same
    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    // Format date for display
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Show a specific screen
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // Show modal
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    // Hide modal
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    // Show message
    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        // Insert message at the top of the current screen
        const currentScreen = document.querySelector('.screen.active');
        const container = currentScreen.querySelector('.container');
        container.insertBefore(messageEl, container.firstChild);

        // Auto-remove message after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }

    // Logout
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        
        // Reset login form
        const loginForm = document.getElementById('loginFormContainer');
        loginForm.classList.remove('hidden');
        
        this.showScreen('loginScreen');
        this.showMessage('Logged out successfully!', 'success');
    }

    // Load users from cloud storage
    async loadUsers() {
        const users = await window.cloudStorage.loadData('flowUsers');
        return users || [];
    }

    // Save users to cloud storage
    async saveUsers() {
        try {
            const result = await window.cloudStorage.saveData('flowUsers', this.users);
            return result;
        } catch (error) {
            console.error('Error saving users to cloud:', error);
            return false;
        }
    }

    // Load classes from cloud storage
    async loadClasses() {
        const classes = await window.cloudStorage.loadData('flowClasses');
        return classes || [];
    }

    // Save classes to cloud storage
    async saveClasses() {
        try {
            const result = await window.cloudStorage.saveData('flowClasses', this.classes);
            return result;
        } catch (error) {
            console.error('Error saving classes to cloud:', error);
            return false;
        }
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const app = new FlowApp();
    await app.initializeApp();
});
