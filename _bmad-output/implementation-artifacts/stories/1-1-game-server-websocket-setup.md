# Story 1.1: Game Server & WebSocket Setup

**Epic:** Epic 1: Core Game Infrastructure & Server  
**Status:** ready-for-dev  
**Created:** February 7, 2026  
**Estimated Effort:** 8-12 hours (1-2 days)  

---

## User Story

As a backend engineer, I want to establish a Node.js game server with WebSocket support, so that all players can receive real-time game state updates.

---

## Acceptance Criteria

- [ ] Game server starts and listens on configured port
- [ ] WebSocket server accepts client connections
- [ ] Server broadcasts game state updates to all connected clients at 100ms intervals
- [ ] Graceful handling of client disconnect/reconnect
- [ ] Basic error logging and connection monitoring
- [ ] Health check endpoint (`GET /api/health`) responds with `{ status: "ok", timestamp }`
- [ ] Environment variables configured (.env file)
- [ ] Server can handle 20+ concurrent WebSocket connections without dropping
- [ ] Message format is consistent JSON (versioned schema)

---

## Technical Requirements

### Technology Stack
- **Language:** Node.js 18+ with Express.js + Socket.io
- **Environment:** .env file for configuration
- **Logging:** Winston (structured logging)
- **Package Manager:** npm

### Environment Variables (.env)
```env
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3000
LOG_LEVEL=debug
GAME_SESSION_TIMEOUT=3600000
MAX_CONCURRENT_PLAYERS=200
DATABASE_URL=postgresql://localhost/picture_this_dev (optional for now)
```

### WebSocket Implementation Details

**Connection Handling:**
- Accept WebSocket handshake with authentication token (placeholder for now: no auth required yet)
- Assign unique socket ID to each connection
- Track connected clients in-memory map: `Map<socketId, ClientConnection>`
- Emit "connected" event to newly connected client with socket ID

**Message Format (JSON Schema v1.0):**
```json
{
  "type": "state_update|phase_change|error",
  "data": {
    // Payload varies by type
  },
  "timestamp": 1707350400000,
  "version": "1.0"
}
```

