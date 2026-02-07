# Story 3.4: Round Results & Leaderboard

**Epic:** Epic 3: Player Mobile UI & Controls  
**Status:** ready-for-dev  
**Estimated Effort:** 6 hours (half day)  

---

## User Story

As a player, I want to see round results (who won, points awarded) and current leaderboard, so that I understand the score progression.

---

## Acceptance Criteria

- [ ] Show winning card combo that was selected by judge
- [ ] Display points awarded (e.g., "+5 POINTS")
- [ ] Show updated leaderboard with current rankings
- [ ] Auto-progress to next round after 5 seconds (visible countdown)
- [ ] Final leaderboard available at game end
- [ ] Medals/trophies for top 3 players (🥇🥈🥉) at game end
- [ ] "⭐ FUNNIEST JUDGE" special award displayed (at game end)
- [ ] Manual "Next Round" button available (optional, for faster progression)

---

## Technical Requirements

### Results Display
- Winning cards shown (the nouns that won)
- Points per player updates in real-time
- Clear indication of who earned points

### Leaderboard
- Sorted by total points (descending)
- Rank, Name/Avatar, Points (e.g., "1. Alice 45 pts")
- Updated after each round
- Visible at all times (sidebar or bottom of screen)

### Auto-Advance
- 5-second pause showing results
- Countdown timer visible ("Next round in 5...")
- Manual button to skip countdown
- No auto-advance on final round (wait for game end)

### Final Results Screen
- Medal emoji for top 3
- "Funniest Judge" award if applicable
- All players' final scores
- Game end timestamp

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Results display working
- [ ] Leaderboard updating correctly
- [ ] Auto-advance countdown working
- [ ] Final leaderboard rendering correctly
- [ ] Awards displaying correctly
- [ ] Manual test: Play 2-3 rounds, verify progression
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 6.1 (Scoring - must calculate points)

**Unblocks:** Story 8.2 (Performance Optimization - may optimize leaderboard rendering)

---

## Source References

- [GAME_DESIGN.md § 4. Scoring System](../planning-artifacts/GAME_DESIGN.md#4-scoring-system)
- [epics.md Story 3.4](../planning-artifacts/epics.md#story-34-round-results--leaderboard)
