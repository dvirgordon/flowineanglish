// Add User Page JavaScript
class AddUserPage {
    constructor() {
        this.users = [];
        this.classes = [];
        this.currentDate = new Date();
        this.selectedDate = null;
        this.newUser = null;
        this.selectedClasses = [];
        
        this.checkAuth();
        this.initializeCalendar();
        this.bindEvents();
    }

    // Check if user is authenticated and is admin
    checkAuth() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) {
            window.location.href = 'login.html';
            return;
        }
        const user = JSON.parse(savedUser);
        if (!user.isAdmin) {
            window.location.href = 'dashboard.html';
            return;
        }
    }

    // Initialize calendar
    async initializeCalendar() {
        await this.loadDataFromCloud();
        this.updateCalendarHeader();
        this.renderCalendar();
    }

    // Load all data from cloud storage
    async loadDataFromCloud() {
        try {
            this.users = await this.loadUsers();
            this.classes = await this.loadClasses();
        } catch (error) {
            console.error('Error loading data from cloud:', error);
            this.users = [];
            this.classes = [];
        }
    }

    // Bind event listeners
    bindEvents() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Back to dashboard button
        document.getElementById('backToDashboardBtn').addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });

        // Add user form (Step 1)
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserInfo();
        });

        // Back to user info button
        document.getElementById('backToUserInfo').addEventListener('click', () => {
            this.showStep('userInfoStep');
        });

        // Create user button
        document.getElementById('createUserBtn').addEventListener('click', () => {
            this.createUserWithClasses();
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

        // Modal events
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
    }

    // Handle user information (Step 1)
    handleUserInfo() {
        const username = document.getElementById('newUsername').value;
        const code = document.getElementById('newCode').value;
        const role = document.getElementById('userRole').value;

        // Check if user already exists
        if (this.users.find(u => u.username === username)) {
            this.showMessage('User already exists. Please choose a different username.', 'error');
            return;
        }

        // Store new user info
        this.newUser = {
            id: Date.now().toString(),
            username: username,
            code: code,
            role: role,
            isAdmin: false
        };

        // Update UI
        document.getElementById('newUserName').textContent = username;
        document.getElementById('modalUserName').textContent = username;

        // If creating a teacher, skip class creation
        if (role === 'teacher') {
            this.createUserWithClasses();
        } else {
            // Move to next step for students
            this.showStep('calendarStep');
        }
    }

    // Handle adding a class
    handleAddClass() {
        const date = document.getElementById('classDate').value;
        const hour = document.getElementById('classHour').value;
        const teacher = document.getElementById('classTeacher').value;
        const location = document.getElementById('classLocation').value;
        const name = document.getElementById('className').value;

        // Create new class
        const newClass = {
            id: Date.now().toString(),
            date: date,
            hour: hour,
            teacher: teacher,
            location: location,
            name: name,
            studentId: this.newUser.id
        };

        // Add to selected classes
        this.selectedClasses.push(newClass);

        // Update UI
        this.renderSelectedClasses();
        this.renderCalendar();
        this.hideModal('addClassModal');

        // Clear form
        document.getElementById('addClassForm').reset();
        document.getElementById('classDate').value = this.selectedDate;

        this.showMessage('Class added successfully!', 'success');
    }

    // Create user with classes
    async createUserWithClasses() {
        if (!this.newUser) {
            this.showMessage('Please complete user information first.', 'error');
            return;
        }

        try {
            // Show loading message
            this.showMessage('Creating user and uploading to cloud...', 'success');

            // Add user to users array
            this.users.push(this.newUser);
            const userSaved = await this.saveUsers();
            
            if (!userSaved) {
                this.showMessage('Failed to save user to cloud. Please try again.', 'error');
                return;
            }

            // Add classes to classes array (if any)
            if (this.selectedClasses.length > 0) {
                this.classes.push(...this.selectedClasses);
                const classesSaved = await this.saveClasses();
                
                if (!classesSaved) {
                    this.showMessage('User created but failed to save classes to cloud. Please try again.', 'error');
                    return;
                }
            }

            // Success message with cloud confirmation and login instructions
            this.showMessage(`✅ User "${this.newUser.username}" successfully created and uploaded to cloud with ${this.selectedClasses.length} classes! They can now login from any device using username: "${this.newUser.username}" and code: "${this.newUser.code}".`, 'success');
            
            // Show login instructions
            setTimeout(() => {
                this.showMessage(`💡 Login Instructions: Go to login page and use Username: "${this.newUser.username}" and Code: "${this.newUser.code}"`, 'info');
            }, 2000);
            
            // Redirect back to dashboard after a longer delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 5000);
            
        } catch (error) {
            console.error('Error creating user:', error);
            this.showMessage('Failed to create user. Please check your internet connection and try again.', 'error');
        }
    }

    // Show specific step
    showStep(stepId) {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(stepId).classList.add('active');
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
        return this.selectedClasses.some(cls => cls.date === dateStr);
    }

    // Select a date
    selectDate(dateStr) {
        this.selectedDate = dateStr;
        document.getElementById('classDate').value = dateStr;
        this.showModal('addClassModal');
    }

    // Render selected classes
    renderSelectedClasses() {
        const container = document.getElementById('selectedClasses');
        
        if (this.selectedClasses.length === 0) {
            container.innerHTML = '<p class="no-classes">No classes selected yet. Click on calendar dates to add classes.</p>';
            return;
        }

        // Sort classes by date and time
        this.selectedClasses.sort((a, b) => new Date(a.date + ' ' + a.hour) - new Date(b.date + ' ' + b.hour));

        container.innerHTML = this.selectedClasses.map((cls, index) => `
            <div class="selected-class-item">
                <div class="selected-class-info">
                    <h4>${cls.name}</h4>
                    <p><i class="fas fa-calendar"></i> ${this.formatDate(cls.date)}</p>
                    <p><i class="fas fa-clock"></i> ${cls.hour}</p>
                    <p><i class="fas fa-chalkboard-teacher"></i> ${cls.teacher}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${cls.location}</p>
                </div>
                <button class="remove-class-btn" onclick="addUserPage.removeClass(${index})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `).join('');
    }

    // Remove class from selected classes
    removeClass(index) {
        this.selectedClasses.splice(index, 1);
        this.renderSelectedClasses();
        this.renderCalendar();
        this.showMessage('Class removed from selection.', 'success');
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

        // Insert message at the top of the page
        const container = document.querySelector('.container');
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
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
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

// Initialize the add user page when the page loads
let addUserPage;
document.addEventListener('DOMContentLoaded', async () => {
    addUserPage = new AddUserPage();
    await addUserPage.initializeCalendar();
}); 