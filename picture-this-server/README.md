# PictureThis Game Server

WebSocket-enabled Node.js game server for the PictureThis game. Built with Express.js and Socket.io.

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm

### Installation

1. Navigate to the server directory:
```bash
cd picture-this-server
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for local development).

4. Start the server:
```bash
npm start
```

The server will start on port 3000 (or whatever PORT is set in .env).

## Configuration

Environment variables (see `.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | HTTP/WebSocket server port | `3000` |
| `WEBSOCKET_PORT` | WebSocket port (same as PORT) | `3000` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `debug` |
| `GAME_SESSION_TIMEOUT` | Game session timeout in ms | `3600000` (1 hour) |
| `MAX_CONCURRENT_PLAYERS` | Max concurrent player connections | `200` |
| `DATABASE_URL` | PostgreSQL connection string (future use) | - |

## API Endpoints

### HTTP Endpoints

#### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1707350400000
}
```

#### Keep-Alive
```
POST /api/keep-alive
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1707350400000
}
```

## WebSocket Events

### Client → Server

#### Join Game
```javascript
socket.emit('join-game', {
  code: "AB12CD",
  name: "Player1",
  avatar: "🎮"
});
```

#### Select Cards
```javascript
socket.emit('select-cards', {
  round_id: "...",
  cards: ["card1", "card2"]
});
```

#### Judge Select Winner
```javascript
socket.emit('judge-select', {
  round_id: "...",
  image_index: 0
});
```

### Server → Client

#### Connected
Sent when a client first connects:
```javascript
socket.on('connected', (message) => {
  // message = { type: 'connected', data: { socket_id, timestamp }, version: '1.0' }
});
```

#### State Update
Broadcast every 100ms to all connected clients:
```javascript
socket.on('state-update', (message) => {
  // message.data.game_state = { round, phase, timer, leaderboard, players, timestamp }
});
```

#### Phase Change
```javascript
socket.on('phase-change', (message) => {
  // message.data = { phase: 'selection', timer_ms: 45000 }
});
```

#### Player Joined
```javascript
socket.on('player-joined', (message) => {
  // message.data = { player: {...}, player_count: 3 }
});
```

#### Error
```javascript
socket.on('error', (message) => {
  // message.data = { message: 'Invalid move', code: 'ERR_001' }
});
```

## Message Format

All WebSocket messages use a consistent JSON schema (v1.0):

```json
{
  "type": "state_update|phase_change|error|connected|player-joined",
  "data": {
    // Payload varies by type
  },
  "timestamp": 1707350400000,
  "version": "1.0"
}
```

## Testing

### Manual Testing with curl

Test health endpoint:
```bash
curl http://localhost:3000/api/health
```

Test keep-alive endpoint:
```bash
curl -X POST http://localhost:3000/api/keep-alive
```

### Manual Testing with Browser

1. Open browser console (F12)
2. Connect to WebSocket:
```javascript
const socket = io('http://localhost:3000');

socket.on('connected', (msg) => {
  console.log('Connected:', msg);
});

socket.on('state-update', (msg) => {
  console.log('State update:', msg);
});

socket.emit('join-game', {
  code: 'TEST01',
  name: 'TestPlayer',
  avatar: '🎮'
});
```

3. Open a second browser tab and repeat - both should receive state updates

## Logging

Server uses Winston for structured logging:

- **Info level:** Server start, client connect/disconnect, phase changes
- **Debug level:** All incoming/outgoing messages (when LOG_LEVEL=debug)
- **Error level:** Connection errors, malformed messages, unexpected state

Log format: `[TIMESTAMP] [LEVEL] Message {metadata}`

## Architecture Notes

- **Single-threaded:** Node.js event loop handles all connections
- **In-memory state:** Game state is stored in memory (database integration in future stories)
- **No authentication:** Authentication will be added in Story 1.5
- **Stateless reconnection:** Reconnections are treated as new connections (session recovery in future)

## Performance

- Handles 20+ concurrent WebSocket connections
- State broadcast interval: 100ms
- Only broadcasts to clients in active games (lobby clients don't receive constant updates)

## Development

### Running in Development Mode
```bash
npm run dev
```

### Graceful Shutdown
Server handles SIGTERM and SIGINT signals for graceful shutdown:
- Stops state broadcast interval
- Closes HTTP server
- Allows existing connections to finish

## Troubleshooting

### Port Already in Use
If you see "EADDRINUSE" error:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

Or change the PORT in `.env`

### WebSocket Connection Failed
- Check CORS configuration if connecting from different origin
- Verify firewall allows WebSocket connections
- Check browser console for specific error messages

## Next Steps

This server provides the foundation for:
- Story 1.2: Game State Management
- Story 1.3: Card Deck Management  
- Story 3.1: Player Join Flow
- Story 8.5: Keep-Alive Polling

## Resources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Winston Logging](https://github.com/winstonjs/winston)
