# Story 4.2: Round Intro & Judge Announcement

**Epic:** Epic 4: Host Display & Game Dashboard  
**Status:** ready-for-dev  
**Estimated Effort:** 4 hours (half day)  

---

## User Story

As a host, I want to display the current round number, judge name, and sentence template, so that all players understand the setup.

---

## Acceptance Criteria

- [ ] Show round number (e.g., "ROUND 3 OF 10")
- [ ] Display judge's avatar and name prominently
- [ ] Show sentence template with blanks visible (e.g., "I SAW A _____ TRYING TO _____")
- [ ] Mini leaderboard in corner with top 4 players
- [ ] Clear visual hierarchy (judge info largest, sentence middle, leaderboard small)
- [ ] Duration: 2-3 seconds before auto-advancing to selection timer
- [ ] Font sizes: 36pt judge, 28pt sentence, 18pt leaderboard

---

## Technical Requirements

### Layout
- Judge info: 36pt font, large avatar
- Sentence: 28pt font, bold
- Leaderboard: 18pt font, right/bottom corner
- Auto-advance after 2-3 seconds

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Round info displaying correctly
- [ ] Judge announcement prominent
- [ ] Sentence template clear
- [ ] Leaderboard visible in corner
- [ ] Auto-advance timing working
- [ ] Manual test: Verify display order
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 4.1 (Host Lobby Screen)

**Unblocks:** Story 4.3 (Selection Timer)

---

## Source References

- [epics.md Story 4.2](../planning-artifacts/epics.md#story-42-round-intro--judge-announcement)
