const sqlite3 = require('sqlite3').verbose();

// 1. Create (or open) the database file
const db = new sqlite3.Database('./chat.db');

// 2. Run these commands sequentially
db.serialize(() => {

    // Create 'rooms' table
    // It stores the Room Code (Unique) and the Password
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        password TEXT,
        created_at TEXT
    )`);

    // Create 'messages' table
    // It stores who sent it, when, and in which room
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT,
        sender_id TEXT,
        text TEXT,
        time TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log("DATABASE SETUP COMPLETE: 'chat.db' created successfully.");
});

// 3. Close connection
db.close();