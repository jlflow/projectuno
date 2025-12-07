// Authentication check - Add this to home.html, habits.html, health.html
(function() {
    // Check if user is logged in
    const currentUser = localStorage.getItem('sanctiflow_currentUser');
    
    if (!currentUser) {
        // No user logged in, redirect to login page
        window.location.href = 'index.html';
        return;
    }

    // Parse user data
    const user = JSON.parse(currentUser);
    
    // Display user name when page loads (if element exists)
    document.addEventListener('DOMContentLoaded', () => {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement && user.name) {
            userNameElement.textContent = user.name;
        }
    });
})();

// Logout function - call this when user clicks logout button
function logout() {
    localStorage.removeItem('sanctiflow_currentUser');
    window.location.href = 'index.html';
}

// Get current user data (use this anywhere in your app)
function getCurrentUser() {
    const currentUser = localStorage.getItem('sanctiflow_currentUser');
    return currentUser ? JSON.parse(currentUser) : null;
}