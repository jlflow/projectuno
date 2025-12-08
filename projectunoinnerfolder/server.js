/*
================================================================================
CORRECTED: USER-SCOPED DATA WITH HABIT HEADERS
================================================================================
*/

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('✓ Connected to SQLite database');
        initializeDatabase();
    }
});

// ============================================================================
// DATABASE SCHEMA - WITH HABIT HEADERS TABLE
// ============================================================================
function initializeDatabase() {
    
    // Create users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            country TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT,
            CHECK (email LIKE '%@%')
        )
    `, (err) => {
        if (err) console.error('Error creating users table:', err.message);
        else console.log('✓ Users table ready');
    });

    // Habits table
    db.run(`
        CREATE TABLE IF NOT EXISTS habits (
            habit_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            habit_name TEXT NOT NULL,
            day_number INTEGER NOT NULL,
            column_index INTEGER NOT NULL,
            is_completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            CHECK (is_completed IN (0, 1)),
            CHECK (day_number BETWEEN 1 AND 31),
            CHECK (column_index BETWEEN 0 AND 9),
            
            UNIQUE(user_id, day_number, column_index),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating habits table:', err.message);
        else console.log('✓ Habits table ready');
    });

    // Health entries table
    db.run(`
        CREATE TABLE IF NOT EXISTS health_entries (
            entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            day_number INTEGER NOT NULL,
            weight REAL,
            sleep_hours REAL,
            water_cups REAL,
            steps_km REAL,
            mood_rating INTEGER,
            wellness_score INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            CHECK (mood_rating BETWEEN 1 AND 5),
            CHECK (wellness_score BETWEEN 4 AND 12),
            CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
            CHECK (water_cups >= 0 AND water_cups <= 20),
            CHECK (steps_km >= 0),
            
            UNIQUE(user_id, day_number),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating health_entries table:', err.message);
        else console.log('✓ Health entries table ready');
    });

    // Notes table
    db.run(`
        CREATE TABLE IF NOT EXISTS notes (
            note_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(user_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating notes table:', err.message);
        else console.log('✓ Notes table ready');
    });

    // NEW: Habit Headers Table
    db.run(`
        CREATE TABLE IF NOT EXISTS habit_headers (
            header_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            column_index INTEGER NOT NULL,
            habit_name TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            
            UNIQUE(user_id, column_index),
            CHECK (column_index BETWEEN 0 AND 9),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) console.error('Error creating habit_headers table:', err.message);
        else console.log('✓ Habit headers table ready');
    });
}

// ============================================================================
// MIDDLEWARE: Validate user_id
// ============================================================================
function validateUserId(req, res, next) {
    const userId = req.body.user_id || req.query.user_id;
    
    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            error: 'User ID required. Please log in again.' 
        });
    }
    
    db.get('SELECT user_id FROM users WHERE user_id = ?', [userId], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid user. Please log in again.' 
            });
        }
        
        req.userId = userId;
        next();
    });
}

// ============================================================================
// HABIT HEADERS ENDPOINTS
// ============================================================================

// GET habit headers
app.get('/api/habit-headers', validateUserId, (req, res) => {
    const userId = req.userId;

    const sql = `
        SELECT column_index, habit_name 
        FROM habit_headers 
        WHERE user_id = ?
        ORDER BY column_index ASC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Retrieved ${rows.length} habit headers`);
            res.json(rows);
        }
    });
});

// UPDATE a single habit header
app.put('/api/habit-headers/:columnIndex', validateUserId, (req, res) => {
    const { columnIndex } = req.params;
    const { habit_name } = req.body;
    const userId = req.userId;

    const colIdx = parseInt(columnIndex);
    if (isNaN(colIdx) || colIdx < 0 || colIdx > 9) {
        return res.status(400).json({ 
            success: false, 
            error: 'Column index must be between 0 and 9' 
        });
    }

    const sql = `
        INSERT INTO habit_headers (user_id, column_index, habit_name, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, column_index) 
        DO UPDATE SET 
            habit_name = excluded.habit_name,
            updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [userId, colIdx, habit_name], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Updated header column ${colIdx} to "${habit_name}"`);
            res.json({ success: true, changes: this.changes });
        }
    });
});

// INITIALIZE default headers
app.post('/api/habit-headers/initialize', validateUserId, (req, res) => {
    const userId = req.userId;
    const defaultHeaders = [
        "Make Bed", "Workout", "Running", "Book Reading", "Diet",
        "Studying", "Labbing", "Journaling", "Bible Reading", "Devotion"
    ];

    db.serialize(() => {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO habit_headers (user_id, column_index, habit_name)
            VALUES (?, ?, ?)
        `);

        defaultHeaders.forEach((name, index) => {
            stmt.run([userId, index, name]);
        });

        stmt.finalize((err) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                console.log(`✓ User ${userId}: Initialized 10 default headers`);
                res.json({ success: true, message: 'Headers initialized' });
            }
        });
    });
});

