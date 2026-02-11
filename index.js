'use strict';

require('dotenv').config();

const socket = require('socket.io-client')('http://localhost:3000');

socket.on('connect', () => {
    console.log('Socket connected.');
});

socket.on('connect_error', (err) => {
    console.error('Connection Error:', err);
});

socket.on('disconnect', (reason) => {
    if (reason === 'io client disconnect') {
        console.error('Disconnected due to manual disconnection.');
    } else {
        console.error('Disconnected:', reason);
    }
});

socket.on('reconnect_attempt', (attempt) => {
    console.log(`Reconnect attempt #${attempt}`);
});

socket.on('error', (error) => {
    console.error('Socket Error:', error);
});
