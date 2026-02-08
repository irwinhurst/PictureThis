# Story 1.6: Host Create Game Session - Implementation

**Status**: ✅ COMPLETE  
**Date**: February 8, 2026  
**Developer**: GitHub Copilot  

---

## Overview

Story 1.6 implements the game session creation flow for authenticated hosts. After logging in with Google OAuth, a host can create a new game session with configurable settings (max players and max rounds), which generates a unique 6-character game code that other players can use to join.

---

## Acceptance Criteria - ✅ All Met

- [x] "Create Game" button visible after host login
- [x] Form to configure: Max players (2-20, default 8), Max rounds (5-20, default 10)
- [x] System generates unique 6-character game code
- [x] Game session created with host_id, code, settings
- [x] Redirect host to game lobby screen showing code and waiting player list
- [x] Display code prominently (large font for TV display)
- [x] "Start Game" button available (disabled until 2+ players joined)

---

## Changes Made

### Backend Endpoint

**File**: `picture-this-server/server.js`

Added new authenticated endpoint for creating game sessions:

```javascript
POST /api/game/create-session
```

**Parameters**:
- `maxPlayers` (number, 2-20, default 8)
- `maxRounds` (number, 5-20, default 10)

**Authentication**: Required (Bearer JWT token in Authorization header)

**Response**:
```json
{
  "success": true,
  "gameId": "a1b2c3d4-e5f6-4789-0abc-def123456789",
  "code": "AB12CD",
  "hostId": "host-uuid",
  "maxPlayers": 8,
  "maxRounds": 10,
  "status": "lobby",
  "createdAt": 1770571239408,
  "settings": {
    "maxPlayers": 8,
    "maxRounds": 10
  }
}
```

**Validation**:
- Max players: 2-20 (rejects if outside range)
- Max rounds: 5-20 (rejects if outside range)
- Authentication required (401 if token invalid)

### GameSessionManager Updates

**File**: `picture-this-server/src/game/GameSessionManager.js`

Updated validation constraints to match Story 1.6 specifications:
- Max players: Extended from 2-16 to 2-20
- Max rounds: Updated from 1-20 to 5-20 (Story 1.6 requirement)
- Timestamps: Changed from ISO strings to numeric values (milliseconds since epoch) for consistency

### Frontend Pages

#### 1. create-game.html
**Path**: `picture-this-server/public/create-game.html`

Features:
- Beautiful gradient UI with purple/pink theme
- Two sliders for configurable settings:
  - Max Players (2-20, default 8)
  - Max Rounds (5-20, default 10)
- Real-time value display with visual feedback
- Form validation before submission
- Loading state with spinner during creation
- Error handling with user-friendly messages
- Responsive design (mobile, tablet, desktop)
- Copy button functionality for game code

#### 2. lobby.html
**Path**: `picture-this-server/public/lobby.html`

Features:
- Large, TV-friendly game code display (72pt font)
- Real-time polling of session data (every 2 seconds)
- Player list with avatars and status
- Player count indicator (e.g., "3/8 players")
- Settings display (max players, max rounds)
- Start Game button (enabled only with 2+ players)
- Cancel Game button (host only)
- Copy button for sharing game code
- Responsive layout for all screen sizes

#### 3. login.html Updates
**Path**: `picture-this-server/public/login.html`

Changes:
- Added "Create New Game" button to authenticated user profile section
- Button size and styling increased for prominence
- Replaces generic "Go to Dashboard" link
- Redirects directly to create-game.html

---

## Flow Diagram

```
User Login (Google OAuth)
    ↓
Login Successful, Token Stored
    ↓
Display Create Game Button
    ↓
Click "Create Game"
    ↓
create-game.html Form
    │
    ├─ Configure Max Players (2-20)
    ├─ Configure Max Rounds (5-20)
    └─ Submit
         ↓
    POST /api/game/create-session (with Bearer token)
         ↓
    Server Validates Parameters
         ├─ Max Players: 2-20 ✓
         ├─ Max Rounds: 5-20 ✓
         └─ Token Valid ✓
              ↓
         GameSessionManager.createSession()
              ├─ Generate unique 6-char code
              ├─ Create session with host_id
              └─ Return gameId, code, settings
                   ↓
         Response 200 + Session Data
              ↓
    Store in localStorage:
    - currentGameCode
    - currentGameId
    - isHost = true
              ↓
    Redirect to lobby.html?code=AB12CD
              ↓
    lobby.html Displays:
    - Large Game Code (AB12CD)
    - Empty player list
    - Settings (Max Players: 8, Max Rounds: 10)
    - Start Game button (disabled - need 2+ players)
              ↓
    Polling /api/session/:code every 2 seconds
         ↓
    As Players Join:
    - Player list updates in real-time
    - Player count increases
    - Start Game button enables when count >= 2
              ↓
    Host Clicks "Start Game"
    → Game begins (Story 1.7+)
```

