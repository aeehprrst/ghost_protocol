const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const sqlite3 = require('sqlite3').verbose(); // Import SQLite

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- CONNECT TO LOCAL DATABASE ---
const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) console.error("DB Error:", err.message);
    else console.log("Connected to SQLite Database (Local File).");
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// --- HELPER: RANDOM STRING ---
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

io.on('connection', (socket) => {
    console.log('User connected: ' + socket.id);

    // 1. CREATE ROOM
    socket.on('create_room', (data) => {
        const roomCode = generateRandomString(6);
        const password = data.password;
        const createdAt = new Date().toISOString();

        // SQL Command: Insert new row into 'rooms'
        db.run(`INSERT INTO rooms (code, password, created_at) VALUES (?, ?, ?)`, 
            [roomCode, password, createdAt], 
            (err) => {
                if (err) {
                    console.log("Error creating room:", err);
                    socket.emit('error_message', "Error creating room. Try again.");
                } else {
                    console.log(`Room Created: ${roomCode}`);
                    socket.emit('room_created', { roomCode, password });
                }
            }
        );
    });

    // 2. JOIN ROOM (Check Password & Load History)
    socket.on('join_room', (data) => {
        const roomCode = data.room;
        const password = data.pass;

        // SQL Command: Find the room
        db.get(`SELECT * FROM rooms WHERE code = ?`, [roomCode], (err, row) => {
            if (err) {
                socket.emit('error_message', "Database Error.");
                return;
            }

            if (row) {
                // Room exists, check password
                if (row.password === password) {
                    socket.join(roomCode);
                    socket.emit('join_success', roomCode);

                    // --- LOAD HISTORY ---
                    // Get all messages for this room, sorted by time
                    db.all(`SELECT * FROM messages WHERE room_code = ? ORDER BY id ASC`, [roomCode], (err, rows) => {
                        if (rows) {
                            rows.forEach((msg) => {
                                socket.emit('receive_message', {
                                    text: msg.text,
                                    senderId: msg.sender_id,
                                    time: msg.time
                                });
                            });
                        }
                    });

                    // Notify others
                    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    socket.to(roomCode).emit('receive_message', {
                        text: "A new agent has joined the secure channel.",
                        senderId: "SYSTEM",
                        time: time
                    });

                } else {
                    socket.emit('error_message', "Incorrect Password!");
                }
            } else {
                socket.emit('error_message', "Room not found!");
            }
        });
    });

    // 3. SEND MESSAGE (Save to DB)
    socket.on('send_message', (data) => {
        const roomCode = data.room;
        const message = data.message;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // USE THE ID SENT FROM THE FRONTEND (The Permanent One)
        const senderId = data.senderId; 

        // SQL Command: Insert message
        db.run(`INSERT INTO messages (room_code, sender_id, text, time) VALUES (?, ?, ?, ?)`, 
            [roomCode, senderId, message, time], 
            (err) => {
                if (err) console.error("Error saving message:", err);
            }
        );

        // Broadcast to room
        io.to(roomCode).emit('receive_message', {
            text: message,
            senderId: senderId,
            time: time
        });
    });

    // 4. TYPING
    socket.on('typing', (data) => {
        socket.to(data.room).emit('display_typing', { senderId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log("User disconnected");
    });
});

server.listen(3000, () => {
  console.log('LISTENING ON PORT 3000 (SQLite Mode)');
});