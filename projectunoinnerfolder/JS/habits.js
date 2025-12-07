const days = 31;
const columns = 10;

// REMOVED: No longer using defaultHabits array
// Headers now come from database only

let trackerData = {};
let habitNames = []; // Will be populated from database

const API_URL = 'http://localhost:3000';

// ============================================================================
// Get current user from localStorage
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
// NEW: Load habit headers from database
// ============================================================================
async function loadHabitHeaders() {
    const user = getCurrentUser();
    if (!user) return false;

    try {
        const response = await fetch(`${API_URL}/api/habit-headers?user_id=${user.userId}`);
        const headers = await response.json();
        
        if (!Array.isArray(headers)) {
            console.error('Invalid headers format:', headers);
            return false;
        }

        // Initialize array with 10 empty slots
        habitNames = new Array(10).fill('');
        
        // Fill in headers from database (guaranteed order by column_index)
        headers.forEach(header => {
            if (header.column_index >= 0 && header.column_index < 10) {
                habitNames[header.column_index] = header.habit_name;
            }
        });

        // If user has no headers yet, initialize defaults
        if (headers.length === 0) {
            console.log('No headers found, initializing defaults...');
            await initializeDefaultHeaders();
            return loadHabitHeaders(); // Reload after initialization
        }

        console.log(`✓ Loaded ${headers.length} habit headers for user ${user.userId}`);
        return true;
        
    } catch (error) {
        console.error('Error loading habit headers:', error);
        alert('Could not load habit headers. Make sure server is running!');
        return false;
    }
}

// ============================================================================
// Initialize default headers for new users
// ============================================================================
async function initializeDefaultHeaders() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/habit-headers/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.userId
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('Error initializing headers:', result.error);
        }
    } catch (error) {
        console.error('Error initializing headers:', error);
    }
}

// ============================================================================
// UPDATED: Load checkbox data (no header logic here anymore)
// ============================================================================
async function loadHabitCheckboxes() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/habits?user_id=${user.userId}`);
        const habits = await response.json();
        
        if (!Array.isArray(habits)) {
            console.error('Invalid habits data format:', habits);
            return;
        }

        // Clear previous data
        trackerData = {};
        
        // Load checkbox states only
        habits.forEach(habit => {
            const key = `${habit.day_number}-${habit.column_index}`;
            trackerData[key] = habit.is_completed === 1;
        });
        
        console.log(`✓ Loaded ${habits.length} habit checkboxes for user ${user.userId}`);
        
    } catch (error) {
        console.error('Error loading habit data:', error);
        alert('Could not connect to database. Make sure server is running!');
    }
}

// ============================================================================
// UPDATED: Load all data (headers first, then checkboxes)
// ============================================================================
async function loadAllData() {
    const headersLoaded = await loadHabitHeaders();
    if (headersLoaded) {
        await loadHabitCheckboxes();
        renderHeaders();
        renderTracker();
    }
}

// ============================================================================
// Save checkbox state
// ============================================================================
async function saveCheckbox(day, col, isChecked) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/habits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.userId,
                day_number: day,
                column_index: col,
                is_completed: isChecked,
                habit_name: habitNames[col] || 'Unnamed' // Use current header name
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('Error saving to database:', result.error);
        }
    } catch (error) {
        console.error('Error saving checkbox:', error);
        alert('Could not save to database. Make sure server is running!');
    }
}

// ============================================================================
// UPDATED: Update habit header name
// ============================================================================
async function updateHabitNameInDB(columnIndex, newName) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/habit-headers/${columnIndex}?user_id=${user.userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.userId,
                habit_name: newName
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('Error updating habit header:', result.error);
        } else {
            console.log(`✓ Updated header column ${columnIndex} to "${newName}"`);
        }
    } catch (error) {
        console.error('Error updating habit header:', error);
    }
}

// ============================================================================
// Render headers
// ============================================================================
function renderHeaders() {
    const headerRow = document.getElementById('habit-headers');
    headerRow.innerHTML = '<th></th>'; // Day number column
    
    habitNames.forEach((name, index) => {
        const th = document.createElement('th');
        th.textContent = name || `Habit ${index + 1}`; // Fallback if empty
        th.dataset.index = index;
        th.addEventListener('click', function() {
            openEditModal(index);
        });
        headerRow.appendChild(th);
    });
}

// ============================================================================
// Render tracker checkboxes
// ============================================================================
function renderTracker() {
    const tbody = document.getElementById('tracker-body');
    tbody.innerHTML = '';

    for (let day = 1; day <= days; day++) {
        const tr = document.createElement('tr');

        // Day number column
        const dayCell = document.createElement('td');
        dayCell.className = 'day-number';
        dayCell.textContent = day;
        tr.appendChild(dayCell);

        // Checkbox columns (always 10, matching header count)
        for (let col = 0; col < columns; col++) {
            const td = document.createElement('td');
            td.className = 'checkbox-cell';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            const key = `${day}-${col}`;
            checkbox.checked = trackerData[key] || false;
            
            checkbox.addEventListener('change', function() {
                trackerData[key] = this.checked;
                saveCheckbox(day, col, this.checked);
            });
            
            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }
}

// ============================================================================
// Modal for editing habit names
// ============================================================================
let currentEditingIndex = null;

function openEditModal(index) {
    currentEditingIndex = index;
    const modal = document.getElementById('edit-modal');
    const input = document.getElementById('habit-name-input');
    
    input.value = habitNames[index] || '';
    modal.style.display = 'block';
    input.focus();
    input.select();
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'none';
    currentEditingIndex = null;
}

async function saveHabitName() {
    const input = document.getElementById('habit-name-input');
    const newName = input.value.trim();
    
    if (newName && currentEditingIndex !== null) {
        // Update local array
        habitNames[currentEditingIndex] = newName;
        
        // Save to database
        await updateHabitNameInDB(currentEditingIndex, newName);
        
        // Re-render headers
        renderHeaders();
    }
    
    closeEditModal();
}

// Event listeners for modal
document.getElementById('save-habit-btn').addEventListener('click', saveHabitName);
document.getElementById('cancel-habit-btn').addEventListener('click', closeEditModal);

document.getElementById('edit-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditModal();
    }
});

document.getElementById('habit-name-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveHabitName();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEditModal();
    }
});

// Load data when page loads
window.addEventListener('load', loadAllData);