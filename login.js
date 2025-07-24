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

        // Add refresh button if it exists
        const refreshBtn = document.getElementById('refreshUsersBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshUsers();
            });
        }

        // Add test user button if it exists
        const testUserBtn = document.getElementById('testUserBtn');
        if (testUserBtn) {
            testUserBtn.addEventListener('click', () => {
                this.testUserCreation();
            });
        }
    }

    // Handle user login
    async handleLogin() {
        const username = document.getElementById('username').value;
        const code = document.getElementById('code').value;

        // Show loading message
        this.showMessage('Logging in...', 'info');

        try {
            // Reload users from cloud to get the latest data
            this.users = await this.loadUsers();
            console.log('Loaded users from cloud:', this.users);

            if (username === 'tamar' && code === '4378') {
                const user = { username: 'tamar', isAdmin: true, role: 'admin' };
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.showMessage('Welcome back, Tamar!', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                const user = this.users.find(u => u.username === username && u.code === code);
                if (user) {
                    // Ensure user has a role property
                    if (!user.role) {
                        user.role = 'student'; // Default to student for existing users
                    }
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    this.showMessage(`Welcome back, ${user.username}!`, 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    this.showMessage('Invalid username or code. Please try again.', 'error');
                    console.log('Available users:', this.users.map(u => ({ username: u.username, hasCode: !!u.code })));
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage('Login failed. Please check your connection and try again.', 'error');
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
        try {
            const users = await window.cloudStorage.loadData('flowUsers');
            console.log('Users loaded from cloud:', users);
            return users || [];
        } catch (error) {
            console.error('Error loading users from cloud:', error);
            return [];
        }
    }

    // Refresh users from cloud
    async refreshUsers() {
        try {
            this.showMessage('Refreshing users from cloud...', 'info');
            this.users = await this.loadUsers();
            this.showMessage(`Loaded ${this.users.length} users from cloud`, 'success');
            console.log('Users refreshed:', this.users);
            
            // Debug: Show user details in console
            if (this.users.length > 0) {
                console.log('Available users for login:');
                this.users.forEach(user => {
                    console.log(`- Username: "${user.username}", Code: "${user.code}", Role: "${user.role}"`);
                });
            }
        } catch (error) {
            console.error('Error refreshing users:', error);
            this.showMessage('Failed to refresh users. Please try again.', 'error');
        }
    }

    // Debug function to test user creation
    async testUserCreation() {
        try {
            const testUser = {
                id: Date.now().toString(),
                username: 'testuser',
                code: '1234',
                role: 'student',
                isAdmin: false
            };
            
            // Load current users
            let users = await this.loadUsers();
            users.push(testUser);
            
            // Save to cloud
            await window.cloudStorage.saveData('flowUsers', users);
            
            this.showMessage('Test user created successfully!', 'success');
            console.log('Test user created:', testUser);
            
            // Refresh users list
            await this.refreshUsers();
        } catch (error) {
            console.error('Error creating test user:', error);
            this.showMessage('Failed to create test user.', 'error');
        }
    }
}

// Initialize the login page when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const loginPage = new LoginPage();
    loginPage.users = await loginPage.loadUsers();
}); 