---

## API Examples

### Create Game Session

```bash
curl -X POST http://localhost:3000/api/game/create-session \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "maxPlayers": 8,
    "maxRounds": 10
  }'
```

**Success Response (201)**:
```json
{
  "success": true,
  "gameId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "code": "GH7K9M",
  "hostId": "a1b2c3d4-e5f6-4789-0abc-def123456789",
  "maxPlayers": 8,
  "maxRounds": 10,
  "status": "lobby",
  "createdAt": 1770571239408,
  "settings": {
    "maxPlayers": 8,
    "maxRounds": 10
  }
}
```

**Error Response (400)**:
```json
{
  "success": false,
  "error": "Max players must be between 2 and 20"
}
```

**Error Response (401)**:
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### Get Session Info (Lobby Polling)

```bash
curl http://localhost:3000/api/session/GH7K9M
```

**Response**:
```json
{
  "gameId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "code": "GH7K9M",
  "hostId": "a1b2c3d4-e5f6-4789-0abc-def123456789",
  "currentPhase": "lobby",
  "currentRound": 0,
  "maxRounds": 10,
  "status": "lobby",
  "playerCount": 3,
  "maxPlayers": 8,
  "players": [
    {
      "playerId": "host-uuid",
      "name": "Alex",
      "avatar": "🎮",
      "isHost": true,
      "joinedAt": 1770571240000
    },
    {
      "playerId": "player-uuid-1",
      "name": "Jordan",
      "avatar": "🎨",
      "isHost": false,
      "joinedAt": 1770571245000
    },
    {
      "playerId": "player-uuid-2",
      "name": "Sam",
      "avatar": "🎭",
      "isHost": false,
      "joinedAt": 1770571250000
    }
  ]
}
```

---

## Test Coverage

**File**: `picture-this-server/tests/test-create-game-session.js`

15 comprehensive unit tests covering:

1. ✓ Create session with default settings
2. ✓ Validate max players minimum (2)
3. ✓ Validate max players maximum (20)
4. ✓ Reject max players < 2
5. ✓ Validate max rounds minimum (5)
6. ✓ Validate max rounds maximum (20)
7. ✓ Generate unique codes for 100+ sessions
8. ✓ Session stores correct host ID
9. ✓ Initial session has no players
10. ✓ Session has creation timestamp
11. ✓ Session returns unique gameId
12. ✓ Code is alphanumeric (uppercase, 6 chars)
13. ✓ Multiple hosts can each create sessions
14. ✓ Session stores maxPlayers and maxRounds
15. ✓ Created session can be retrieved by code

**Test Results**: ✅ 15/15 PASSED

---

## User Experience

### Desktop/Tablet Flow

1. Host logs in with Google OAuth
2. navigates to login.html (authenticated profile displayed)
3. Clicks "Create New Game" button
4. Filled to create-game.html with form:
   - Slider for max players (2-20)
   - Slider for max rounds (5-20)
   - Submit button
5. Configures settings:
   - Adjusts max players to 6
   - Adjusts max rounds to 8
6. Clicks "Create Game"
7. Loading spinner with "Creating your game..."
8. Redirected to lobby.html with:
   - Large 6-character code (e.g., "GH7K9M")
   - Copy button to share code
   - Empty player list
   - Settings display: "6 Max Players, 8 Max Rounds"
   - Disabled "Start Game" button with message "need 1 more"
9. Players join via joining the game code
10. As players join:
    - Player list updates in real-time
    - Start Game button updates: "Start Game (2 players)" → enabled
11. Host clicks "Start Game" to begin

### Mobile Flow

1. Host logs in with Google OAuth on mobile device
2. Taps "Create New Game"
3. Sees responsive sliders optimized for touch
4. Adjusts settings and submits
5. Sees large game code prominently (copyable)
6. Shares code with friends (tap to copy)
7. Waits for players while viewing live player list
8. Starts game when ready

---

## Technical Details

### Code Generation Algorithm

- **Format**: 6 uppercase alphanumeric characters (A-Z, 0-9)
- **Possibility Space**: 36^6 = ~2.2 billion unique codes
- **Collision Detection**: Set-based tracking for O(1) lookup
- **Retry Logic**: 10 attempts before failure (extremely unlikely)
- **Example Codes**: AB12CD, GH7K9M, ZX9QA2

