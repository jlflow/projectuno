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
    "Book Reading",
    "Bible Reading",
    "Devotion"
];

// Load checkbox data (unchanged)
function loadData() {
    const saved = localStorage.getItem('habitTrackerData');
    return saved ? JSON.parse(saved) : {};
}

// Save checkbox data (unchanged)
function saveData(data) {
    localStorage.setItem('habitTrackerData', JSON.stringify(data));
}

// Load habit names
function loadHabitNames() {
    const saved = localStorage.getItem('habitNames');
    return saved ? JSON.parse(saved) : defaultHabits;
}

// Save habit names
function saveHabitNames(names) {
    localStorage.setItem('habitNames', JSON.stringify(names));
}

let trackerData = loadData();
let habitNames = loadHabitNames();

// Render habit headers
function renderHeaders() {
    const headerRow = document.getElementById('habit-headers');
    // Clear existing headers except the first empty cell
    headerRow.innerHTML = '<th></th>';
    
    habitNames.forEach((name, index) => {
        const th = document.createElement('th');
        th.textContent = name;
        th.dataset.index = index;
        
        // Add click event to edit habit name
        th.addEventListener('click', function() {
            openEditModal(index);
        });
        
        headerRow.appendChild(th);
    });
}

// Render tracker body (unchanged logic)
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
                saveData(trackerData);
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
        habitNames[currentEditingIndex] = newName;
        saveHabitNames(habitNames);
        renderHeaders();
    }
    
    closeEditModal();
}

// Event listeners for modal
document.getElementById('save-habit-btn').addEventListener('click', saveHabitName);
document.getElementById('cancel-habit-btn').addEventListener('click', closeEditModal);

// Close modal on outside click
document.getElementById('edit-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditModal();
    }
});

// Save on Enter key
document.getElementById('habit-name-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveHabitName();
    }
});

// Close on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEditModal();
    }
});

// Initial render
renderHeaders();
renderTracker();