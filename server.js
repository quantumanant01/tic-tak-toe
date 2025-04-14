const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = {};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            const roomId = data.roomId;
            if (!rooms[roomId]) {
                rooms[roomId] = { players: [], board: Array(9).fill("") };
            }

            const room = rooms[roomId];
            if (room.players.length < 2) {
                room.players.push(ws);
                const symbol = room.players.length === 1 ? 'X' : 'O';
                ws.send(JSON.stringify({ type: 'assignSymbol', symbol }));

                if (room.players.length === 2) {
                    room.players.forEach((player, index) => {
                        player.send(JSON.stringify({
                            type: 'gameStart',
                            symbol: index === 0 ? 'X' : 'O'
                        }));
                    });
                }
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
            }
        } else if (data.type === 'move') {
            const room = rooms[data.roomId];
            if (room) {
                room.board[data.index] = data.symbol;
                const nextPlayer = data.symbol === 'X' ? 'O' : 'X';
                room.players.forEach(player => {
                    player.send(JSON.stringify({
                        type: 'move',
                        index: data.index,
                        symbol: data.symbol,
                        nextPlayer
                    }));
                });
            }
        } else if (data.type === 'reset') {
            const room = rooms[data.roomId];
            if (room) {
                room.board = Array(9).fill("");
                room.players.forEach(player => {
                    player.send(JSON.stringify({ type: 'reset' }));
                });
            }
        }
    });

    ws.on('close', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const index = room.players.indexOf(ws);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    delete rooms[roomId];
                } else {
                    room.players[0].send(JSON.stringify({
                        type: 'opponentLeft'
                    }));
                }
                break;
            }
        }
    });
});

console.log('WebSocket server running on ws://localhost:8080');