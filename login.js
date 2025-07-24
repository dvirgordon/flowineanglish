// Login Page JavaScript
class LoginPage {
    constructor() {
        this.users = [];
        this.bindEvents();
    }

    // Bind event listeners
    bindEvents() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    // Handle user login
    handleLogin() {
        const username = document.getElementById('username').value;
        const code = document.getElementById('code').value;

        if (username === 'tamar' && code === '4378') {
            const user = { username: 'tamar', isAdmin: true, role: 'admin' };
            localStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'dashboard.html';
        } else {
            const user = this.users.find(u => u.username === username && u.code === code);
            if (user) {
                // Ensure user has a role property
                if (!user.role) {
                    user.role = 'student'; // Default to student for existing users
                }
                localStorage.setItem('currentUser', JSON.stringify(user));
                window.location.href = 'dashboard.html';
            } else {
                this.showMessage('Invalid username or code. Please try again.', 'error');
            }
        }
        document.getElementById('loginForm').reset();
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

    // Load users from cloud storage
    async loadUsers() {
        const users = await window.cloudStorage.loadData('flowUsers');
        return users || [];
    }
}

// Initialize the login page when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const loginPage = new LoginPage();
    loginPage.users = await loginPage.loadUsers();
}); 