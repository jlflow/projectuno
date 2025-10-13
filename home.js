// Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
    // Get current user
    const user = getCurrentUser();
    
    if (user) {
        console.log('Logged in as:', user.name);
        console.log('Email:', user.email);
    }

    // Add your dashboard functionality here
    // Example: Load user data, initialize components, etc.
});

// Example: Add more functions for your dashboard
function loadUserData() {
    const user = getCurrentUser();
    if (user) {
        // Do something with user data
        console.log('Loading data for:', user.name);
    }
}