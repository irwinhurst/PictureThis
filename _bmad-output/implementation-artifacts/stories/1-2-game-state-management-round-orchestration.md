# Story 1.2: Game State Management & Round Orchestration

**Epic:** Epic 1: Core Game Infrastructure & Server  
**Status:** ready-for-dev  
**Created:** February 7, 2026  
**Estimated Effort:** 12-16 hours (2 days)  

---

## User Story

As a game server, I want to manage complete game state (players, rounds, scores, card hands), so that all game logic operates on a consistent source of truth.

---

## Acceptance Criteria

- [ ] Game state includes: players list, current round number, active judge, card hands per player, scores, game phase
- [ ] Round progression follows strict state machine: Setup → Selection → ImageGen → Judging → Results → Next Round
- [ ] Automatic timer management (30-45s selection phase, 5s image gen display, 30s judging)
- [ ] Card hand management: Track 6-8 cards per player, automatic refill after rounds
- [ ] State updates are atomic (all-or-nothing, no partial updates)
- [ ] Round state transitions are strictly enforced (no invalid transitions allowed)
- [ ] Timers use reliable scheduling (no race conditions or missed timeouts)
- [ ] Support game reset on host request
- [ ] Game state exported for debugging/testing purposes

---

## Technical Requirements

### Game State Data Structure

**Root Game State Object includes:**
- Game Metadata: gameId, code, hostId, status (lobby|in_progress|completed)
- Configuration: maxRounds, maxPlayers, currentRound
- Participants: Array of players with name, avatar, score, card hand, judge status
- Current Round State: currentPhase, judgeId, sentence template, blank count
- Player Selections: Map of playerId → selected cards for current round
- Timers: phaseStartTime, phaseTimeoutMs for scheduling
- Results: Winning selections and points awarded after judging
- Metadata: createdAt, updatedAt timestamps

### State Machine: Phase Transitions

```
LOBBY
  ↓ (Host clicks "Start Game")
ROUND_SETUP
  ↓ (Send round info to players)
SELECTION (45 seconds)
  ├─ Players submit card selections
  └─ Broadcasts: player_submitted events
SELECTION_COMPLETE (auto-trigger)
  ↓ (All selections collected)
IMAGE_GEN (5 seconds placeholder)
  ├─ Image generation triggered (async)
  └─ Broadcasts: image_generating event
IMAGE_GEN_COMPLETE (auto-trigger)
  ↓ (All images ready OR timeout 60s)
JUDGING (30 seconds)
  ├─ Judge views images
  └─ Judge selects winners (first and second place)
  └─ Players submit their votes (audience choice)
JUDGING_COMPLETE (auto-trigger)
  ↓ (Judge selected OR timeout)
RESULTS (5 seconds display)
  ├─ Show winning image & points
  └─ Broadcasts: round_complete event
NEXT_ROUND (auto-trigger)
  ├─ If round < maxRounds: → ROUND_SETUP
  └─ If round == maxRounds: → GAME_END
GAME_END
  ├─ Final leaderboard calculated
  └─ Send final scores to all players

LOBBY → GAME_END on host abort
```

### Phase Timeout Configuration

| Phase | Duration | Auto-Advance? | Manual Override? |
|-------|----------|---------------|------------------|
| SELECTION | 30-45s | Yes | No |
| IMAGE_GEN | 5s display + 60s API timeout | Yes | No |
| JUDGING | unlimited | Yes | No (if timeout, auto-pick first) |
| RESULTS | 5s | Yes | No |

### Round Orchestration (Automatic Progression)

**Timer Management:**
- Use Node.js timers (setInterval or setImmediate) for phase timeout checks with 100ms granularity
- Track phase start time + timeout duration
- Trigger automatic phase advancement when timeout expires
- Clear and reset timers on each phase transition (prevent memory leaks)

**State Transition Logic:**
- SELECTION: Collect all player selections (or timeout) → trigger image generation → advance to IMAGE_GEN
- IMAGE_GEN: Wait for images to generate (5s display + 60s API timeout) → advance to JUDGING
- JUDGING: Judge selects first and second place (or auto-pick on timeout) → advance to RESULTS
- RESULTS: Display winning image and points (5s) → increment round and advance to ROUND_SETUP or GAME_END
- All state transitions should be atomic (no partial state mutations)

### Card Hand Management

