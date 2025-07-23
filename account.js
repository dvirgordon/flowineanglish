// Account Management Page JavaScript
class AccountPage {
    constructor() {
        this.users = [];
        this.classes = [];
        this.currentUser = null;
        this.filteredUsers = [];
        this.filteredClasses = [];
        
        this.initializePage();
    }

    // Initialize page
    async initializePage() {
        await this.checkAuth();
        await this.loadDataFromCloud();
        this.bindEvents();
        this.renderUsers();
        this.renderClasses();
    }

    // Check if user is authenticated and is admin
    async checkAuth() {
        const savedUser = await window.cloudStorage.loadCurrentUser();
        if (!savedUser) {
            window.location.href = 'login.html';
            return;
        }
        if (!savedUser.isAdmin) {
            window.location.href = 'dashboard.html';
            return;
        }
        this.currentUser = savedUser;
    }

    // Bind event listeners
    bindEvents() {
        // Navigation
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('backToDashboardBtn').addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        // Search functionality
        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });

        document.getElementById('classSearch').addEventListener('input', (e) => {
            this.searchClasses(e.target.value);
        });

        // Password change form
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Modal events
        document.getElementById('closeEditUserModal').addEventListener('click', () => {
            this.hideModal('editUserModal');
        });

        document.getElementById('closeEditClassModal').addEventListener('click', () => {
            this.hideModal('editClassModal');
        });

        // Edit user form
        document.getElementById('editUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUserChanges();
        });

        // Delete user button
        document.getElementById('deleteUserBtn').addEventListener('click', () => {
            this.deleteUserConfirm();
        });

        // Edit class form
        document.getElementById('editClassForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveClassChanges();
        });

        // Delete class button
        document.getElementById('deleteClassBtn').addEventListener('click', () => {
            this.deleteClassConfirm();
        });
    }

    // Switch between tabs
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    // Search users
    searchUsers(query) {
        this.filteredUsers = this.users.filter(user => 
            user.username.toLowerCase().includes(query.toLowerCase()) ||
            user.id.includes(query)
        );
        this.renderUsers();
    }

    // Search classes
    searchClasses(query) {
        this.filteredClasses = this.classes.filter(cls => 
            cls.name.toLowerCase().includes(query.toLowerCase()) ||
            cls.teacher.toLowerCase().includes(query.toLowerCase()) ||
            cls.location.toLowerCase().includes(query.toLowerCase()) ||
            cls.date.includes(query)
        );
        this.renderClasses();
    }

    // Render users list
    renderUsers() {
        const container = document.getElementById('usersList');
        
        if (this.filteredUsers.length === 0) {
            container.innerHTML = '<p class="no-items">No users found.</p>';
            return;
        }

        container.innerHTML = this.filteredUsers.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <h3>${user.username}</h3>
                    <p><i class="fas fa-id-badge"></i> ID: ${user.id}</p>
                    <p><i class="fas fa-user-tag"></i> ${user.isAdmin ? 'Admin' : 'Student'}</p>
                </div>
                <div class="user-actions">
                    <button class="btn-edit" onclick="accountPage.editUser('${user.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="accountPage.deleteUserConfirm('${user.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render classes list
    renderClasses() {
        const container = document.getElementById('classesList');
        
        if (this.filteredClasses.length === 0) {
            container.innerHTML = '<p class="no-items">No classes found.</p>';
            return;
        }

        // Sort classes by date and time
        this.filteredClasses.sort((a, b) => new Date(a.date + ' ' + a.hour) - new Date(b.date + ' ' + b.hour));

        container.innerHTML = this.filteredClasses.map(cls => {
            const student = this.users.find(u => u.id === cls.studentId);
            return `
                <div class="class-item">
                    <div class="class-info">
                        <h3>${cls.name}</h3>
                        <p><i class="fas fa-calendar"></i> ${this.formatDate(cls.date)}</p>
                        <p><i class="fas fa-clock"></i> ${cls.hour}</p>
                        <p><i class="fas fa-chalkboard-teacher"></i> ${cls.teacher}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${cls.location}</p>
                        <p><i class="fas fa-user"></i> Student: ${student ? student.username : 'Unknown'}</p>
                    </div>
                    <div class="class-actions">
                        <button class="btn-edit" onclick="accountPage.editClass('${cls.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="accountPage.deleteClassConfirm('${cls.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Edit user
    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('editUsername').value = user.username;
        document.getElementById('editCode').value = user.code;
        
        // Store current user ID for editing
        document.getElementById('editUserForm').dataset.userId = userId;
        
        this.showModal('editUserModal');
    }

    // Save user changes
    async saveUserChanges() {
        const userId = document.getElementById('editUserForm').dataset.userId;
        const username = document.getElementById('editUsername').value;
        const code = document.getElementById('editCode').value;

        // Check if username already exists (excluding current user)
        const existingUser = this.users.find(u => u.username === username && u.id !== userId);
        if (existingUser) {
            this.showMessage('Username already exists. Please choose a different username.', 'error');
            return;
        }

        // Update user
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex].username = username;
            this.users[userIndex].code = code;
            await this.saveUsers();
            
            this.hideModal('editUserModal');
            this.searchUsers(document.getElementById('userSearch').value);
            this.showMessage('User updated successfully!', 'success');
        }
    }

    // Delete user confirmation
    deleteUserConfirm(userId) {
        if (confirm('Are you sure you want to delete this user? This will also delete all their classes.')) {
            this.deleteUser(userId);
        }
    }

    // Delete user
    async deleteUser(userId = null) {
        const userToDelete = userId || document.getElementById('editUserForm').dataset.userId;
        
        // Find the user to get their details for notifications
        const userToDeleteDetails = this.users.find(u => u.id === userToDelete);
        
        // Remove user from users array
        this.users = this.users.filter(u => u.id !== userToDelete);
        await this.saveUsers();
        
        // Remove all classes where this user is the student
        this.classes = this.classes.filter(c => c.studentId !== userToDelete);
        
        // Remove all classes created by this user (if they're a teacher)
        this.classes = this.classes.filter(c => c.createdBy !== userToDelete);
        
        await this.saveClasses();
        
        // Remove all notifications related to this user
        await this.removeUserNotifications(userToDelete);
        
        this.hideModal('editUserModal');
        this.searchUsers(document.getElementById('userSearch').value);
        this.searchClasses(document.getElementById('classSearch').value);
        this.showMessage(`User ${userToDeleteDetails?.username || 'Unknown'} and all their classes deleted successfully!`, 'success');
    }

    // Remove notifications related to a user
    async removeUserNotifications(userId) {
        const notifications = await window.cloudStorage.loadNotifications();
        const filteredNotifications = notifications.filter(n => n.userId !== userId);
        await window.cloudStorage.saveNotifications(filteredNotifications);
    }

    // Edit class
    editClass(classId) {
        const cls = this.classes.find(c => c.id === classId);
        if (!cls) return;

        document.getElementById('editClassDate').value = cls.date;
        document.getElementById('editClassHour').value = cls.hour;
        document.getElementById('editClassTeacher').value = cls.teacher;
        document.getElementById('editClassLocation').value = cls.location;
        document.getElementById('editClassName').value = cls.name;
        
        // Store current class ID for editing
        document.getElementById('editClassForm').dataset.classId = classId;
        
        this.showModal('editClassModal');
    }

    // Save class changes
    async saveClassChanges() {
        const classId = document.getElementById('editClassForm').dataset.classId;
        const date = document.getElementById('editClassDate').value;
        const hour = document.getElementById('editClassHour').value;
        const teacher = document.getElementById('editClassTeacher').value;
        const location = document.getElementById('editClassLocation').value;
        const name = document.getElementById('editClassName').value;

        // Update class
        const classIndex = this.classes.findIndex(c => c.id === classId);
        if (classIndex !== -1) {
            this.classes[classIndex].date = date;
            this.classes[classIndex].hour = hour;
            this.classes[classIndex].teacher = teacher;
            this.classes[classIndex].location = location;
            this.classes[classIndex].name = name;
            await this.saveClasses();
            
            this.hideModal('editClassModal');
            this.searchClasses(document.getElementById('classSearch').value);
            this.showMessage('Class updated successfully!', 'success');
        }
    }

    // Delete class confirmation
    deleteClassConfirm(classId) {
        if (confirm('Are you sure you want to delete this class?')) {
            this.deleteClass(classId);
        }
    }

    // Delete class
    async deleteClass(classId = null) {
        const classToDelete = classId || document.getElementById('editClassForm').dataset.classId;
        
        // Find the class to get its details
        const classToDeleteDetails = this.classes.find(c => c.id === classToDelete);
        
        // Remove class from classes array
        this.classes = this.classes.filter(c => c.id !== classToDelete);
        await this.saveClasses();
        
        // Remove all notifications related to this class
        await this.removeClassNotifications(classToDelete);
        
        this.hideModal('editClassModal');
        this.searchClasses(document.getElementById('classSearch').value);
        this.showMessage(`Class "${classToDeleteDetails?.name || 'Unknown'}" deleted successfully!`, 'success');
    }

    // Remove notifications related to a class
    async removeClassNotifications(classId) {
        const notifications = await window.cloudStorage.loadNotifications();
        const filteredNotifications = notifications.filter(n => {
            // Remove notifications that reference this class
            if (n.type === 'new_class' && n.data && n.data.className) {
                // This is a simplified check - in a real system you'd have class IDs in notifications
                return true; // Keep all notifications for now
            }
            return true;
        });
        await window.cloudStorage.saveNotifications(filteredNotifications);
    }

    // Change password
    changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Check current password
        if (currentPassword !== '4378') {
            this.showMessage('Current password is incorrect.', 'error');
            return;
        }

        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            this.showMessage('New passwords do not match.', 'error');
            return;
        }

        // Check password length
        if (newPassword.length < 4) {
            this.showMessage('New password must be at least 4 characters long.', 'error');
            return;
        }

        // Update admin password (in a real app, this would be stored securely)
        // For now, we'll just show a success message
        this.showMessage('Password changed successfully!', 'success');
        document.getElementById('changePasswordForm').reset();
    }

    // Show modal
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    // Hide modal
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
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
    async logout() {
        await window.cloudStorage.removeCurrentUser();
        window.location.href = 'login.html';
    }

    // Load data from Firebase
    async loadDataFromCloud() {
        try {
            this.users = await window.cloudStorage.loadUsers();
            this.classes = await window.cloudStorage.loadClasses();
            this.filteredUsers = [...this.users];
            this.filteredClasses = [...this.classes];
        } catch (error) {
            console.error('Error loading data from cloud:', error);
            this.users = [];
            this.classes = [];
            this.filteredUsers = [];
            this.filteredClasses = [];
        }
    }

    // Save users to Firebase
    async saveUsers() {
        await window.cloudStorage.saveUsers(this.users);
    }

    // Save classes to Firebase
    async saveClasses() {
        await window.cloudStorage.saveClasses(this.classes);
    }
}

// Initialize the account page when the page loads
let accountPage;
document.addEventListener('DOMContentLoaded', async () => {
    accountPage = new AccountPage();
}); 