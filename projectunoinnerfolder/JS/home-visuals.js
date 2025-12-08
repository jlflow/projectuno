// ============================================================================
// HOME-VISUALS.JS - Dashboard Visualizations
// This file handles all charts and statistics on the homepage
// ============================================================================

const API_URL = 'http://localhost:3000';

let habitChart = null;
let sleepChart = null;

// ============================================================================
// Get current user
// ============================================================================
function getCurrentUser() {
    const userData = localStorage.getItem('sanctiflow_currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return null;
    }
    return JSON.parse(userData);
}

// ============================================================================
// Load all dashboard data
// ============================================================================
async function loadDashboard() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        // Load all three statistics endpoints
        await Promise.all([
            loadHabitStats(user.userId),
            loadHealthStats(user.userId),
            loadWeaknesses(user.userId)
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============================================================================
// VISUAL 1: Habit Completion Over Time
// ============================================================================
async function loadHabitStats(userId) {
    try {
        const response = await fetch(`${API_URL}/api/stats/habits?user_id=${userId}`);
        const data = await response.json();
        
        if (data.totalDays === 0) {
            document.getElementById('habitStats').innerHTML = 
                '<p style="text-align: center; color: #999;">No habit data yet. Start tracking!</p>';
            return;
        }

        
        const ctx = document.getElementById('habitChart').getContext('2d');
        
        if (habitChart) {
            habitChart.destroy();
        }

        // LINE CHART - Best for showing trends over time
        habitChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.completionByDay.map(d => `Day ${d.day}`),
                datasets: [{
                    label: 'Daily Completion %',
                    data: data.completionByDay.map(d => d.percentage),
                    borderColor: '#000',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 2,
                    tension: 0.4, // Smooth curve shows gradual progression
                    fill: true // Area fill emphasizes cumulative progress
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });

        
        document.getElementById('habitStats').innerHTML = `
            <div class="stat-row">
                <span>Overall Completion:</span>
                <strong>${data.overallCompletion}%</strong>
            </div>
            <div class="stat-row">
                <span>Days Tracked:</span>
                <strong>${data.totalDays}</strong>
            </div>
            <div class="stat-row">
                <span>Latest Day:</span>
                <strong>Day ${data.latestDay}</strong>
            </div>
        `;

    } catch (error) {
        console.error('Error loading habit stats:', error);
        document.getElementById('habitStats').innerHTML = 
            '<p style="color: red;">Error loading habit data</p>';
    }
}

// ============================================================================
// VISUAL 2: Sleep Tracking (Last 7 Days)
// ============================================================================
async function loadHealthStats(userId) {
    try {
        const response = await fetch(`${API_URL}/api/stats/health?user_id=${userId}`);
        const data = await response.json();
        
        if (data.last7Days.length === 0) {
            document.getElementById('sleepStats').innerHTML = 
                '<p style="text-align: center; color: #999;">No health data yet. Start tracking!</p>';
            return;
        }

        
        const ctx = document.getElementById('sleepChart').getContext('2d');
        
        if (sleepChart) {
            sleepChart.destroy();
        }

        // BAR CHART - Best for comparing discrete daily values
        sleepChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.last7Days.map(d => `Day ${d.day}`),
                datasets: [{
                    label: 'Sleep Hours',
                    data: data.last7Days.map(d => d.sleep),
                    // COLOR CODING: Instant visual feedback on sleep quality
                    backgroundColor: data.last7Days.map(d => {
                        if (d.sleep >= 7 && d.sleep <= 9) return '#CAFFBF';// Green: Optimal
                        if (d.sleep >= 6) return '#FDFFB6';// Yellow: Acceptable
                        return '#FFADAD';// Red: Poor
                    }),
                    borderColor: '#000',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 12,
                        ticks: {
                            callback: function(value) {
                                return value + 'h';
                            }
                        }
                    }
                }
            }
        });

       
        const sleepQuality = data.averageSleep >= 7 && data.averageSleep <= 9 
            ? 'Good' 
            : data.averageSleep >= 6 
            ? 'Fair' 
            : 'Poor';

        document.getElementById('sleepStats').innerHTML = `
            <div class="stat-row">
                <span>Average Sleep:</span>
                <strong>${data.averageSleep} hours</strong>
            </div>
            <div class="stat-row">
                <span>Sleep Quality:</span>
                <strong>${sleepQuality}</strong>
            </div>
            <div class="stat-row">
                <span>Average Mood:</span>
                <strong>${data.averageMood}/5</strong>
            </div>
        `;

    } catch (error) {
        console.error('Error loading health stats:', error);
        document.getElementById('sleepStats').innerHTML = 
            '<p style="color: red;">Error loading health data</p>';
    }
}

// ============================================================================
// VISUAL 3: Weaknesses & Recommendations
// ============================================================================
async function loadWeaknesses(userId) {
    try {
        const response = await fetch(`${API_URL}/api/stats/weaknesses?user_id=${userId}`);
        const data = await response.json();
        
        const container = document.getElementById('weaknessesContainer');
        container.innerHTML = '';

        if (!data.weaknesses || data.weaknesses.length === 0) {
            container.innerHTML = `
                <div class="weakness-item good">
                    <div class="weakness-icon">✓</div>
                    <div class="weakness-content">
                        <h4>Great Job!</h4>
                        <p>No issues detected. Keep up the excellent work!</p>
                    </div>
                </div>
            `;
            return;
        }

        data.weaknesses.forEach(weakness => {
            const item = document.createElement('div');
            item.className = `weakness-item ${weakness.severity}`;
            
            const icon = weakness.severity === 'high' ? '⚠️' : 
                        weakness.severity === 'medium' ? '⚡' : 
                        weakness.type === 'success' ? '✓' : 'ℹ️';
            
            item.innerHTML = `
                <div class="weakness-icon">${icon}</div>
                <div class="weakness-content">
                    <h4>${weakness.title}</h4>
                    <p class="weakness-description">${weakness.description}</p>
                    <p class="weakness-recommendation"><strong>Tip:</strong> ${weakness.recommendation}</p>
                </div>
            `;
            
            container.appendChild(item);
        });

    } catch (error) {
        console.error('Error loading weaknesses:', error);
        document.getElementById('weaknessesContainer').innerHTML = 
            '<p style="color: red;">Error loading insights</p>';
    }
}

// ============================================================================
// Reset Monthly Data
// ============================================================================
async function confirmReset() {
    const confirmed = confirm(
        '⚠️ WARNING: This will permanently delete ALL your habit and health data for this month.\n\n' +
        'This action CANNOT be undone.\n\n' +
        'Are you absolutely sure you want to continue?'
    );

    if (!confirmed) return;

    const doubleCheck = confirm(
        '🚨 FINAL CONFIRMATION 🚨\n\n' +
        'You are about to delete:\n' +
        '- All habit checkboxes\n' +
        '- All health entries\n\n' +
        'Click OK to proceed with reset.'
    );

    if (!doubleCheck) return;

    const user = getCurrentUser();
    if (!user) return;

    try {
        const response = await fetch(`${API_URL}/api/reset/monthly?user_id=${user.userId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert('✓ Monthly data has been reset successfully!');
            
            location.reload();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error resetting data:', error);
        alert('Could not reset data. Make sure server is running!');
    }
}

// ============================================================================
// Initialize dashboard on page load
// ============================================================================
window.addEventListener('load', loadDashboard);