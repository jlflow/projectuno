// API URL - matches your server
const API_URL = 'http://localhost:3000';

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

// Set current logged-in user
function setCurrentUser(userId, name, email, country) {
    const currentUser = {
        userId: userId,
        name: name,
        email: email,
        country: country,
        loggedIn: true,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem('sanctiflow_currentUser', JSON.stringify(currentUser));
}

// ============================================================================
// LOGIN - NO CHANGES NEEDED HERE
// ============================================================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (result.success) {
            // Save user session
            setCurrentUser(result.user.userId, result.user.name, result.user.email, result.user.country);
            
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
        } else {
            showError(result.message || 'Invalid email or password.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Could not connect to server. Make sure server is running!');
    }
});

// ============================================================================
// SIGNUP - UPDATED WITH HEADER INITIALIZATION
// ============================================================================
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const country = document.getElementById('country').value;

    // Validation
    if (password !== confirm) {
        showError('Passwords do not match.');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
    }

    if (!country) {
        showError('Please select a country.');
        return;
    }

    try {
        // Step 1: Create user account
        const response = await fetch(`${API_URL}/api/users/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, country })
        });

        const result = await response.json();

        if (result.success) {
            // Step 2: Initialize default habit headers for new user
            try {
                await fetch(`${API_URL}/api/habit-headers/initialize`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_id: result.userId
                    })
                });
                console.log('✓ Habit headers initialized for new user');
            } catch (headerError) {
                console.error('Error initializing headers:', headerError);
                // Don't block signup if header init fails
            }
            
            showSuccess('Account created successfully! Redirecting to login...');
            
            setTimeout(() => {
                signupForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                document.getElementById('login-email').value = email;
                clearMessages();
            }, 1500);
        } else {
            showError(result.message || 'Could not create account.');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError('Could not connect to server. Make sure server is running!');
    }
});