# Story 1.3: Card Deck & Hand Management

**Epic:** Epic 1: Core Game Infrastructure & Server  
**Status:** ready-for-dev  
**Estimated Effort:** 8 hours (1 day)  

---

## User Story

As a game server, I want to manage a deck of cards and distribute hands to players, so that each player receives randomized cards without replacement until refresh.

---

## Acceptance Criteria

- [ ] Load base noun deck (150-200 nouns) from database/JSON
- [ ] Load sentence templates (100 with 1-3 noun blanks each) from database/JSON
- [ ] Shuffle noun deck on game start (Fisher-Yates or equivalent)
- [ ] Distribute 6-8 noun cards to each player at game start
- [ ] On round completion, refill each player's hand to 8 cards
- [ ] Track which cards are in which player's hand
- [ ] On each round start, randomly select one sentence template from available pool
- [ ] Prevent player from selecting same noun card twice in single round
- [ ] Handle deck exhaustion gracefully (reshuffle if needed)
- [ ] Sentence templates cycle, never consumed (always available)

---

## Technical Requirements

### Card Data
- **Noun Cards:** 150-200 diverse single words or short phrases
- **Sentence Templates:** 100 total with distribution:
  - 70 templates with 1 blank (easy)
  - 20 templates with 2 blanks (medium)
  - 10 templates with 3 blanks (hard)

### Integration Points
- Depends on: Story 2.3 (Card Pack Seed Data) for initial card load
- Used by: Story 1.2 (state.hand tracking), Story 3.2 (player selections)

### Card State Tracking
- Deck state: Draw pile, discard pile, player hands
- Hand validation: No duplicate cards in single round
- Refill algorithm: Draw from deck until player hand reaches 8 cards

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] CardDeck class created with load, shuffle, deal, refill methods
- [ ] Noun card count validated (150-200 range)
- [ ] Sentence template count validated (100 with correct distribution)
- [ ] Shuffle algorithm tested (random distribution verified)
- [ ] Hand refill logic tested
- [ ] Deck exhaustion handled
- [ ] Manual test: Full game with card selections
- [ ] Code review completed

---

## Dependencies

**Blocked By:** 
- Story 1.2 (Game State Management - for hand tracking)
- Story 2.3 (Card Seed Data - for card load)

**Unblocks:**
- Story 3.2 (Player Card Hand Display)

---

## Source References

- [GAME_DESIGN.md § 5. Card Database Structure](../planning-artifacts/GAME_DESIGN.md#5-card-database-structure)
- [epics.md Story 1.3](../planning-artifacts/epics.md#story-13-card-deck--hand-management)