### Session Storage

**In-Memory (Story 1.4/1.6)**:
```javascript
{
  gameId: "uuid",           // Unique game identifier
  code: "AB12CD",           // 6-char code for joining
  hostId: "uuid",           // Host's user ID
  createdAt: 1770571239408, // Timestamp (ms)
  lastActivityAt: 1770571300000,
  maxRounds: 10,            // 5-20
  currentRound: 0,
  currentPhase: "lobby",    // lobby, card_selection, etc.
  maxPlayers: 8,            // 2-20
  status: "lobby",          // lobby, in_progress, completed
  players: [
    {
      playerId: "uuid",
      name: "Alex",
      avatar: "🎮",
      isHost: true,
      joinedAt: 1770571240000
    }
    // ... more players
  ]
}
```

### Token Storage

- **Location**: browser localStorage
- **Key**: `authToken`
- **Format**: JWT (JSON Web Token)
- **Headers**: `Authorization: Bearer {token}`
- **Expiry**: 24 hours (configurable via JWT_EXPIRY)

### Validation

**Client-Side**:
- Real-time slider range validation
- Form submission blocked if invalid
- Error messages displayed immediately

**Server-Side**:
- Max players: 2-20
- Max rounds: 5-20
- Authentication required (Bearer token)
- Token validation via JWT
- User lookup in session

---

## Dependencies

- **express**: HTTP server
- **uuid**: Unique ID generation
- **passport-google-oauth20**: Google OAuth authentication
- **jsonwebtoken**: JWT token handling
- **express-session**: Session management

---

## Configuration

### Environment Variables

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=24h
SESSION_SECRET=your-session-secret
GAME_SESSION_TIMEOUT_MINUTES=60
```

---

## Integration Points

### Story 1.4 (Player Session Management)
- Uses GameSessionManager.createSession()
- Returns game code and session data
- Emits onSessionCreated event

### Story 1.5 (Google OAuth)
- Uses authenticated user (via JWT)
- Stores hostId from req.user.id
- Validates Bearer token in Authorization header

### Story 3.1 (Player Join)
- Players enter game code from lobby
- Calls GET /api/session/:code to validate
- Can then join via POST /api/session/:code/join

### Story 4.1 (Host Lobby)
- Lobby.html acts as the host lobby screen
- Polls /api/session/:code for updates
- Displays player list and settings
- Enables Start Game button when ready

---

## Future Enhancements

1. **Story 2.x (Database)**: Persist sessions to PostgreSQL
   - Migrate from in-memory Map to database
   - Add session history tracking
   - Enable game recovery

2. **Story 7.x (WebSocket)**: Real-time player updates
   - Replace polling with Socket.io emissions
   - Instant player list updates
   - Status synchronization

3. **Story 8.x (Deployment)**:
   - Add rate limiting on create-session endpoint
   - Implement session analytics
   - Add monitoring for session creation failures

4. **Game Rules**:
   - Configurable rule sets
   - Team vs. individual modes
   - Custom scoring systems

---

## Troubleshooting

### "Failed to create game" Error

**Cause**: Server returned error response  
**Solution**: Check validation:
- maxPlayers in range 2-20
- maxRounds in range 5-20
- Auth token still valid (not expired)

### "Game code not found" Error

**Cause**: Session expired or code doesn't exist  
**Solution**:
- Create new game (old code expires after 60 mins)
- Check network connectivity

### "Player list not updating" Error

**Cause**: Polling stopped or network issue  
**Solution**:
- Refresh page (F5)
- Check browser console for errors
- Verify server is running on port 3000

---

## Files Modified

- ✅ `server.js` - Added POST /api/game/create-session endpoint
- ✅ `src/game/GameSessionManager.js` - Updated validation (2-20 players, 5-20 rounds, numeric timestamps)
- ✅ `public/create-game.html` - New UI for creating game
- ✅ `public/lobby.html` - New UI for game lobby
- ✅ `public/login.html` - Added "Create Game" button
- ✅ `tests/test-create-game-session.js` - New test suite (15 tests)

---

## Test Results

```
✓ All 15 tests passed
✓ Server running successfully
✓ API endpoints responding correctly
✓ Authentication working (Bearer token)
✓ Session creation functional
```

---

## Status

**Story 1.6 is 100% COMPLETE** ✅

Ready for:
- ✅ Story 1.7 integration
- ✅ Player joining (Story 3.1)
- ✅ Game start/management
- ✅ Database persistence (Story 2.x)

