# Story 1.6: Host Create Game Session

**Epic:** Epic 1: Core Game Infrastructure & Server  
**Status:** ready-for-dev  
**Estimated Effort:** 6 hours (half day)  

---

## User Story

As an authenticated host, I want to create a new game session with configurable settings, so that I can invite players to my game.

---

## Acceptance Criteria

- [ ] "Create Game" button visible on authenticated host dashboard
- [ ] Form to configure: Max players (2-20, default 8), Max rounds (5-20, default 10)
- [ ] System generates unique 6-character game code
- [ ] Game session created in memory with host_id, code, settings
- [ ] Redirect host to game lobby screen showing code and waiting player list
- [ ] Display code prominently (large font for TV display)
- [ ] "Start Game" button available (disabled until 2+ players joined)
- [ ] Host can cancel/abandon game (returns to dashboard)

---

## Technical Requirements

### Create Game Endpoint
- `POST /api/games` (requires authentication)
- Request body: `{ maxPlayers: 8, maxRounds: 10 }`
- Response: `{ gameId, code, createdAt, maxPlayers, maxRounds, status: "lobby" }`

### Validation
- maxPlayers: 2-20 (numeric)
- maxRounds: 5-20 (numeric)
- Return error if validation fails

### Game Initialization
- Generate unique game code (Story 1.4)
- Create game state in memory (Story 1.2)
- Set status to "lobby"
- Initialize empty players list
- Broadcast game code to host dashboard

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Create game endpoint working
- [ ] Validation tested (edge cases: minMax values, invalid input)
- [ ] Game code generated and returned
- [ ] Redirect to lobby screen working
- [ ] Code displayed prominently on screen
- [ ] "Start Game" button disabled until 2+ players
- [ ] Manual test: Create game, see lobby with code
- [ ] Code review completed

---

## Dependencies

**Blocked By:**
- Story 1.4 (Session Management - for code generation)
- Story 1.5 (Google OAuth - for authenticated host)

**Unblocks:**
- Story 3.1 (Player Join - players need code to join)
- Story 4.1 (Host Lobby Screen - shows created game)

---

## Source References

- [GAME_DESIGN.md § 1. Core Game Mechanics & Flow](../planning-artifacts/GAME_DESIGN.md#1-core-game-mechanics--flow)
- [epics.md Story 1.6](../planning-artifacts/epics.md#story-16-host-create-game-session)
