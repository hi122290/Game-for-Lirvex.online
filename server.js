const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Render needs a basic health check to see the app is "alive"
app.get('/', (req, res) => {
    res.send('Zombie Server is Running!');
});

let rooms = {}; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        if (!rooms[roomId]) rooms[roomId] = { players: {} };
        console.log(`User ${socket.id} joined room: ${roomId}`);

        socket.on('move', (data) => {
            if (rooms[roomId]) {
                rooms[roomId].players[socket.id] = data;
                socket.to(roomId).emit('update_players', { id: socket.id, ...data });
            }
        });

        socket.on('disconnect', () => {
            if (rooms[roomId] && rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                io.to(roomId).emit('remove_player', socket.id);
            }
        });
    });
});

// IMPORTANT: Render provides the PORT through process.env.PORT
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully started on port ${PORT}`);
});