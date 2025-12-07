const API_URL = 'http://localhost:3000';

// ============================================================================
// NEW: Get current user from localStorage
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
// Scoring functions (No changes)
// ============================================================================

function calculateMetricScore(value, type) {
    const val = parseFloat(value);
    
    if (isNaN(val) || value === '') {
        return null;
    }
    
    switch(type) {
        case 'sleep':
            if (val >= 7 && val <= 9) return 3;
            if (val > 5 && val < 7) return 2;
            if (val >= 0 && val <= 5) return 1;
            return null;
            
        case 'water':
            if (val > 7 && val <= 8) return 3;
            if (val > 4 && val <= 7) return 2;
            if (val >= 0 && val <= 4) return 1;
            return null;
            
        case 'steps':
            if (val > 7.1) return 3;
            if (val > 3 && val <= 7) return 2;
            if (val >= 0 && val <= 3) return 1;
            return null;
            
        case 'mood':
            if (val >= 4 && val <= 5) return 3;
            if (val === 3) return 2;
            if (val >= 1 && val <= 2) return 1;
            return null;
    }
    
    return null;
}

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

function updateRowColors(row) {
    const inputs = row.querySelectorAll('input');
    const sleepInput = inputs[1];
    const waterInput = inputs[2];
    const stepsInput = inputs[3];
    const moodInput = inputs[4];
    
    sleepInput.className = 'small-input sleep-input ' + getScoreClass(sleepInput.value, 'sleep');
    waterInput.className = 'small-input water-input ' + getScoreClass(waterInput.value, 'water');
    stepsInput.className = 'small-input steps-input ' + getScoreClass(stepsInput.value, 'steps');
    moodInput.className = 'small-input mood-input ' + getScoreClass(moodInput.value, 'mood');
    
    const sleepScore = calculateMetricScore(sleepInput.value, 'sleep');
    const waterScore = calculateMetricScore(waterInput.value, 'water');
    const stepsScore = calculateMetricScore(stepsInput.value, 'steps');
    const moodScore = calculateMetricScore(moodInput.value, 'mood');
    
    const wellnessScoreSpan = row.querySelector('.wellness-score');
    
    if (sleepScore !== null && waterScore !== null && stepsScore !== null && moodScore !== null) {
        const totalScore = sleepScore + waterScore + stepsScore + moodScore;
        
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
        
        return totalScore;
    } else {
        wellnessScoreSpan.textContent = '-';
        wellnessScoreSpan.className = 'wellness-score';
        return null;
    }
}

// ============================================================================
// UPDATED: Save data WITH user_id
// ============================================================================
async function saveData(day, rowData, wellnessScore) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // FIXED: Send user_id in request body
        const response = await fetch(`${API_URL}/api/health`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.userId,  // NEW: Include user_id
                day_number: day,
                weight: parseFloat(rowData.weight) || null,
                sleep_hours: parseFloat(rowData.sleep) || null,
                water_cups: parseFloat(rowData.water) || null,
                steps_km: parseFloat(rowData.steps) || null,
                mood_rating: parseInt(rowData.mood) || null,
                wellness_score: wellnessScore
            })
        });

        const result = await response.json();
        if (!result.success) {
            console.error('Error saving to database:', result.error);
        }
    } catch (error) {
        console.error('Error saving data:', error);
        alert('Could not save to database. Make sure server is running!');
    }
}

// ============================================================================
// UPDATED: Load data WITH user_id
// ============================================================================
async function loadData() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // FIXED: Send user_id as query parameter
        const response = await fetch(`${API_URL}/api/health?user_id=${user.userId}`);
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            console.error('Invalid data format from server');
            return;
        }

        const table = document.querySelector('.tracker-table');
        const rows = table.querySelectorAll('tr[data-day]');

        rows.forEach(row => {
            const day = parseInt(row.getAttribute('data-day'));
            const dayData = data.find(entry => entry.day_number === day);
            
            if (dayData) {
                const inputs = row.querySelectorAll('input');
                inputs[0].value = dayData.weight || '';
                inputs[1].value = dayData.sleep_hours || '';
                inputs[2].value = dayData.water_cups || '';
                inputs[3].value = dayData.steps_km || '';
                inputs[4].value = dayData.mood_rating || '';
                
                updateRowColors(row);
            }
        });
        
        console.log(`✓ Loaded ${data.length} health entries for user ${user.userId}`);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Could not load data from database. Make sure server is running!');
    }
}

// ============================================================================
// Event listeners (No changes)
// ============================================================================

window.addEventListener('load', loadData);

document.querySelectorAll('.small-input').forEach(input => {
    input.addEventListener('input', function() {
        const row = this.closest('tr[data-day]');
        const wellnessScore = updateRowColors(row);
        
        const day = parseInt(row.getAttribute('data-day'));
        const inputs = row.querySelectorAll('input');
        
        const rowData = {
            weight: inputs[0].value,
            sleep: inputs[1].value,
            water: inputs[2].value,
            steps: inputs[3].value,
            mood: inputs[4].value
        };
        
        saveData(day, rowData, wellnessScore);
    });
});