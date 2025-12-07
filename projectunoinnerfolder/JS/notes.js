// ============================================================================
// NOTES.JS - User-Specific Notes with Database Sync
// ============================================================================
// This replaces localStorage with database storage
// Now each user has their own notes that persist across sessions
// ============================================================================

const API_URL = 'http://localhost:3000';
const textarea = document.getElementById('notes-textarea');
let saveTimeout = null;

// ============================================================================
// Get current logged-in user from localStorage
// ============================================================================
function getCurrentUser() {
    const userData = localStorage.getItem('sanctiflow_currentUser');
    if (!userData) {
        alert('Please log in first');
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(userData);
}

// ============================================================================
// LOAD notes from database (user-specific)
// ============================================================================
async function loadNotes() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // FIXED: Send user_id as query parameter
        const response = await fetch(`${API_URL}/api/notes?user_id=${user.userId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Load content if it exists
        if (data.content) {
            textarea.value = data.content;
        }
        
        console.log(`✓ Loaded notes for user ${user.userId}`);
        
    } catch (error) {
        console.error('Error loading notes:', error);
        // Don't alert on load - might just be first time
        console.log('No existing notes found - starting fresh');
    }
}

// ============================================================================
// SAVE notes to database (user-specific)
// ============================================================================
async function saveNotes(content) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // FIXED: Send user_id in request body
        const response = await fetch(`${API_URL}/api/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.userId,  // NEW: Include user_id
                content: content
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            console.log('✓ Notes auto-saved');
        } else {
            console.error('Error saving notes:', result.error);
        }
        
    } catch (error) {
        console.error('Error saving notes:', error);
        alert('Could not save notes to database. Make sure server is running!');
    }
}

// ============================================================================
// Auto-save with debounce (waits 1 second after user stops typing)
// ============================================================================
textarea.addEventListener('input', function() {
    // Clear previous timeout
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    // Set new timeout to save after 1 second of no typing
    saveTimeout = setTimeout(() => {
        saveNotes(this.value);
    }, 1000);
});

// ============================================================================
// Save on page unload (before user closes/leaves page)
// ============================================================================
window.addEventListener('beforeunload', function(e) {
    // If there's a pending save, save immediately
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveNotes(textarea.value);
    }
});

// ============================================================================
// Load notes when page loads
// ============================================================================
window.addEventListener('load', loadNotes);