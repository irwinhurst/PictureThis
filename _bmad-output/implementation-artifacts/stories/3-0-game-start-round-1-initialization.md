# Story 3.0: Game Start & Round 1 Initialization

**Epic:** Epic 3: Player Mobile UI & Controls  
**Status:** ready-for-dev  
**Priority:** High (blocks all gameplay)  
**Estimated Effort:** 6 hours (3/4 day)  

---

## User Story

As a host, I want to start the game and have all players transition into Round 1, so that the game begins and players can start making their card selections.

---

## Acceptance Criteria

**Host Actions:**
- [ ] "Start Game" button in lobby is clickable when 2+ players joined
- [ ] Clicking "Start Game" initiates round start sequence
- [ ] Handler prevents clicking multiple times (button disabled after first click)

**Game State Transition:**
- [ ] Game state changes from "lobby" to "round_1_selection"
- [ ] Current round is set to 1
- [ ] Timer starts: 30-45 seconds for card selection phase
- [ ] One random sentence template is selected for Round 1
- [ ] One random player is assigned as judge (rotates each round)
- [ ] Initial card hands dealt to all players (6-8 cards each from shuffled deck)

**Player Notifications:**
- [ ] All players receive WebSocket notification: `game-started` with payload:
  - `{ round: 1, judge_id, judge_name, judge_avatar, sentence_template, time_remaining }`
- [ ] Players auto-navigate from `player-lobby.html` to `game.html` (or game page)
- [ ] Players see the sentence template before their card hand loads
- [ ] Players' card hands are populated from dealt cards

**Host Display:**
- [ ] Host navigates to game display page showing Round 1 intro
- [ ] Host sees round number (1 of maxRounds)
- [ ] Host sees judge name and avatar prominently
- [ ] Host sees sentence template
- [ ] Host sees small leaderboard in corner (all players at 0 points, or previous scores if continuing)

**Error Handling:**
- [ ] Cannot start game with < 2 players (validation)
- [ ] Cannot start game twice (idempotency)
- [ ] Handle player disconnects during round start gracefully
- [ ] All players eventually reach game screen even if temporarily disconnected

---

## Technical Requirements

### Backend: POST /api/game/{code}/start

```javascript
Request:
  - Authorization: Bearer {host_jwt_token}
  - Body: { code: "AB12CD" }

Response (success):
  {
    success: true,
    round: 1,
    judge_id: "player-id",
    judge_name: "Alice",
    judge_avatar: "🎮",
    sentence_template: "I SAW A _____ TRYING TO _____",
    time_remaining: 45,
    maxRounds: 10,
    game_id: "uuid",
    status: "round_1_selection"
  }

Response (error):
  {
    success: false,
    error: "Not enough players" | "Game already started" | "Unauthorized"
  }
```

### Game State Updates

1. **Judge Selection**: Rotate through players (game.current_judge_index++)
2. **Card Dealing**: 
   - Get all players in game
   - For each player: Deal 6-8 cards from shuffled noun deck
   - Store in GameState.player_hands[player_id]
3. **Sentence Selection**: Pick random sentence from templates pool
4. **Timer Start**: 
   - Start 45-second countdown (or configured duration)
   - Broadcast timer updates every 1 second via WebSocket
5. **Broadcast Event**: Emit `game-started` to all connected players in the game session

### WebSocket Events

**Emit to all players:**
```javascript
socket.emit('game-started', {
  gameId: session.gameId,
  code: session.code,
  round: 1,
  judge: {
    id: judge.playerId,
    name: judge.name,
    avatar: judge.avatar,
    isHost: judge.isHost
  },
  sentence: sentence_template,
  blanks_count: 2,  // How many nouns needed
  time_remaining: 45,
  max_rounds: session.maxRounds
});

// Then emit timer updates every 1 second:
socket.emit('timer-update', { time_remaining: 44 });
... (countdown continues)
```

### Frontend: game.html Page

Create `/public/game.html` with:
- **Top section**: Sentence template displayed prominently (28pt font)
- **Left/Center**: Blank labels (e.g., "BLANK 1", "BLANK 2")
- **Bottom**: Player's card hand (cards not selectable yet - Story 3.2)
- **Right side**: Judge info (small - judge avatar + name)
- **Timer**: Countdown bar + remaining seconds (top right, 18pt font)

**Page Load Behavior:**
- Retrieve `?code={gameCode}` from URL
- Fetch game state: GET `/api/session/{code}`
- Display loading indicator until game-started event received
- Listen for `game-started` WebSocket event
- Populate sentence and judge info once received
- Listen for `timer-update` and update countdown display

---

## Definition of Done

- [ ] Code committed to PR
- [ ] Backend `/api/game/{code}/start` endpoint working
- [ ] All acceptance criteria checked off
- [ ] Game state transitions correctly (logs show state progression)
- [ ] Card hands dealt to all players (via GameManager.dealCards)
- [ ] Judge randomly selected (rotates across players)
- [ ] Sentence randomly selected from templates
- [ ] WebSocket `game-started` event broadcasts to all players with correct data
- [ ] Timer countdown starts and updates every 1 second
- [ ] Host receives notification and navigates to round intro screen
- [ ] Players receive notification and navigate to game.html
- [ ] game.html page displays sentence, judge info, and timer correctly
- [ ] Cannot start game with < 2 players (validation)
- [ ] Cannot start game twice (handled gracefully)
- [ ] Manual test: Full flow from lobby → game start → card hand screen
- [ ] Code review completed

---

## Dependencies

**Blocked By:** 
- Story 1.6 (Host Create Game & Lobby - enables "Start Game" button)
- Story 3.1 (Player Join - needs players to exist)
- Story 1.3 (Card Deck - needs card dealing function)
- Story 1.2 (Game State Management - needs round orchestration)

**Unblocks:** 
- Story 3.2 (Player Card Hand Display - players are in game, need to select cards)
- Story 4.2 (Host Round Intro - host needs game started to show round info)

---

## Implementation Notes

### Judge Rotation Logic
```javascript
// In GameManager or GameSessionManager
next_judge_id = players[(current_judge_index % players.length)]
current_judge_index++
```

### Card Dealing
- Use GameManager.dealCards(gameId, players) 
- Each player gets random 6-8 nouns from shuffled deck
- Avoid duplicates within a player's hand
- Track which cards are dealt (remove from deck)

### Error Conditions
1. **Not authenticated**: Return 401
2. **Not the host**: Return 403 (only host can start)
3. **< 2 players**: Return 400 with "Need 2+ players"
4. **Game already started**: Return 400 (idempotent check)
5. **Session not found**: Return 404

---

## Source References

- [GAME_DESIGN.md § 1. Core Game Mechanics & Flow](../planning-artifacts/GAME_DESIGN.md#1-core-game-mechanics--flow)
- [UI_WIREFRAMES.md § Game Screen](../planning-artifacts/UI_WIREFRAMES.md)
- [epics.md Epic 3 Overview](../planning-artifacts/epics.md#epic-3-player-mobile-ui--controls)

