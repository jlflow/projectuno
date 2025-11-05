// Function to calculate score for each metric
function calculateMetricScore(value, type) {
    const val = parseFloat(value);
    
    if (isNaN(val) || value === '') {
        return null;
    }
    
    switch(type) {
        case 'sleep':
            if (val >= 7 && val <= 9) return 3; // Good
            if (val > 5 && val < 7) return 2;    // Okay
            if (val >= 0 && val <= 5) return 1;  // Bad
            return null;
            
        case 'water':
            if (val > 7 && val <= 8) return 3;   // Good
            if (val > 4 && val <= 7) return 2;   // Okay
            if (val >= 0 && val <= 4) return 1;  // Bad
            return null;
            
        case 'steps':
            if (val > 7.1) return 3;             // Good
            if (val > 3 && val <= 7) return 2;   // Okay
            if (val >= 0 && val <= 3) return 1;  // Bad
            return null;
            
        case 'mood':
            if (val >= 4 && val <= 5) return 3;  // Good
            if (val === 3) return 2;             // Okay
            if (val >= 1 && val <= 2) return 1;  // Bad
            return null;
    }
    
    return null;
}

// Function to get CSS class based on score
function getScoreClass(value, type) {
    const val = parseFloat(value);
    
    if (isNaN(val) || value === '') {
        return '';
    }
    
    switch(type) {
        case 'sleep':
            if (val >= 7 && val <= 9) return 'good';
            if (val > 5 && val < 7) return 'okay';
            if (val >= 0 && val <= 5) return 'bad';
            return '';
            
        case 'water':
            if (val > 7 && val <= 8) return 'good';
            if (val > 4 && val <= 7) return 'okay';
            if (val >= 0 && val <= 4) return 'bad';
            return '';
            
        case 'steps':
            if (val > 7.1) return 'good';
            if (val > 3 && val <= 7) return 'okay';
            if (val >= 0 && val <= 3) return 'bad';
            return '';
            
        case 'mood':
            if (val >= 4 && val <= 5) return 'good';
            if (val === 3) return 'okay';
            if (val >= 1 && val <= 2) return 'bad';
            return '';
    }
    
    return '';
}

// Function to update input colors and wellness score
function updateRowColors(row) {
    const inputs = row.querySelectorAll('input');
    const sleepInput = inputs[1]; // Sleep is now index 1 (after weight)
    const waterInput = inputs[2];
    const stepsInput = inputs[3];
    const moodInput = inputs[4];
    
    // Update colors for each input
    sleepInput.className = 'small-input sleep-input ' + getScoreClass(sleepInput.value, 'sleep');
    waterInput.className = 'small-input water-input ' + getScoreClass(waterInput.value, 'water');
    stepsInput.className = 'small-input steps-input ' + getScoreClass(stepsInput.value, 'steps');
    moodInput.className = 'small-input mood-input ' + getScoreClass(moodInput.value, 'mood');
    
    // Calculate wellness score
    const sleepScore = calculateMetricScore(sleepInput.value, 'sleep');
    const waterScore = calculateMetricScore(waterInput.value, 'water');
    const stepsScore = calculateMetricScore(stepsInput.value, 'steps');
    const moodScore = calculateMetricScore(moodInput.value, 'mood');
    
    const wellnessScoreSpan = row.querySelector('.wellness-score');
    
    // Only calculate if all values are entered
    if (sleepScore !== null && waterScore !== null && stepsScore !== null && moodScore !== null) {
        const totalScore = sleepScore + waterScore + stepsScore + moodScore;
        
        // Determine wellness class
        let wellnessClass = '';
        if (totalScore >= 10 && totalScore <= 12) {
            wellnessClass = 'good';
        } else if (totalScore >= 7 && totalScore <= 9) {
            wellnessClass = 'okay';
        } else if (totalScore >= 4 && totalScore <= 6) {
            wellnessClass = 'bad';
        }
        
        wellnessScoreSpan.textContent = totalScore + '/12';
        wellnessScoreSpan.className = 'wellness-score ' + wellnessClass;
    } else {
        wellnessScoreSpan.textContent = '-';
        wellnessScoreSpan.className = 'wellness-score';
    }
}

// Function to save data to localStorage
function saveData() {
    try {
        const table = document.querySelector('.tracker-table');
        const rows = table.querySelectorAll('tr[data-day]');
        const data = {};

        rows.forEach(row => {
            const day = row.getAttribute('data-day');
            const inputs = row.querySelectorAll('input');
            data[day] = {
                weight: inputs[0].value,
                sleep: inputs[1].value,
                water: inputs[2].value,
                steps: inputs[3].value,
                mood: inputs[4].value
            };
        });

        localStorage.setItem('healthTrackerData', JSON.stringify(data));
        console.log('Data saved successfully:', data);
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Failed to save data. Please check console for details.');
    }
}

// Function to load data from localStorage
function loadData() {
    try {
        const savedData = localStorage.getItem('healthTrackerData');
        if (savedData) {
            const data = JSON.parse(savedData);
            const table = document.querySelector('.tracker-table');
            const rows = table.querySelectorAll('tr[data-day]');

            rows.forEach(row => {
                const day = row.getAttribute('data-day');
                if (data[day]) {
                    const inputs = row.querySelectorAll('input');
                    inputs[0].value = data[day].weight || '';
                    inputs[1].value = data[day].sleep || '';
                    inputs[2].value = data[day].water || '';
                    inputs[3].value = data[day].steps || '';
                    inputs[4].value = data[day].mood || '';
                    
                    // Update colors after loading
                    updateRowColors(row);
                }
            });
            console.log('Data loaded successfully:', data);
        } else {
            console.log('No saved data found in localStorage.');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data. Please check console for details.');
    }
}

// Load data when the page loads
window.addEventListener('load', loadData);

// Save data and update colors when any input changes
document.querySelectorAll('.small-input').forEach(input => {
    input.addEventListener('input', function() {
        const row = this.closest('tr[data-day]');
        updateRowColors(row);
        saveData();
    });
});