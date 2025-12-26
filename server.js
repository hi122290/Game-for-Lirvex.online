const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

// Bulletproof CORS: Allows any website (Lirvex, local, etc) to connect
const io = new Server(httpServer, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Health check for Render
app.get('/', (req, res) => {
    res.status(200).send('Zombie Server is LIVE');
});

let currentMapId = 0;

io.on('connection', (socket) => {
    console.log('Player Joined:', socket.id);

    socket.on('join_room', (roomId) => {
        socket.join(roomId);
        socket.emit('map_change', currentMapId);
    });

    socket.on('move', (data) => {
        // Broadcast to everyone in the room except the sender
        socket.to('global').emit('update_players', { id: socket.id, ...data });
    });

    socket.on('disconnect', () => {
        io.emit('remove_player', socket.id);
        console.log('Player Left:', socket.id);
    });
});

// CRITICAL: Must use 0.0.0.0 to be visible to the public internet
const PORT = process.env.PORT || 10000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> SERVER SUCCESSFULLY RUNNING ON PORT ${PORT} <<<`);
});

// Prevent "Status 1" by catching errors before they kill the process
process.on('uncaughtException', (err) => {
    console.error('SERVER CRASH PREVENTED:', err);
});