// ============================================================================
// HABITS ENDPOINTS
// ============================================================================

// CREATE/UPDATE habit
app.post('/api/habits', validateUserId, (req, res) => {
    const { day_number, column_index, is_completed, habit_name } = req.body;
    const userId = req.userId;

    const sql = `
        INSERT INTO habits (user_id, day_number, column_index, is_completed, habit_name, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, day_number, column_index) 
        DO UPDATE SET 
            is_completed = excluded.is_completed,
            habit_name = excluded.habit_name,
            updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [userId, day_number, column_index, is_completed, habit_name], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Saved habit for day ${day_number}, col ${column_index}`);
            res.json({ success: true, id: this.lastID });
        }
    });
});

// READ habits
app.get('/api/habits', validateUserId, (req, res) => {
    const userId = req.userId;

    const sql = `
        SELECT * FROM habits 
        WHERE user_id = ?
        ORDER BY day_number ASC, column_index ASC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Retrieved ${rows.length} habits`);
            res.json(rows);
        }
    });
});

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

// CREATE/UPDATE health entry
app.post('/api/health', validateUserId, (req, res) => {
    const { day_number, weight, sleep_hours, water_cups, steps_km, mood_rating, wellness_score } = req.body;
    const userId = req.userId;

    const sql = `
        INSERT INTO health_entries (
            user_id, day_number, weight, sleep_hours, water_cups, 
            steps_km, mood_rating, wellness_score, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, day_number) 
        DO UPDATE SET 
            weight = excluded.weight,
            sleep_hours = excluded.sleep_hours,
            water_cups = excluded.water_cups,
            steps_km = excluded.steps_km,
            mood_rating = excluded.mood_rating,
            wellness_score = excluded.wellness_score,
            updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [userId, day_number, weight, sleep_hours, water_cups, steps_km, mood_rating, wellness_score], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Saved health entry for day ${day_number}`);
            res.json({ success: true, id: this.lastID });
        }
    });
});

// READ health entries
app.get('/api/health', validateUserId, (req, res) => {
    const userId = req.userId;

    const sql = `
        SELECT * FROM health_entries 
        WHERE user_id = ?
        ORDER BY day_number ASC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Retrieved ${rows.length} health entries`);
            res.json(rows);
        }
    });
});

// ============================================================================
// NOTES ENDPOINTS
// ============================================================================

// SAVE/UPDATE notes
app.post('/api/notes', validateUserId, (req, res) => {
    const { content } = req.body;
    const userId = req.userId;

    const sql = `
        INSERT INTO notes (user_id, content, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) 
        DO UPDATE SET 
            content = excluded.content,
            updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [userId, content], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Saved notes`);
            res.json({ success: true });
        }
    });
});

// READ notes
app.get('/api/notes', validateUserId, (req, res) => {
    const userId = req.userId;

    const sql = 'SELECT content FROM notes WHERE user_id = ?';

    db.get(sql, [userId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            console.log(`✓ User ${userId}: Retrieved notes`);
            res.json({ content: row ? row.content : '' });
        }
    });
});

// ============================================================================
// USER AUTHENTICATION
// ============================================================================

