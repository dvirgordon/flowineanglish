// GitHub Users Utility for Flow App
// WARNING: Do NOT use a real token in production frontend code!

const GITHUB_REPO = 'your-username/your-repo'; // <-- CHANGE THIS
const GITHUB_USERS_PATH = 'users';

// Helper: Get GitHub API URL for a user file
function getUserFileUrl(username) {
    return `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_USERS_PATH}/${encodeURIComponent(username)}.json`;
}

// Check if user exists (returns SHA if exists, null if not)
async function githubUserExists(username, token) {
    const url = getUserFileUrl(username);
    const resp = await fetch(url, {
        headers: { Authorization: `token ${token}` }
    });
    if (resp.status === 200) {
        const data = await resp.json();
        return data.sha;
    }
    if (resp.status === 404) return null;
    throw new Error('GitHub API error: ' + resp.status);
}

// Create or update user file
async function githubSaveUser(username, userData, token) {
    const url = getUserFileUrl(username);
    const content = btoa(JSON.stringify(userData, null, 2));
    let sha = null;
    try {
        sha = await githubUserExists(username, token);
    } catch (e) {}
    const body = {
        message: `${sha ? 'Update' : 'Create'} user ${username}`,
        content,
        ...(sha ? { sha } : {})
    };
    const resp = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('Failed to save user file');
    return await resp.json();
}

// Fetch user file
async function githubFetchUser(username, token) {
    const url = getUserFileUrl(username);
    const resp = await fetch(url, {
        headers: { Authorization: `token ${token}` }
    });
    if (!resp.ok) throw new Error('User not found');
    const data = await resp.json();
    return JSON.parse(atob(data.content));
}

// Export for use in app
window.githubUsers = {
    githubUserExists,
    githubSaveUser,
    githubFetchUser
}; 