# Story 1.4: Player Session Management

**Epic:** Epic 1: Core Game Infrastructure & Server  
**Status:** ready-for-dev  
**Estimated Effort:** 6 hours (half day)  

---

## User Story

As a game server, I want to create and manage game sessions with unique codes, so that players can join the correct game via a short code.

---

## Acceptance Criteria

- [ ] Generate unique 6-character alphanumeric game code (e.g., "AB12CD") on game creation
- [ ] Store session metadata: creation time, host player ID, max rounds, current phase
- [ ] Session timeout after 60 minutes of inactivity
- [ ] Support multiple concurrent games (isolated state per game)
- [ ] Session cleanup on host disconnect or game end
- [ ] Prevent code collisions (check before generating new code)
- [ ] Code is case-insensitive or normalized to uppercase
- [ ] Session can be looked up by code quickly (O(1) complexity)

---

## Technical Requirements

### Game Code Format
- 6 character alphanumeric: `[A-Z0-9]{6}`
- ~2.2 billion possible codes (36^6)
- Collision resistance: Check Set/Map before assigning to player

### Session Data
- gameId: UUID
- code: 6-char string (unique key)
- hostId: UUID (references users table)
- createdAt: timestamp
- lastActivityAt: timestamp (for timeout)
- maxRounds: integer (5-20)
- currentPhase: enum
- maxPlayers: integer (default 8)
- status: enum (lobby|in_progress|completed)

### Session Lifecycle
- Create: Host clicks "Create Game" → generate code, create session
- Persist: Store in memory (Map) with code as key
- Timeout: No activity for 60 minutes → mark inactive → cleanup
- End: maxRounds completed or host quits → cleanup

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Session creation tested
- [ ] Code uniqueness verified (no collisions)
- [ ] Session lookup by code working
- [ ] Timeout logic tested (sessions expire after 60 min)
- [ ] Concurrent game isolation verified
- [ ] Cleanup on host disconnect working
- [ ] Manual test: Create 5 simultaneous games, verify codes unique
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 1.2 (Game State Management)

**Unblocks:** 
- Story 1.5 (Google OAuth - creates session for authenticated host)
- Story 1.6 (Create Game - uses session management)

---

## Source References

- [GAME_DESIGN.md § 1. Core Game Mechanics & Flow](../planning-artifacts/GAME_DESIGN.md#1-core-game-mechanics--flow)
- [epics.md Story 1.4](../planning-artifacts/epics.md#story-14-player-session-management)
