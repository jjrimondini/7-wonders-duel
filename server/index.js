// Server di "Fumo & Ferro": serve il tabellone (/board) e il controller telefono (/play)
// e tiene lo stato autoritativo della partita, condiviso via WebSocket.

import express from 'express';
import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import QRCode from 'qrcode';
import { createGame, applyAction } from './game/engine.js';
import { publicView, playerView } from './game/views.js';

const PORT = Number(process.env.PORT) || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

function lanAddress() {
  const candidates = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) candidates.push({ name, address: a.address });
    }
  }
  // Preferisce le reti domestiche tipiche ed evita adattatori virtuali.
  const score = (c) => (/^192\.168\./.test(c.address) ? 3 : /^10\./.test(c.address) ? 2 : /^172\./.test(c.address) ? 1 : 0)
    - (/vEthernet|VirtualBox|VMware|WSL|Hyper-V/i.test(c.name) ? 10 : 0);
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0]?.address || 'localhost';
}

const HOST = lanAddress();
const PLAY_URL = `http://${HOST}:${PORT}/play/`;

// ───────────── stato della stanza ─────────────

const seats = [null, null]; // { token, name }
let game = null;
const sockets = new Set();

function seatOf(token) {
  return seats.findIndex((s) => s && s.token === token);
}

function lobbyInfo() {
  return seats.map((s, i) => ({
    taken: !!s,
    name: s?.name || null,
    connected: [...sockets].some((ws) => ws.seat === i),
  }));
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast() {
  const lobby = lobbyInfo();
  for (const ws of sockets) {
    if (ws.role === 'board') {
      send(ws, { type: 'state', lobby, playUrl: PLAY_URL, game: game ? publicView(game) : null });
    } else if (ws.role === 'player') {
      const view = game && ws.seat >= 0 ? playerView(game, ws.seat) : null;
      send(ws, { type: 'state', lobby, seat: ws.seat, game: view });
    }
  }
}

function startGameIfReady() {
  if (!game && seats[0] && seats[1]) {
    game = createGame({ names: [seats[0].name, seats[1].name] });
  }
}

function handle(ws, msg) {
  switch (msg.type) {
    case 'hello': {
      ws.role = msg.role === 'board' ? 'board' : 'player';
      ws.seat = -1;
      if (ws.role === 'player' && msg.token) {
        const s = seatOf(msg.token);
        if (s >= 0) ws.seat = s;
      }
      return broadcast();
    }
    case 'join': {
      if (ws.role !== 'player') return;
      const seat = Number(msg.seat);
      if (![0, 1].includes(seat)) return;
      const name = String(msg.name || '').trim().slice(0, 16) || `Giocatore ${seat + 1}`;
      if (seats[seat] && seats[seat].token !== msg.token) {
        return send(ws, { type: 'error', error: 'Posto già occupato' });
      }
      const token = seats[seat]?.token || crypto.randomUUID();
      seats[seat] = { token, name };
      if (game) game.players[seat].name = name;
      ws.seat = seat;
      send(ws, { type: 'joined', seat, token });
      startGameIfReady();
      return broadcast();
    }
    case 'leave': {
      if (ws.role !== 'player' || ws.seat < 0 || game) return;
      seats[ws.seat] = null;
      ws.seat = -1;
      return broadcast();
    }
    case 'action': {
      if (!game || ws.role !== 'player' || ws.seat < 0) return;
      const res = applyAction(game, ws.seat, msg.action);
      if (!res.ok) return send(ws, { type: 'error', error: res.error });
      return broadcast();
    }
    case 'newGame': {
      // Dal tabellone in qualsiasi momento, dai telefoni solo a partita finita.
      const allowed = ws.role === 'board' || (game && game.phase === 'over' && ws.seat >= 0);
      if (!allowed) return;
      game = null;
      startGameIfReady();
      return broadcast();
    }
    case 'resetSeats': {
      if (ws.role !== 'board') return;
      seats[0] = seats[1] = null;
      game = null;
      for (const s of sockets) if (s.role === 'player') { s.seat = -1; send(s, { type: 'kicked' }); }
      return broadcast();
    }
    default:
  }
}

// ───────────── HTTP ─────────────

const app = express();
app.get('/', (_req, res) => res.redirect('/board/'));
app.get('/api/qr', async (_req, res) => {
  const svg = await QRCode.toString(PLAY_URL, { type: 'svg', margin: 1, color: { dark: '#2b1d0e', light: '#f3e2b8' } });
  res.type('image/svg+xml').send(svg);
});
app.use(express.static(PUBLIC));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.role = null;
  ws.seat = -1;
  ws.isAlive = true;
  sockets.add(ws);
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    try { handle(ws, msg); } catch (e) {
      console.error('Errore gestendo', msg, e);
      send(ws, { type: 'error', error: 'Errore del server' });
    }
  });
  ws.on('close', () => { sockets.delete(ws); broadcast(); });
});

// I telefoni in standby lasciano connessioni morte: le ripuliamo.
setInterval(() => {
  for (const ws of sockets) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 15000);

server.listen(PORT, '0.0.0.0', async () => {
  console.log('\n  ⚙  FUMO & FERRO  ⚙\n');
  console.log(`  Tabellone (apri sul PC):  http://localhost:${PORT}/board/`);
  console.log(`  Telefoni (stessa Wi-Fi):  ${PLAY_URL}\n`);
  try {
    console.log(await QRCode.toString(PLAY_URL, { type: 'terminal', small: true }));
  } catch { /* opzionale */ }
});
