// Dashboard Page JavaScript
class DashboardPage {
    constructor() {
        this.currentUser = null;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.selectedClass = null;
        this.classes = [];
        this.notifications = [];

        this.checkAuth();
        this.initializeDashboard();
        this.bindEvents();
    }

    // Check if user is authenticated
    checkAuth() {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = JSON.parse(savedUser);
    }

    // Initialize dashboard
    async initializeDashboard() {
        await this.loadDataFromCloud();
        this.updateUserWelcome();
        this.showRoleControls();
        this.updateCalendarHeader();
        this.renderCalendar();
        this.renderUserClasses();
        this.renderNotifications();
    }

    // Load all data from cloud storage
    async loadDataFromCloud() {
        try {
            this.classes = await this.loadClasses();
            this.notifications = await this.loadNotifications();
        } catch (error) {
            console.error('Error loading data from cloud:', error);
            this.classes = [];
            this.notifications = [];
        }
    }

    // Show controls based on user role
    showRoleControls() {
        if (this.currentUser.isAdmin) {
            document.getElementById('adminControls').style.display = 'block';
        } else if (this.currentUser.role === 'teacher') {
            document.getElementById('teacherControls').style.display = 'block';
        }
        // Students don't have special controls - they just see their classes with cancel buttons
    }

    // Bind event listeners
    bindEvents() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Admin controls
        if (this.currentUser.isAdmin) {
            document.getElementById('addUserBtn').addEventListener('click', () => {
                window.location.href = 'adduser.html';
            });

            document.getElementById('editAccountBtn').addEventListener('click', () => {
                window.location.href = 'account.html';
            });
        }

        // Teacher controls
        if (this.currentUser.role === 'teacher') {
            document.getElementById('addClassBtn').addEventListener('click', () => {
                this.showModal('addClassModal');
            });

            document.getElementById('addStudentBtn').addEventListener('click', () => {
                window.location.href = 'adduser.html';
            });
        }

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