**Initial Deal (Game Start):**
- Shuffle noun deck
- Deal 8 cards to each player
- Track in `gameState.players[].hand`

**Refresh After Round:**
- Count cards in player hand
- If hand < 8: draw from remaining deck until 8 (or deck empty)
- If deck empty: reshuffle discarded cards, continue dealing
- Update `gameState.players[].hand`

**Prevent Duplicates in Single Round:**
- When validating player selection: check if card already selected this round
- Reject selection if duplicate (don't allow same card for multiple blanks)
- Send error to player

### Judge Rotation

**Track Judge per Round:**
- Store `gameState.judgeId` as UUID of current judge
- Increment `gameState.players[judgeId].judgeCount`
- Next round: judge = (currentJudge + 1) % playerCount
- Ensure each player judges once in cycle

### State Atomicity Guarantees

**All-or-Nothing Updates:**
- State modifications wrapped in try-catch
- If any operation fails: rollback entire state transition
- Log failed transitions with full context
- Examples:
  - If image generation fails: don't advance to JUDGING, stay in IMAGE_GEN
  - If player selection is bad: don't advance phase timer
  - If judge selection is invalid: don't award points

**Immutable State Snapshots:**
- Before each phase transition: create deep clone of state
- If transition fails: restore from snapshot
- No partial state mutations visible to clients

### State Export (Debugging)

**Debug Endpoint:**
- `GET /api/debug/game/:gameId` endpoint returns current game state for inspection
- Includes: Complete game state, last error (if any), transition history

**Transition History Tracking:**
- Log every phase transition: timestamp, from phase, to phase, reason
- Keep last 20 transitions in memory for debugging
- Include in error logs when investigating issues

---

## Implementation Checklist

### Game State Class/Module
- [ ] Create `GameState` class or factory function
- [ ] Properties: gameId, code, players, currentRound, currentPhase, etc.
- [ ] Methods: getPlayer(), updatePlayer(), getPhaseTimeout()
- [ ] Immutability: state modifications return new state object (functional approach) OR use Object.freeze()

### Phase Management
- [ ] Create phase enum: `{ LOBBY, ROUND_SETUP, SELECTION, IMAGE_GEN, JUDGING, RESULTS, GAME_END }`
- [ ] Valid transitions map: `{ SELECTION: ["IMAGE_GEN"], IMAGE_GEN: ["JUDGING"], ... }`
- [ ] Enforce transitions: throw error on invalid transitions

### Timer Infrastructure
- [ ] Create timer manager class (tracks active timers)
- [ ] Method: `schedulePhaseTimeout(gameState, timeoutMs)`
- [ ] Method: `cancelTimer(gameId)`
- [ ] Prevent memory leaks: clear timers on game end or disconnect

### Round Orchestration
- [ ] Implement `advancePhase()` function (handles ALL phase transitions)
- [ ] Call from timer manager when phase timeout expires
- [ ] Broadcast state update after each phase transition
- [ ] Handle edge cases: empty player list, single player, etc.

### Card Hand Management
- [ ] Create `CardDeck` class:
  - [ ] Load noun cards from database (Story 2.3)
  - [ ] Shuffle on initialization
  - [ ] Deal(playerCount, cardsPerPlayer) → distribute initial hands
  - [ ] Refill(player, targetSize) → draw cards until targetSize reached
  - [ ] AllCardsDealt() → check if draw pool exhausted
- [ ] Track: drawPile, discardPile, playerHands

### Player Selections Handling
- [ ] Validate selection: playerId exists, round active, selection format correct
- [ ] Check: no duplicate cards in single round selection
- [ ] Store in `gameState.playerSelections[playerId]`
- [ ] Mark player as "submitted" (for selection progress UI)
- [ ] Broadcast: "player_submitted" event to all clients

### Game Reset
- [ ] Method: `resetGame(gameState, newMaxRounds)` → returns fresh state
- [ ] Clear all rounds, scores, selections
- [ ] Keep: gameId, code, hostId, players list (preserve player objects)
- [ ] Reset phase to LOBBY, currentRound to 1

### Error Handling
- [ ] Catch phase transition errors, log with context
- [ ] Don't crash server on bad state (recover gracefully)
- [ ] Notify clients of errors only if game-breaking

---

## Data Flow Overview

**Game Progression:**
1. Host clicks "Start Game" → Game transitions from LOBBY to ROUND_SETUP
2. Server selects random judge, loads sentence template
3. Server broadcasts "round_started" event with judge name and sentence
4. Phase transitions to SELECTION (45 seconds)
5. Players view sentence and select noun cards
6. As each player submits, server broadcasts "player_submitted" with submission count
7. After 45 seconds OR all players submit: Automatically transition to IMAGE_GEN
8. Image generation triggered; server broadcasts "generating_images"
9. Once images ready: Transition to JUDGING (30 seconds)
10. Judge selects first and second place; audience votes
11. Server broadcasts winning selections
12. Transition to RESULTS (5 seconds); display winning image and points
13. Leaderboard updated
14. If more rounds remain: Return to ROUND_SETUP for next round
15. If max rounds reached: Transition to GAME_END, calculate final standings

**Key Broadcasting Points:**
- State broadcasts every 100ms to all connected clients
- Phase changes broadcast immediately (priority)
- Player submissions broadcast in real-time (for progress UI)

---

## Dependencies

### Story 1.2 (This Story)
**Blocked By:** Story 1.1 (Game Server setup - ✅ done)
**Blocks:** 
- Story 1.3: Card Deck & Hand Management (needs state.hand tracking)
- Story 1.4: Player Session Management (needs game state per session)
- Story 3.1: Player Join (needs state broadcasting)
- Story 6.1: Score Calculation (needs to update scores in state)

---

## Definition of Done

- [ ] Code committed to PR (Pull Request)
- [ ] All acceptance criteria checked off
- [ ] `GameState` class/factory created and tested locally
- [ ] Phase state machine verified (all transitions tested)
- [ ] Timer management working (no race conditions in unit tests)
- [ ] Card hand refill logic working
- [ ] Judge rotation working (each player judges once per round)
- [ ] State export endpoint responds with valid JSON
- [ ] Manual test: Run a full game flow locally, verify state transitions
- [ ] Story moved to "review" status
- [ ] Code review completed by another engineer

---

## Dev Notes

**Architecture Decisions:**
- State as immutable object (recommend: functional approach with Object.spread() or library like Immer.js)
  - Pro: Easy to debug, no side effects
  - Con: Slightly more memory overhead
- Use class-based approach if prefer: GameState with methods, but always return new state

**Keep in Mind:**
- This is the "brain" of the game - get it right, other stories become easy
- Phase transitions are synchronous; image generation is async (no-op during IMAGE_GEN phase)
- Test with edge cases: 1 player, many players, rapid disconnects
- Timer precision: ±100ms acceptable, but not +/- seconds

**Testing Strategy:**
- Unit tests: Phase transitions, timer logic, card refill, judge rotation
- Integration tests: Full game flow (LOBBY → ROUND_SETUP → SELECTION → ... → GAME_END)
- Manual: Open 4 browser tabs, simulate 4 players, verify state broadcasts

**Common Pitfalls:**
- ❌ Modifying state directly: `gameState.score += 5` (BAD)
- ✅ Return new state: `return { ...gameState, score: gameState.score + 5 }`
- ❌ Timer leaks: Forgetting to clear timers on game abort
- ✅ Always cancel timers in cleanup functions
- ❌ Race condition: Multiple "phase timeout" events firing simultaneously
- ✅ Use mutex/lock OR check phase state before transitioning

**Useful Libraries:**
- Immer.js: Simplify immutable state updates
- date-fns: Timer calculations (avoid Date math)
- Jest: Unit testing (includes timer mocks)

---

## Questions/Risks

- **Risk:** Phase timeout fires while state is being updated?
  - Mitigation: Check `gameState.currentPhase` at start of `advancePhase()`, skip if already transitioned
  
- **Risk:** Timer precision on slow machines?
  - Mitigation: 100ms granularity acceptable for game; not critical to exact millisecond

- **Decision:** Immutable vs Mutable state?
  - Recommendation: Immutable (use `{ ...gameState }` spread syntax)
  - More predictable, easier to debug state transitions

---

## Source References

- [GAME_DESIGN.md § 1. Core Game Mechanics & Flow](../planning-artifacts/GAME_DESIGN.md#1-core-game-mechanics--flow)
- [GAME_DESIGN.md § 4. Scoring System](../planning-artifacts/GAME_DESIGN.md#4-scoring-system)
- [epics.md Story 1.2](../planning-artifacts/epics.md#story-12-game-state-management--round-orchestration)
