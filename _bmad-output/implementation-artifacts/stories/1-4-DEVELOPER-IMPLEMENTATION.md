# Story 1.4: Player Session Management - Developer Implementation

## Implementation Complete ✅

Story 1.4 has been fully implemented as a developer with all required functionality for managing game sessions.

## Files Created/Modified

### 1. **GameSessionManager.js** (NEW)
📄 `picture-this-server/src/game/GameSessionManager.js`

A complete, production-ready session management class with:
- **Code Generation**: Generates unique 6-character alphanumeric codes with collision detection
- **O(1) Lookup**: Uses JavaScript Map for constant-time session retrieval by code
- **Session Lifecycle**: Create, join, leave, timeout, cleanup
- **Event System**: Custom event emitters for monitoring session events
- **Timeout Detection**: Automatic detection and cleanup of inactive sessions
- **Statistics**: Real-time session statistics and metrics

#### Key Methods

```javascript
// Create a new session
createSession(hostId, maxRounds = 5, maxPlayers = 8) -> GameSession

// Retrieve a session
getSessionByCode(code) -> GameSession | null
getSessionByGameId(gameId) -> GameSession | null

// Player management
joinSession(code, player) -> GameSession
removePlayerFromSession(code, playerId) -> GameSession

// Session control
updateSessionPhase(code, newPhase) -> GameSession
updateCurrentRound(code, roundNumber) -> GameSession
updateRoundContent(code, sentence, nouns) -> GameSession
endSession(code) -> GameSession

// Maintenance
checkTimeouts() -> Array<string>
cleanupSession(code) -> GameSession | null
cleanupTimedOutSessions() -> Array<string>
getAllActiveSessions() -> Array<GameSession>
getStatistics() -> Object

// Events
on(eventName, callback) -> void
```

#### Event Hooks

- `onSessionCreated(gameId, code)`
- `onPlayerJoined(code, playerId, playerCount)`
- `onPlayerLeft(code, playerId, playerCount)`
- `onPhaseChanged(code, oldPhase, newPhase)`
- `onSessionEnded(code)`
- `onSessionTimedOut(code)`
- `onSessionCleaned(code)`
- `onHostDisconnected(code)`

### 2. **Test Suite** (NEW)
📄 `picture-this-server/tests/test-session-manager.js`

Comprehensive test suite with **15 passing tests**:

```
✓ Create session generates unique code
✓ Get session by code returns correct session
✓ Session lookup handles case insensitivity
✓ Join session adds player to player list
✓ Cannot join session after game has started
✓ Remove player from session
✓ Phase transitions are validated
✓ Update last activity refreshes timestamp
✓ Code generation prevents collisions
✓ Get all active sessions returns correct list
✓ Timeout checker identifies inactive sessions
✓ Cleanup removes session from active registry
✓ Event listeners are called on session events
✓ Get statistics returns correct counts
✓ Session enforces maximum players limit

Tests Passed: 15/15 ✓
```

**Run tests with:**
```bash
cd picture-this-server
node tests/test-session-manager.js
```

### 3. **Server Integration** (MODIFIED)
📄 `picture-this-server/server.js`

Updated to integrate GameSessionManager:
- Import GameSessionManager module
- Initialize sessionManager with configuration
- Register event listeners for logging
- Add new REST API endpoints
- Update graceful shutdown to cleanup sessions

### 4. **REST API Endpoints** (NEW)

#### Create Session
```
POST /api/session/create
Authorization: Bearer <JWT_TOKEN>
{
  "maxRounds": 5,
  "maxPlayers": 8
}

Response:
{
  "success": true,
  "gameId": "550e8400-e29b-41d4-a716-446655440001",
  "code": "ABC123",
  "status": "lobby"
}
```

#### Get Session Info
```
GET /api/session/:code

Response:
{
  "gameId": "550e8400-e29b-41d4-a716-446655440001",
  "code": "ABC123",
  "hostId": "user-001",
  "currentPhase": "lobby",
  "currentRound": 0,
  "maxRounds": 5,
  "status": "lobby",
  "playerCount": 3,
  "maxPlayers": 8,
  "players": [
    {
      "playerId": "user-001",
      "name": "Sarah",
      "avatar": "🎨",
      "isHost": true,
      "joinedAt": "2026-02-08T14:30:00Z"
    }
  ]
}
```

#### Join Session
```
POST /api/session/:code/join
{
  "playerId": "user-002",
  "name": "Mike",
  "avatar": "🎭"
}

Response:
{
  "success": true,
  "gameId": "550e8400-e29b-41d4-a716-446655440001",
  "code": "ABC123",
  "playerCount": 2,
  "maxPlayers": 8
}
```

#### Get Session Statistics
```
GET /api/session/stats/all

Response:
{
  "sessions": 3,
  "lobbyCount": 1,
  "inProgressCount": 2,
  "totalPlayers": 12,
  "activeCodes": ["ABC123", "DEF456", "GHI789"]
}
```

#### Debug Session State
```
GET /api/debug/session/:code

Response:
{
  "session": { /* full GameSession object */ },
  "timestamp": 1770570391609
}
```

## Session Data Structure

```javascript
{
  gameId: "550e8400-e29b-41d4-a716-446655440001",
  code: "ABC123",                              // 6-char unique code
  hostId: "user-001",                         // UUID of host
  createdAt: "2026-02-08T14:30:00Z",
  lastActivityAt: "2026-02-08T14:35:22Z",
  maxRounds: 5,                               // 1-20
  currentRound: 0,
  currentPhase: "lobby",                      // lobby|round_intro|card_selection|judge_phase|results|completed
  maxPlayers: 8,                              // 2-16
  status: "lobby",                            // lobby|in_progress|completed|inactive
  players: [
    {
      playerId: "user-001",
      name: "Sarah",
      avatar: "🎨",
      isHost: true,
      joinedAt: "2026-02-08T14:30:00Z"
    }
  ],
  sentenceTemplate: null,                     // Current sentence
  selectedNouns: [],                          // Current round nouns
  timeoutMinutes: 60
}
```

