const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Allows Lirvex.online to connect
        methods: ["GET", "POST"]
    }
});

// 1. Health Check for Render
app.get('/', (req, res) => {
    res.send('Zombie Death Run Server is Active!');
});

// 2. Map Rotation Logic (8 Maps)
let currentMapId = 0;
const MAP_COUNT = 8;
const ROTATION_TIME = 5 * 60 * 1000; // 5 Minutes

setInterval(() => {
    currentMapId = (currentMapId + 1) % MAP_COUNT;
    io.emit('map_change', currentMapId);
    console.log(`Map rotated to ID: ${currentMapId}`);
}, ROTATION_TIME);

// 3. Multiplayer State
let rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {} };
        }

        // Send the current map immediately to the new player
        socket.emit('map_change', currentMapId);

        // Handle Movement and Infection Status
        socket.on('move', (data) => {
            if (rooms[roomId]) {
                rooms[roomId].players[socket.id] = data;
                
                // Broadcast position to all other players in the room
                socket.to(roomId).emit('update_players', {
                    id: socket.id,
                    x: data.x,
                    z: data.z,
                    isZombie: data.isZombie
                });
            }
        });

        // Handle Infection Event (when a zombie tags someone)
        socket.on('infect_target', (targetId) => {
            console.log(`Player ${socket.id} infected ${targetId}`);
            io.to(targetId).emit('become_zombie');
        });

        // Cleanup on Leave
        socket.on('disconnect', () => {
            if (rooms[roomId] && rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                io.to(roomId).emit('remove_player', socket.id);
            }
            console.log(`User disconnected: ${socket.id}`);
        });
    });
});

// 4. Start Server
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`-----------------------------------------`);
    console.log(`ZOMBIE SERVER LIVE ON PORT: ${PORT}`);
    console.log(`MAP ROTATION ACTIVE: ${ROTATION_TIME/60000} MINS`);
    console.log(`-----------------------------------------`);
});
