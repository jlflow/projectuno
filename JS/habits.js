const days = 31;
const columns = 10;

function loadData() {
    const saved = localStorage.getItem('habitTrackerData');
    return saved ? JSON.parse(saved) : {};
}

function saveData(data) {
    localStorage.setItem('habitTrackerData', JSON.stringify(data));
}

let trackerData = loadData();

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

// Initial render
renderTracker();
