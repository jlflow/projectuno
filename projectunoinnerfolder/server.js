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