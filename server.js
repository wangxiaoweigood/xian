// Simple WebSocket server for pairing two players and relaying moves
// Usage: node server.js

const http = require('http');
const WebSocket = require('ws');
const port = process.env.PORT || 3000;

// Create a minimal HTTP server so plain HTTP GETs (health checks / browser visits)
// get a friendly response instead of "Upgrade Required". This also allows platforms
// like Render to probe the endpoint with an HTTP request.
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('米字三子连线 WebSocket server');
});

const wss = new WebSocket.Server({ server });
server.listen(port, () => {
  console.log('HTTP+WebSocket server listening on port', port);
});

const initialBoard = ['X','X','X', null, null, null, 'O','O','O'];

// win lines (米字)
const winLines = [
  [3,4,5],
  [1,4,7],
  [0,4,8],
  [2,4,6]
];

// allowed move lines (rows, cols, diags) for one-step moves
const moveLines = [
  [0,1,2],
  [3,4,5],
  [6,7,8],
  [0,3,6],
  [1,4,7],
  [2,5,8],
  [0,4,8],
  [2,4,6]
];

function getAllowedTargets(board, sel){
  if (sel === null) return [];
  const allowed = new Set();
  for (const line of moveLines){
    const pos = line.indexOf(sel);
    if (pos === -1) continue;
    const neighbors = [];
    if (pos - 1 >= 0) neighbors.push(line[pos - 1]);
    if (pos + 1 < line.length) neighbors.push(line[pos + 1]);
    for (const idx of neighbors){
      if (board[idx] === null) allowed.add(idx);
    }
  }
  return Array.from(allowed);
}

function checkWin(board){
  for (const line of winLines){
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

// simple pairing queue
const queue = [];
const rooms = new Map(); // roomId -> {players: [ws, ws], board, turn}
let nextRoomId = 1;

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', ()=> ws.isAlive = true);

  ws.on('message', (msg) => {
    let data = null;
    try { data = JSON.parse(msg.toString()); } catch(e){ return; }
    const { type } = data;
    if (type === 'join') {
      // add to queue and try pair
      queue.push(ws);
      ws.send(JSON.stringify({ type:'queued' }));
      tryPair();
    } else if (type === 'leave') {
      leaveQueue(ws);
    } else if (type === 'move') {
      // {room, from, to}
      const room = rooms.get(data.room);
      if (!room) return;
      const idx = room.players.indexOf(ws);
      if (idx === -1) return;
      const side = idx === 0 ? 'X' : 'O';
      if (room.turn !== side) {
        ws.send(JSON.stringify({ type:'error', reason:'not your turn' }));
        return;
      }
      // validate move: from must have player's piece, to empty and allowed one-step
      if (room.board[data.from] !== side || room.board[data.to] !== null) {
        ws.send(JSON.stringify({ type:'error', reason:'invalid move' }));
        return;
      }
      const allowed = getAllowedTargets(room.board, data.from);
      if (!allowed.includes(data.to)) {
        ws.send(JSON.stringify({ type:'error', reason:'move not allowed' }));
        return;
      }
      // apply move
      room.board[data.from] = null;
      room.board[data.to] = side;
      // broadcast move to both
      broadcastRoom(room, { type:'opponent_move', from:data.from, to:data.to, side });
      // check win
      const w = checkWin(room.board);
      if (w){
        broadcastRoom(room, { type:'game_over', winner: side, line: w });
        // teardown room
        rooms.delete(data.room);
      } else {
        // switch turn
        room.turn = room.turn === 'X' ? 'O' : 'X';
        broadcastRoom(room, { type:'turn', turn: room.turn });
      }
    }
  });

  ws.on('close', () => {
    leaveQueue(ws);
    // if was in a room, notify opponent
    for (const [roomId, room] of rooms.entries()){
      const idx = room.players.indexOf(ws);
      if (idx !== -1){
        const other = room.players[1-idx];
        if (other && other.readyState === WebSocket.OPEN){
          other.send(JSON.stringify({ type:'opponent_left' }));
        }
        rooms.delete(roomId);
      }
    }
  });
});

function tryPair(){
  while (queue.length >= 2){
    const a = queue.shift();
    const b = queue.shift();
    const roomId = String(nextRoomId++);
    const room = { players:[a,b], board: initialBoard.slice(), turn:'X' };
    rooms.set(roomId, room);
    // assign sides: a -> X, b -> O
    a.send(JSON.stringify({ type:'start', room: roomId, side:'X', board: room.board, turn: room.turn }));
    b.send(JSON.stringify({ type:'start', room: roomId, side:'O', board: room.board, turn: room.turn }));
  }
}

function leaveQueue(ws){
  const i = queue.indexOf(ws);
  if (i !== -1) queue.splice(i,1);
}

function broadcastRoom(room, msg){
  const s = JSON.stringify(msg);
  for (const p of room.players){
    if (p && p.readyState === WebSocket.OPEN) p.send(s);
  }
}

// heartbeat
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);