app.post('/api/users/signup', (req, res) => {
    const { name, email, password, country } = req.body;

    db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (row) {
            res.status(400).json({ 
                success: false, 
                message: 'An account with this email already exists.' 
            });
            return;
        }

        const sql = `
            INSERT INTO users (name, email, password, country, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        db.run(sql, [name, email, password, country], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                console.log(`✓ New user registered: ${email}`);
                res.json({ 
                    success: true, 
                    message: 'Account created successfully!',
                    userId: this.lastID
                });
            }
        });
    });
});

app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT user_id, name, email, country FROM users WHERE email = ? AND password = ?';

    db.get(sql, [email, password], (err, user) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (!user) {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid email or password.' 
            });
            return;
        }

        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);

        console.log(`✓ User logged in: ${email}`);
        res.json({ 
            success: true, 
            message: 'Login successful!',
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                country: user.country
            }
        });
    });
});


// ============================================================================
// ADD THESE NEW ENDPOINTS TO YOUR EXISTING server.js
// Place them BEFORE the "SERVER STARTUP" section
// ============================================================================

// ============================================================================
// STATISTICS & ANALYTICS ENDPOINTS
// ============================================================================

// GET habit completion statistics
app.get('/api/stats/habits', validateUserId, (req, res) => {
    const userId = req.userId;

    const sql = `
        SELECT 
            day_number,
            column_index,
            habit_name,
            is_completed
        FROM habits 
        WHERE user_id = ?
        ORDER BY day_number ASC, column_index ASC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // Calculate statistics
            const stats = calculateHabitStats(rows);
            res.json(stats);
        }
    });
});