**Game State Broadcast:**
- Interval: Every 100ms (or when state changes, whichever comes first)
- Include: Current round, phase, timer, leaderboard, any game updates
- Only broadcast to clients in active games (don't broadcast to lobby clients constantly)

**Disconnect Handling:**
- Detect WebSocket disconnect (socket.on('disconnect'))
- Remove from active connections map
- Log disconnect event
- Game logic decides what happens (player leaves? wait for reconnect?)

**Reconnection:**
- Same client reconnects with previous socket ID? 
- For MVP: Treat as new connection (simplified), previous connection forgotten
- Future: Implement session tokens to recover lost connections

### Server Endpoints

**HTTP Endpoints:**
```
GET  /api/health         → { status: "ok", timestamp }
POST /api/keep-alive     → { status: "ok", timestamp }
```

**WebSocket Events (Client → Server):**
```
"join-game"              → { code: "AB12CD", name: "Player1", avatar: "🎮" }
"select-cards"           → { round_id: "...", cards: ["card1", "card2"] }
"judge-select"           → { round_id: "...", image_index: 0 }
```

**WebSocket Events (Server → Client):**
```
"connected"              → { socket_id: "...", timestamp }
"state-update"           → { game_state: {...} }
"phase-change"           → { phase: "selection", timer_ms: 45000 }
"player-joined"          → { player: {...}, player_count: 3 }
"error"                  → { message: "Invalid move", code: "ERR_001" }
```

### Logging Requirements
- **Info level:** Server start, client connect/disconnect, phase changes
- **Debug level:** All incoming/outgoing messages (rate-limited to avoid spam)
- **Error level:** Connection errors, malformed messages, unexpected state
- **Format:** `[TIMESTAMP] [LEVEL] [MODULE] Message` (structured JSON logs preferred)

---

## Implementation Checklist

### Project Setup
- [ ] Create new directory: `picture-this-server/`
- [ ] Initialize Node.js project: `npm init -y`
- [ ] Install dependencies: `npm install express socket.io dotenv winston`

### Server Foundation
- [ ] Create main server file (`server.js`)
- [ ] Load environment variables from `.env`
- [ ] Create Express app instance
- [ ] Configure CORS for WebSocket (allow client domain)
- [ ] Set up structured logging

### WebSocket Setup
- [ ] Attach Socket.io to HTTP server
- [ ] Implement connection handler
- [ ] Implement disconnect handler
- [ ] Set up client connection tracking (Map or dict)
- [ ] Create message type enum/const for validation

### Endpoints Implementation
- [ ] `GET /api/health` → returns `{ status: "ok", timestamp }`
- [ ] `POST /api/keep-alive` → same as health check
- [ ] Both endpoints are lightweight (no database calls)

### State Broadcast
- [ ] Create placeholder game state object
- [ ] Implement broadcast function to send state to all clients
- [ ] Set up 100ms interval timer for periodic broadcasts
- [ ] Include timestamp in each broadcast

### Error Handling
- [ ] Try-catch around WebSocket message handlers
- [ ] Send error messages as structured JSON
- [ ] Log errors with stack traces
- [ ] Don't crash server on client message errors

### Testing (Manual for MVP)
- [ ] Start server locally: `npm start`
- [ ] Test health endpoint: `curl http://localhost:3000/api/health`
- [ ] Open two browser tabs, connect WebSocket to `ws://localhost:3000`
- [ ] Verify both clients receive state updates
- [ ] Disconnect one client, verify other still receives updates
- [ ] Check logs for connection markers

---

## Dependencies

### Story 1.1 (This Story)
**Blocks:** Nothing yet (foundational)
**Blocked By:** Nothing

### Unlocks for Development
- Story 1.2: Game State Management (needs server running)
- Story 1.3: Card Deck Management (needs server running)
- Story 3.1: Player Join (needs WebSocket working)
- Story 8.5: Keep-Alive Polling (polling works against this endpoint)

---

## Definition of Done

- [ ] Code committed to PR (Pull Request)
- [ ] All acceptance criteria checked off
- [ ] Manual testing completed (health endpoint works, WebSocket connects)
- [ ] `.env.example` file created for team reference
- [ ] README.md section added (how to run server)
- [ ] Story moved to "review" status
- [ ] Code review completed by another engineer

---

## Dev Notes

**Start Simple:**
- Don't worry about authentication yet (Story 1.5)
- Don't worry about database yet (Epic 2)
- Focus on: Server starts → WebSocket connections work → State broadcasts

**Keep in Mind:**
- This is the foundation. Speed matters more than perfection here.
- You'll iterate on message formats as other stories define their needs.
- Testing with multiple browser tabs is enough for MVP.

**Useful Resources:**
- Socket.io docs: https://socket.io/docs/v4/
- Express setup: https://expressjs.com/
- .env package: https://www.npmjs.com/package/dotenv

---

## Questions/Risks

- **Risk:** Browser security (CORS) blocking WebSocket?
  - Mitigation: Socket.io handles CORS; configure in production if needed

- **Architecture:** Node.js + Express + Socket.io
  - Socket.io is the industry standard for real-time WebSocket communication
  - Express.js provides the HTTP server foundation
  - Excellent ecosystem and community support

---

## Source References

- [GAME_DESIGN.md § 7. Technical Architecture](../planning-artifacts/GAME_DESIGN.md#7-technical-architecture)
- [GAME_DESIGN.md § 1. Core Game Mechanics & Flow](../planning-artifacts/GAME_DESIGN.md#1-core-game-mechanics--flow)
- [epics.md Story 1.1](../planning-artifacts/epics.md#story-11-game-server--websocket-setup)