        // Add class form (only for teachers and admin)
        if (this.currentUser.isAdmin || this.currentUser.role === 'teacher') {
            document.getElementById('addClassForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddClass();
            });
        }

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideModal('addClassModal');
        });

        document.getElementById('cancelClass').addEventListener('click', () => {
            this.hideModal('addClassModal');
        });

        // Test notification button
        document.getElementById('testNotificationBtn').addEventListener('click', () => {
            this.testNotification();
        });
    }

    // Update user welcome message
    updateUserWelcome() {
        document.getElementById('userName').textContent = this.currentUser.username;
    }

    // Handle adding a class (for teachers)
    async handleAddClass() {
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
            studentId: null, // Will be assigned when a student is added
            createdBy: this.currentUser.id
        };

        // Add to classes array
        this.classes.push(newClass);
        await this.saveClasses();

        // Create notification for admin
        this.createNotification('admin', 'new_class', {
            teacher: this.currentUser.username,
            className: name,
            date: date,
            hour: hour
        });

        // Update UI
        this.renderCalendar();
        this.renderUserClasses();
        await this.renderNotifications();
        this.hideModal('addClassModal');

        // Clear form
        document.getElementById('addClassForm').reset();

        this.showMessage('Class created successfully!', 'success');
    }

    // Cancel class (for all users)
    async cancelClass(classId) {
        const cls = this.classes.find(c => c.id === classId);
        if (!cls) return;

        const classTime = new Date(cls.date + ' ' + cls.hour);
        const now = new Date();
        const hoursUntilClass = (classTime - now) / (1000 * 60 * 60);

        // 3-hour rule: Can only cancel if class is MORE than 3 hours away
        if (hoursUntilClass <= 3) {
            this.showMessage('Classes can only be cancelled if they are more than 3 hours before the start time.', 'error');
            return;
        }

        // Check if user has permission to cancel this class
        let canCancel = false;
        if (this.currentUser.isAdmin) {
            canCancel = true;
        } else if (this.currentUser.role === 'teacher' && cls.createdBy === this.currentUser.id) {
            canCancel = true;
        } else if (this.currentUser.role === 'student' && cls.studentId === this.currentUser.id) {
            canCancel = true;
        }

        if (!canCancel) {
            this.showMessage('You do not have permission to cancel this class.', 'error');
            return;
        }

        if (confirm(`Are you sure you want to cancel the class "${cls.name}"? This will permanently delete the class from the system.`)) {
            // Completely remove the class from the system (cloud/localStorage)
            this.classes = this.classes.filter(c => c.id !== classId);
            await this.saveClasses();

            // Create notification for admin
            this.createNotification('admin', 'class_cancelled', {
                cancelledBy: this.currentUser.username,
                className: cls.name,
                date: cls.date,
                hour: cls.hour,
                teacher: cls.teacher
            });

            // Find teacher and notify them (if they didn't cancel it themselves)
            const teacher = this.findUserById(cls.createdBy);
            if (teacher && teacher.id !== this.currentUser.id) {
                this.createNotification(teacher.id, 'class_cancelled', {
                    cancelledBy: this.currentUser.username,
                    className: cls.name,
                    date: cls.date,
                    hour: cls.hour,
                    teacher: cls.teacher
                });
            }

            // Notify student if they didn't cancel it themselves and were assigned to this class
            if (cls.studentId && cls.studentId !== this.currentUser.id) {
                this.createNotification(cls.studentId, 'class_cancelled', {
                    cancelledBy: this.currentUser.username,
                    className: cls.name,
                    date: cls.date,
                    hour: cls.hour,
                    teacher: cls.teacher
                });
            }

            this.renderUserClasses();
            this.renderNotifications();
            this.showMessage('Class cancelled and permanently deleted from the system!', 'success');
        }
    }

    // Select a class (for students)
    selectClass(classId) {
        this.selectedClass = this.classes.find(c => c.id === classId);
        document.getElementById('cancelClassBtn').disabled = false;
    }

    // Create notification
    async createNotification(userId, type, data) {
        const notification = {
            id: Date.now().toString(),
            userId: userId,
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            read: false
        };

        this.notifications.push(notification);
        await this.saveNotifications();
        
        // Debug logging
        console.log('Notification created for user:', userId, 'Type:', type, 'Data:', data);
        console.log('Current user ID:', this.currentUser.id);
        console.log('Total notifications:', this.notifications.length);
        
        // Force reload and render notifications immediately
        await this.renderNotifications();
    }

    // Test notification function (for debugging)
    testNotification() {
        this.createNotification(this.currentUser.id, 'test', {
            message: 'This is a test notification',
            timestamp: new Date().toISOString()
        });
    }

    // Render notifications
    async renderNotifications() {
        const container = document.getElementById('notificationsList');
        
        // Reload notifications from cloud storage to get the latest ones
        this.notifications = await this.loadNotifications();
        
        const userNotifications = this.notifications.filter(n => {
            // Admin sees all admin notifications and their own
            if (this.currentUser.isAdmin && n.userId === 'admin') {
                return true;
            }
            // All users see their own notifications
            if (n.userId === this.currentUser.id) {
                return true;
            }
            return false;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (userNotifications.length === 0) {
            container.innerHTML = '<p class="no-notifications">No notifications</p>';
            return;
        }

        container.innerHTML = userNotifications.map(notification => {
            let message = '';
            let icon = 'fas fa-bell';

            switch (notification.type) {
                case 'new_class':
                    message = `New class "${notification.data.className}" created by ${notification.data.teacher} on ${this.formatDate(notification.data.date)} at ${notification.data.hour}`;
                    icon = 'fas fa-plus-circle';
                    break;
                case 'class_cancelled':
                    message = `Class "${notification.data.className}" (taught by ${notification.data.teacher}) cancelled by ${notification.data.cancelledBy} on ${this.formatDate(notification.data.date)} at ${notification.data.hour}`;
                    icon = 'fas fa-times-circle';
                    break;
                default:
                    message = 'New notification';
            }

            return `
                <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                    <div class="notification-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <p>${message}</p>
                        <small>${this.formatNotificationTime(notification.timestamp)}</small>
                    </div>
                    ${!notification.read ? '<div class="notification-badge"></div>' : ''}
                </div>
            `;
        }).join('');
    }

    // Format notification time
    formatNotificationTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        return `${days} days ago`;
    }

    // Find user by ID
    async findUserById(userId) {
        const users = await this.loadUsers();
        return users.find(u => u.id === userId);
    }

    // Load users from cloud storage
    async loadUsers() {
        const users = await window.cloudStorage.loadData('flowUsers');
        return users || [];
    }

    // Load notifications from cloud storage
    async loadNotifications() {
        const notifications = await window.cloudStorage.loadData('flowNotifications');
        return notifications || [];
    }

    // Save notifications to cloud storage
    async saveNotifications() {
        try {
            const result = await window.cloudStorage.saveData('flowNotifications', this.notifications);
            return result;
        } catch (error) {
            console.error('Error saving notifications to cloud:', error);
            return false;
        }
    }

    // Render user classes
    renderUserClasses() {
        const container = document.getElementById('userClasses');
        let userClasses = [];

        if (this.currentUser.isAdmin) {
            // Admin sees all classes
            userClasses = this.classes;
        } else if (this.currentUser.role === 'teacher') {
            // Teachers see classes they created
            userClasses = this.classes.filter(cls => cls.createdBy === this.currentUser.id);
        } else {
            // Students see their assigned classes
            userClasses = this.classes.filter(cls => cls.studentId === this.currentUser.id);
        }

        if (userClasses.length === 0) {
            container.innerHTML = '<p class="no-classes">No classes scheduled.</p>';
            return;
        }

        // Sort classes by date and time
        userClasses.sort((a, b) => new Date(a.date + ' ' + a.hour) - new Date(b.date + ' ' + b.hour));

        container.innerHTML = userClasses.map(cls => {
            const classTime = new Date(cls.date + ' ' + cls.hour);
            const now = new Date();
            const hoursUntilClass = (classTime - now) / (1000 * 60 * 60);
            // 3-hour rule: Can only cancel if class is MORE than 3 hours away
            const canCancel = hoursUntilClass > 3;
            
            // Determine who can cancel this class
            let canUserCancel = false;
            if (this.currentUser.isAdmin) {
                canUserCancel = true; // Admin can cancel any class
            } else if (this.currentUser.role === 'teacher' && cls.createdBy === this.currentUser.id) {
                canUserCancel = true; // Teacher can cancel their own classes
            } else if (this.currentUser.role === 'student' && cls.studentId === this.currentUser.id) {
                canUserCancel = true; // Student can cancel their assigned classes
            }

            return `
                <div class="class-card" data-class-id="${cls.id}">
                    <div class="class-info">
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
                    <div class="class-actions">
                        ${canUserCancel ? `
                            <button class="btn-cancel" data-class-id="${cls.id}" ${!canCancel ? 'disabled' : ''}>
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        ` : ''}
                        ${!canCancel && canUserCancel ? `
                            <span class="cancel-disabled">Cannot cancel (less than 3 hours)</span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for cancel buttons
        container.querySelectorAll('.btn-cancel').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const classId = button.dataset.classId;
                this.cancelClass(classId);
            });
        });
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
        
        // Remove calendar click events - calendar is read-only on dashboard
        // Calendar clicks are only used when creating new accounts
    }

    // Check if date has classes
    hasClassOnDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        if (this.currentUser.isAdmin) {
            return this.classes.some(cls => cls.date === dateStr);
        } else if (this.currentUser.role === 'teacher') {
            return this.classes.some(cls => cls.date === dateStr && cls.createdBy === this.currentUser.id);
        } else {
            return this.classes.some(cls => cls.date === dateStr && cls.studentId === this.currentUser.id);
        }
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

// Initialize the dashboard page when the page loads
let dashboardPage;
document.addEventListener('DOMContentLoaded', async () => {
    dashboardPage = new DashboardPage();
    await dashboardPage.initializeDashboard();
}); 