// GET health statistics (last 7 days)
app.get('/api/stats/health', validateUserId, (req, res) => {
    const userId = req.userId;

    const sql = `
        SELECT 
            day_number,
            sleep_hours,
            water_cups,
            steps_km,
            mood_rating,
            wellness_score,
            weight
        FROM health_entries 
        WHERE user_id = ?
        ORDER BY day_number DESC
        LIMIT 31
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const stats = calculateHealthStats(rows);
            res.json(stats);
        }
    });
});

// GET weaknesses analysis
app.get('/api/stats/weaknesses', validateUserId, (req, res) => {
    const userId = req.userId;

    // Get both habits and health data
    const habitSql = `
        SELECT h.habit_name, h.is_completed, h.day_number, h.column_index
        FROM habits h
        WHERE h.user_id = ?
        ORDER BY h.day_number DESC
    `;

    const healthSql = `
        SELECT day_number, sleep_hours, mood_rating, weight, wellness_score
        FROM health_entries
        WHERE user_id = ?
        ORDER BY day_number DESC
        LIMIT 31
    `;

    db.all(habitSql, [userId], (err, habitRows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        db.all(healthSql, [userId], (err2, healthRows) => {
            if (err2) {
                res.status(500).json({ error: err2.message });
                return;
            }

            const weaknesses = analyzeWeaknesses(habitRows, healthRows);
            res.json(weaknesses);
        });
    });
});

// ============================================================================
// RESET MONTHLY DATA ENDPOINT
// ============================================================================
app.delete('/api/reset/monthly', validateUserId, (req, res) => {
    const userId = req.userId;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Delete habits
        db.run('DELETE FROM habits WHERE user_id = ?', [userId], function(err) {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
        });

        // Delete health entries
        db.run('DELETE FROM health_entries WHERE user_id = ?', [userId], function(err) {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
        });

        db.run('COMMIT', (err) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
            } else {
                console.log(`✓ User ${userId}: Monthly data reset`);
                res.json({ 
                    success: true, 
                    message: 'Monthly data has been reset successfully.' 
                });
            }
        });
    });
});

// ============================================================================
// FIXED HELPER FUNCTIONS FOR STATISTICS
// Replace the existing functions in your server.js with these
// ============================================================================

function calculateHabitStats(rows) {
    const MAX_HABITS_PER_DAY = 10; // CRITICAL: Always calculate against 10 possible habits
    
    if (rows.length === 0) {
        return {
            totalDays: 0,
            completionByDay: [],
            completionByHabit: [],
            overallCompletion: 0,
            latestDay: 0
        };
    }

    // Group by day
    const dayGroups = {};
    const habitGroups = {};
    
    rows.forEach(row => {
        // By day - track which days have ANY data
        if (!dayGroups[row.day_number]) {
            dayGroups[row.day_number] = { 
                total: MAX_HABITS_PER_DAY,  // ✅ FIXED: Always 10 possible habits
                completed: 0 
            };
        }
        
        // Only count completed habits
        if (row.is_completed) {
            dayGroups[row.day_number].completed++;
        }

        // By habit (unchanged - this part was working)
        const habitKey = `${row.column_index}-${row.habit_name}`;
        if (!habitGroups[habitKey]) {
            habitGroups[habitKey] = { 
                name: row.habit_name, 
                column: row.column_index,
                total: 0, 
                completed: 0 
            };
        }
        habitGroups[habitKey].total++;
        if (row.is_completed) {
            habitGroups[habitKey].completed++;
        }
    });

    // Calculate completion by day
    const completionByDay = Object.keys(dayGroups)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(day => ({
            day: parseInt(day),
            percentage: Math.round((dayGroups[day].completed / MAX_HABITS_PER_DAY) * 100),
            completed: dayGroups[day].completed,
            total: MAX_HABITS_PER_DAY
        }));

    // Calculate completion by habit
    const completionByHabit = Object.values(habitGroups)
        .map(habit => ({
            name: habit.name,
            column: habit.column,
            percentage: Math.round((habit.completed / habit.total) * 100),
            completed: habit.completed,
            total: habit.total
        }))
        .sort((a, b) => a.column - b.column);

    // Overall completion - FIXED calculation
    const totalDaysTracked = Object.keys(dayGroups).length;
    const totalPossibleChecks = totalDaysTracked * MAX_HABITS_PER_DAY;
    const totalCompletedChecks = Object.values(dayGroups)
        .reduce((sum, day) => sum + day.completed, 0);
    
    const overallCompletion = totalPossibleChecks > 0 
        ? Math.round((totalCompletedChecks / totalPossibleChecks) * 100) 
        : 0;

    const latestDay = Math.max(...Object.keys(dayGroups).map(d => parseInt(d)));

    return {
        totalDays: totalDaysTracked,
        completionByDay,
        completionByHabit,
        overallCompletion,
        latestDay,
        totalCompleted: totalCompletedChecks,
        totalPossible: totalPossibleChecks
    };
}

// ============================================================================
// FIXED: Analyze Weaknesses (Better Detection)
// ============================================================================

function analyzeWeaknesses(habitRows, healthRows) {
    const weaknesses = [];
    const MAX_HABITS_PER_DAY = 10;

    // ============================================================================
    // ANALYZE HABITS - IMPROVED LOGIC
    // ============================================================================
    
    // Group habits by column/name to track across all days
    const habitGroups = {};
    const daysTracked = new Set();
    
    habitRows.forEach(row => {
        daysTracked.add(row.day_number);
        const key = `${row.column_index}-${row.habit_name}`;
        if (!habitGroups[key]) {
            habitGroups[key] = { 
                name: row.habit_name,
                column: row.column_index,
                appearances: 0,
                completed: 0 
            };
        }
        habitGroups[key].appearances++;
        if (row.is_completed) {
            habitGroups[key].completed++;
        }
    });

    const totalDaysTracked = daysTracked.size;

    // Analyze each habit
    Object.values(habitGroups).forEach(habit => {
        const completion = habit.appearances > 0 
            ? (habit.completed / habit.appearances) * 100 
            : 0;
        
        // HIGH PRIORITY: Habit exists but rarely completed
        if (completion < 40 && habit.appearances >= 3) {
            weaknesses.push({
                type: 'habit',
                severity: 'high',
                title: `"${habit.name}" Needs Attention`,
                description: `Only ${Math.round(completion)}% completion rate (${habit.completed}/${habit.appearances} days)`,
                recommendation: `Set a specific time or reminder for "${habit.name}"`
            });
        } 
        // MEDIUM PRIORITY: Inconsistent completion
        else if (completion < 65 && habit.appearances >= 5) {
            weaknesses.push({
                type: 'habit',
                severity: 'medium',
                title: `"${habit.name}" is Inconsistent`,
                description: `${Math.round(completion)}% completion rate (${habit.completed}/${habit.appearances} days)`,
                recommendation: `You're making progress! Try habit stacking with "${habit.name}"`
            });
        }
        // LOW PRIORITY: Good but could be better
        else if (completion < 85 && habit.appearances >= 7) {
            weaknesses.push({
                type: 'habit',
                severity: 'low',
                title: `"${habit.name}" Almost There`,
                description: `${Math.round(completion)}% completion rate - you're doing well!`,
                recommendation: `Keep up the momentum with "${habit.name}"`
            });
        }
    });

    // Check for missing days (days with no tracking at all)
    if (totalDaysTracked > 0 && totalDaysTracked < 7) {
        weaknesses.push({
            type: 'habit',
            severity: 'medium',
            title: 'Limited Tracking Days',
            description: `Only ${totalDaysTracked} days tracked so far`,
            recommendation: 'Try to track your habits daily for better insights'
        });
    }

    // ============================================================================
    // ANALYZE HEALTH - UNCHANGED (this was working)
    // ============================================================================
    
    if (healthRows.length >= 3) {
        const recentSleep = healthRows.slice(0, 7);
        const avgSleep = recentSleep.reduce((s, r) => s + (r.sleep_hours || 0), 0) / recentSleep.length;
        
        if (avgSleep < 6) {
            weaknesses.push({
                type: 'health',
                severity: 'high',
                title: 'Sleep Deficit',
                description: `Average of ${avgSleep.toFixed(1)} hours per night`,
                recommendation: 'Aim for 7-9 hours. Try setting a consistent bedtime'
            });
        } else if (avgSleep < 7) {
            weaknesses.push({
                type: 'health',
                severity: 'medium',
                title: 'Below Optimal Sleep',
                description: `Average of ${avgSleep.toFixed(1)} hours per night`,
                recommendation: 'Try adding 30 minutes more sleep time'
            });
        }

        const recentMood = healthRows.slice(0, 7);
        const avgMood = recentMood.reduce((s, r) => s + (r.mood_rating || 0), 0) / recentMood.length;
        
        if (avgMood < 2.5) {
            weaknesses.push({
                type: 'health',
                severity: 'high',
                title: 'Low Mood Pattern',
                description: `Average mood: ${avgMood.toFixed(1)}/5`,
                recommendation: 'Consider talking to someone or doing activities you enjoy'
            });
        } else if (avgMood < 3.5) {
            weaknesses.push({
                type: 'health',
                severity: 'medium',
                title: 'Mood Could Improve',
                description: `Average mood: ${avgMood.toFixed(1)}/5`,
                recommendation: 'Try exercise, sunlight, or social connection'
            });
        }

        // Weight tracking
        const recentWeight = healthRows.slice(0, 14).filter(r => r.weight);
        if (recentWeight.length >= 5) {
            const firstWeight = recentWeight[recentWeight.length - 1].weight;
            const lastWeight = recentWeight[0].weight;
            const change = lastWeight - firstWeight;
            
            if (Math.abs(change) > 5) {
                weaknesses.push({
                    type: 'health',
                    severity: 'medium',
                    title: 'Significant Weight Change',
                    description: `${change > 0 ? '+' : ''}${change.toFixed(1)} lbs in 2 weeks`,
                    recommendation: 'Monitor your diet and exercise patterns'
                });
            }
        }
    }

    // ============================================================================
    // IF NO ISSUES FOUND
    // ============================================================================
    
    if (weaknesses.length === 0) {
        weaknesses.push({
            type: 'success',
            severity: 'good',
            title: 'Excellent Work! 🎉',
            description: 'All habits are being tracked consistently',
            recommendation: 'Keep up this amazing momentum!'
        });
    }

    // Sort by severity (high first)
    const severityOrder = { high: 0, medium: 1, low: 2, good: 3 };
    weaknesses.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return { weaknesses };
}

