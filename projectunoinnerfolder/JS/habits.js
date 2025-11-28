const days = 31;
const columns = 10;

// Default habit names
const defaultHabits = [
    "Make Bed",
    "Workout",
    "Running",
    "Book Reading",
    "Diet",
    "Studying",
    "Labbing",
    "Journaling",
    "Bible Reading",
    "Devotion"
];

let trackerData = {};
let habitNames = [...defaultHabits];

// API URL - change port if you changed it in server.js
const API_URL = 'http://localhost:3000';

// Load all data from database when page loads
async function loadAllData() {
    try {
        // Fetch habits from database
        const response = await fetch(`${API_URL}/api/habits`);
        const habits = await response.json();
        
        // Convert database format to our tracker format
        trackerData = {};
        const habitNamesSet = new Set();
        
        habits.forEach(habit => {
            const key = `${habit.day_number}-${habit.column_index}`;
            trackerData[key] = habit.is_completed === 1;
            habitNamesSet.add(habit.habit_name);
        });
        
        // Update habit names if we have them from database
        if (habitNamesSet.size > 0) {
            habitNames = Array.from(habitNamesSet);
        }
        
        renderHeaders();
        renderTracker();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Could not connect to database. Make sure server is running!');
    }
}

// Save checkbox state to database
async function saveCheckbox(day, col, isChecked) {
    try {
        const response = await fetch(`${API_URL}/api/habits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                day_number: day,
                column_index: col,
                is_completed: isChecked,
                habit_name: habitNames[col]
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

// Save habit name to database
async function updateHabitNameInDB(oldName, newName) {
    try {
        const response = await fetch(`${API_URL}/api/habits/name`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                old_name: oldName,
                new_name: newName
            })
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('Error updating habit name:', result.error);
        }
    } catch (error) {
        console.error('Error updating habit name:', error);
    }
}

// Render habit headers
function renderHeaders() {
    const headerRow = document.getElementById('habit-headers');
    headerRow.innerHTML = '<th></th>';
    
    habitNames.forEach((name, index) => {
        const th = document.createElement('th');
        th.textContent = name;
        th.dataset.index = index;
        th.addEventListener('click', function() {
            openEditModal(index);
        });
        headerRow.appendChild(th);
    });
}

// Render tracker body
function renderTracker() {
    const tbody = document.getElementById('tracker-body');
    tbody.innerHTML = '';

    for (let day = 1; day <= days; day++) {
        const tr = document.createElement('tr');

        // Day number cell
        const dayCell = document.createElement('td');
        dayCell.className = 'day-number';
        dayCell.textContent = day;
        tr.appendChild(dayCell);

        // Checkbox cells
        for (let col = 0; col < columns; col++) {
            const td = document.createElement('td');
            td.className = 'checkbox-cell';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            const key = `${day}-${col}`;
            checkbox.checked = trackerData[key] || false;
            
            checkbox.addEventListener('change', function() {
                trackerData[key] = this.checked;
                saveCheckbox(day, col, this.checked); // Save to database
            });
            
            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }
}

// Modal functionality
let currentEditingIndex = null;

function openEditModal(index) {
    currentEditingIndex = index;
    const modal = document.getElementById('edit-modal');
    const input = document.getElementById('habit-name-input');
    
    input.value = habitNames[index];
    modal.style.display = 'block';
    input.focus();
    input.select();
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'none';
    currentEditingIndex = null;
}

function saveHabitName() {
    const input = document.getElementById('habit-name-input');
    const newName = input.value.trim();
    
    if (newName && currentEditingIndex !== null) {
        const oldName = habitNames[currentEditingIndex];
        habitNames[currentEditingIndex] = newName;
        updateHabitNameInDB(oldName, newName); // Save to database
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