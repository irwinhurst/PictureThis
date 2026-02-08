# Story 3.4: TV Console - Results & Leaderboard Display

**Epic:** Epic 3: Player Mobile UI & Controls  
**Status:** ready-for-dev  
**Estimated Effort:** 8 hours (full day)  

---

## User Story

As a host/spectator, I want the main TV console to display submitted pictures, show winning selections as the judge picks them, and display the updated leaderboard with awarded points, so that all players understand round progression and scores in real-time.

---

## Acceptance Criteria

- [ ] Display submitted pictures from all players in real-time as they arrive
- [ ] Show judge's current selection (highlight/zoom) as judge picks winners
- [ ] Display awarded points immediately after judge selection (+5 POINTS, etc.)
- [ ] Show updated leaderboard with rankings and point totals
- [ ] Auto-progress to next round after 5 seconds (visible countdown)
- [ ] Final leaderboard available at game end
- [ ] Medals/trophies for top 3 players (🥇🥈🥉) at game end
- [ ] "⭐ FUNNIEST JUDGE" special award displayed (at game end)
- [ ] Manual "Next Round" button available to skip countdown

---

## Technical Requirements

### Picture Submission Display (Real-time)
- Grid layout showing all submitted pictures as they arrive
- Player name/avatar displayed with each picture
- Smooth fade-in animation for new submissions
- Show "Waiting for submissions..." initially
- Indicate when submission is complete (✓ check mark)

### Judge Selection Display
- Enlarge/highlight selected picture when judge chooses winner
- Show selected picture prominently (large center display)
- Display player name and avatar of winner
- Smooth transition between selections
- Sound/visual feedback on each selection

### Points & Leaderboard Display
- Show points awarded prominently (e.g., "+10 POINTS")
- Real-time leaderboard update showing:
  * Rank, Player Name/Avatar, Current Round Points, Total Points
  * Sorted by total points (descending)
  * Highlight newly earned points in this round
- Smooth animation as points are added

### Auto-Advance
- 5-second pause showing leaderboard
- Countdown timer visible ("Next round in 5...", "4...", etc.)
- Manual button to skip countdown
- No auto-advance on final round (wait for game end modal)

### Final Results Screen
- Large, celebratory display with medal emoji for top 3 (🥇🥈🥉)
- "⭐ FUNNIEST JUDGE" award if applicable
- All players' final scores ranked
- Game end timestamp
- "Play Again?" or "Return to Menu" button option

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Real-time picture submission display working
- [ ] Judge selection highlights/zooms correctly
- [ ] Points awarded display updates in real-time
- [ ] Leaderboard updating correctly after each round
- [ ] Auto-advance countdown working
- [ ] Final leaderboard rendering correctly
- [ ] Awards displaying correctly at game end
- [ ] Manual test: Play 2-3 rounds, verify all displays and progression
- [ ] Code review completed
- [ ] TV console UI tested on 1080p and 4K displays

---

## Dependencies

**Blocked By:** 
- Story 3.2 (Card Selection - must have submitted pictures)
- Story 6.1 (Scoring - must calculate points)

**Unblocks:** 
- Story 4.1 (Next Round Initialization)
- Story 8.2 (Performance Optimization - may optimize leaderboard rendering)

---

## Source References

- [GAME_DESIGN.md § 4. Scoring System](../planning-artifacts/GAME_DESIGN.md#4-scoring-system)
- [GAME_DESIGN.md § 5. Round Flow](../planning-artifacts/GAME_DESIGN.md#5-round-flow)
- [UI_WIREFRAMES.md - TV Console Results Display](../planning-artifacts/UI_WIREFRAMES.md#tv-console-results)
- [epics.md Story 3.4](../planning-artifacts/epics.md#story-34-round-results--leaderboard)