// ============================================================================
// UNCHANGED: Health stats calculation (was working correctly)
// ============================================================================

function calculateHealthStats(rows) {
    if (rows.length === 0) {
        return {
            last7Days: [],
            averageSleep: 0,
            averageMood: 0,
            recentEntries: []
        };
    }

    const last7 = rows.slice(0, 7);
    
    const last7Days = last7.map(row => ({
        day: row.day_number,
        sleep: row.sleep_hours || 0,
        mood: row.mood_rating || 0,
        wellness: row.wellness_score || 0
    })).reverse();

    const avgSleep = last7.reduce((sum, r) => sum + (r.sleep_hours || 0), 0) / last7.length;
    const avgMood = last7.reduce((sum, r) => sum + (r.mood_rating || 0), 0) / last7.length;

    return {
        last7Days,
        averageSleep: Math.round(avgSleep * 10) / 10,
        averageMood: Math.round(avgMood * 10) / 10,
        recentEntries: rows.slice(0, 31)
    };
}


// ============================================================================
// SERVER STARTUP
// ============================================================================
app.listen(PORT, () => {
    console.log('================================================================================');
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log('✓ Database: database.db (WITH HABIT HEADERS)');
    console.log('✓ All data isolated per user');
    console.log('================================================================================');
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('\n✓ Database connection closed');
        }
        process.exit(0);
    });
});