## Configuration

Session manager is initialized with these defaults:

```javascript
const sessionManager = new GameSessionManager({
  timeoutMinutes: process.env.GAME_SESSION_TIMEOUT_MINUTES || 60,
  checkIntervalSeconds: 300  // Check every 5 minutes
});
```

**Environment Variables:**
- `GAME_SESSION_TIMEOUT_MINUTES`: Inactivity timeout (default: 60)

## Code Generation Algorithm

```
1. Generate random 6-character string from [A-Z0-9]
2. Check if code exists in activeGameCodes Set
3. If exists, retry (max 10 retries)
4. If not exists, add to Set and return
5. Throw error if max retries exceeded

Complexity: O(1) average case
Probability of collision: ~0 (36^6 = 2.2 billion possible codes)
```

## Session Timeout & Cleanup

```
Every 5 Minutes:
├─ Check all sessions for inactivity
├─ Find sessions without activity for 60+ minutes
├─ Mark as "inactive"
├─ Remove from active registry
└─ Emit 'onSessionTimedOut' event

Manual Cleanup:
├─ On host disconnect → cleanupSession(code)
├─ On game completion → endSession(code)
└─ Optional archival for history
```

## Phase Transitions

Valid transitions:
```
lobby → round_intro → card_selection → judge_phase → results → (round_intro OR completed)
completed ↛ (no further transitions)
```

## Integration with Other Stories

### Story 1.2 (Game State Management)
- Session contains GameState
- GameState lives inside Session object
- SessionManager tracks multiple concurrent GameStates

### Story 1.5 (Google OAuth)
- Create session endpoint requires authentication (`auth.requireAuth`)
- hostId linked to authenticated user
- Session tied to user's OAuth identity

### Story 1.6 (Create Game)
- Create Game endpoint calls `sessionManager.createSession()`
- Returns session code for players to join

### Story 3.1 (Player Join)
- Players use code to join via `sessionManager.joinSession()`
- SessionManager validates access and adds player

## Testing

### Run Unit Tests
```bash
cd picture-this-server
node tests/test-session-manager.js
```

### Manual Testing with cURL

Create a session:
```bash
curl -X POST http://localhost:3000/api/session/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maxRounds": 5,
    "maxPlayers": 8
  }'
```

Join a session:
```bash
curl -X POST http://localhost:3000/api/session/ABC123/join \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "user-123",
    "name": "John",
    "avatar": "🎭"
  }'
```

Get session info:
```bash
curl http://localhost:3000/api/session/ABC123
```

Get statistics:
```bash
curl http://localhost:3000/api/session/stats/all
```

## Performance Characteristics

| Operation | Time | Space |
|-----------|------|-------|
| Create Session | O(1) | O(1) |
| Get by Code | O(1) | - |
| Join Session | O(1) | O(1) |
| Remove Player | O(n) | O(1) |
| Check Timeouts | O(n) | O(k) |
| Cleanup | O(1) | - |

Where n = number of active sessions, k = number of timed out sessions

## Error Handling

```javascript
// Missing session
SessionNotFoundError: "Session not found: ABC123"

// Full session
GameAlreadyStartedError: "Cannot join game that has already started"

// Invalid transition
InvalidPhaseTransitionError: "Cannot transition from X to Y"

// Code generation failure
CodeGenerationFailedError: "Failed to generate unique code"

// Parameter validation
"Invalid session: maxPlayers must be between 2 and 16"
```

## Monitoring & Logging

All important events are logged:
```
[INFO] Session created via API: gameId=XXX code=ABC123
[DEBUG] Player joined session: code=ABC123 playerId=user-123 playerCount=2
[INFO] Session ended: code=ABC123
[WARN] Session timed out: code=ABC123
[WARN] Host disconnected from session: code=ABC123
```

## Next Steps

### For Database Implementation (Story 2)
1. Create `game_sessions` table
2. Add unique index on `code`
3. Add index on `hostId` for quick lookups
4. Add index on `lastActivityAt` for cleanup queries
5. Migrate from in-memory Map to PostgreSQL

### For Socket.io Integration
1. Emit session updates via Socket.io
2. Real-time player count updates
3. Phase transition broadcasts
4. Automatic disconnect handling

### For Production Hardening
1. Rate limiting on session creation
2. DDoS protection
3. Session archival strategy
4. Metrics/monitoring integration
5. Session recovery on server restart

## Acceptance Criteria Status

✅ Generate unique 6-character alphanumeric game code  
✅ Store session metadata: creation time, host player ID, max rounds, current phase  
✅ Session timeout after 60 minutes of inactivity  
✅ Support multiple concurrent games (isolated state per game)  
✅ Session cleanup on host disconnect or game end  
✅ Prevent code collisions (check before generating new code)  
✅ Code is case-insensitive (normalized to uppercase)  
✅ Session can be looked up by code quickly (O(1) complexity)  

## Conclusion

Story 1.4 is **fully implemented** with:
- ✅ Complete GameSessionManager class
- ✅ 15 passing unit tests
- ✅ REST API endpoints
- ✅ Server integration
- ✅ Event system
- ✅ Timeout/cleanup logic
- ✅ Comprehensive documentation

Ready for developer use and ready to integrate with dependent stories (1.5, 1.6, 3.1).
