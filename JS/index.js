// Get elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const errorMsg = document.getElementById('error-message');
const successMsg = document.getElementById('success-message');

// Switch between forms
showSignup.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    clearMessages();
});

showLogin.addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    clearMessages();
});

// Helper functions
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    successMsg.style.display = 'none';
}

function showSuccess(message) {
    successMsg.textContent = message;
    successMsg.style.display = 'block';
    errorMsg.style.display = 'none';
}

function clearMessages() {
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
}

// Get all users from localStorage
function getUsers() {
    const usersJSON = localStorage.getItem('sanctiflow_users');
    return usersJSON ? JSON.parse(usersJSON) : {};
}

// Save user to localStorage
function saveUser(email, password, name) {
    const users = getUsers();
    users[email] = {
        email: email,
        password: password,
        name: name,
        loginMethod: 'email'
    };
    localStorage.setItem('sanctiflow_users', JSON.stringify(users));
}

// Set current logged-in user
function setCurrentUser(email, name) {
    const currentUser = {
        email: email,
        name: name,
        loggedIn: true,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('sanctiflow_currentUser', JSON.stringify(currentUser));
}

// Login form submission
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const users = getUsers();
    const user = users[email];

    if (!user) {
        showError('No account found with this email. Please sign up first.');
        return;
    }

    if (user.password !== password) {
        showError('Incorrect password. Please try again.');
        return;
    }

    // Successful login
    setCurrentUser(email, user.name);
    showSuccess('Login successful! Redirecting...');
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1500);
});

// Signup form submission
document.getElementById('signupForm').addEventListener('submit', (e) => {
    e.preventDefault();
    clearMessages();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (password !== confirm) {
        showError('Passwords do not match.');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    const users = getUsers();
    if (users[email]) {
        showError('An account with this email already exists. Please login.');
        return;
    }

    // Save user
    saveUser(email, password, name);
    showSuccess('Account created successfully! Redirecting to login...');
    
    setTimeout(() => {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        document.getElementById('login-email').value = email;
        clearMessages();
    }, 1500);
});

// Google login (simulated)
document.getElementById('google-login-btn').addEventListener('click', () => {
    clearMessages();
    // Simulate Google login
    const googleEmail = 'user@gmail.com';
    const googleName = 'Google User';
    setCurrentUser(googleEmail, googleName);
    showSuccess('Google login successful! Redirecting...');
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1500);
});

document.getElementById('google-signup-btn').addEventListener('click', () => {
    clearMessages();
    // Simulate Google signup
    const googleEmail = 'user@gmail.com';
    const googleName = 'Google User';
    setCurrentUser(googleEmail, googleName);
    showSuccess('Google signup successful! Redirecting...');
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1500);
});

/*
=== PROJECT PART 3 ANNOTATIONS ===

REQUIREMENT 1: Link HTML to JavaScript
- Line: <script src="JS/index.js"></script>

REQUIREMENT 2.1.A: Form Validation
- Password matching: Lines 85-92
- Password length (min 6): Lines 94-97
- Duplicate email check: Lines 100-103
- Password correctness: Lines 73-76

REQUIREMENT 2.1.B: Change Formatting
- Toggle forms: Lines 13-17, 19-23
- Show/hide messages: Lines 29-33, 35-39, 41-45

REQUIREMENT 2.1.C: Change HTML Content
- Error message text: Line 31
- Success message text: Line 36
- Pre-fill login email: Line 115

REQUIREMENT 2.1.D: Add/Remove Elements
- It is in habits.js Javascript where I have Checkboxes where you can turn on or off: Line 77-94

REQUIREMENT 2.1.E: Action on Submit/Input
- Login submit: Lines 60-82
- Signup submit: Lines 86-118

REQUIREMENT 2.1.F: Secret Password Section - Press on the Sanctiflow button on the top right corner of the homepage (home.html), password: 67
- It is in home.html: Line 50 - 81, 111 - 183

REQUIREMENT 2.1.G: Two Additional Components
- localStorage user data: Lines 47-62
- Session timestamps: Lines 64-71

REQUIREMENT 2.2.A: DOM Element Selection
- Lines 4-9

REQUIREMENT 2.2.B: Event Listeners
- Form toggle clicks: Lines 13, 19
- Submit events: Lines 60, 86
- Google auth clicks: Lines 121, 129

REQUIREMENT 3: Code Formatting
- N/A (general formatting)

REQUIREMENT 4.A: Variables
- const variables: Lines 62-63

REQUIREMENT 4.B: Control Flow
- if statements for validation: Lines 70-77

REQUIREMENT 4.C: Functions
- showError() function: Lines 27-33
*/