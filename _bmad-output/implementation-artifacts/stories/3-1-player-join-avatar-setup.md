# Story 3.1: Player Join & Avatar Setup

**Epic:** Epic 3: Player Mobile UI & Controls  
**Status:** ready-for-dev  
**Estimated Effort:** 6 hours (half day)  

---

## User Story

As a player, I want to enter a game code and create a custom avatar/name, so that I can join a game and be identified.

---

## Acceptance Criteria

- [ ] Input field for 6-character game code (auto-formatted, case-insensitive)
- [ ] Name input field (max 20 characters, alphanumeric + spaces + hyphens)
- [ ] Avatar picker: 6-8 emoji options in grid
- [ ] "Join Game" button validates all fields before submission
- [ ] Error message if code doesn't exist or game is full
- [ ] Success: Player sees lobby waiting screen with player list
- [ ] Form responsive on mobile (iOS Safari, Chrome)
- [ ] Loading indicator while joining

---

## Technical Requirements

### Validation
- Code: Numeric/alphanumeric only, exactly 6 characters
- Name: 1-20 characters, no leading/trailing spaces
- Avatar: One of predefined emoji set

### Error Handling
- Invalid code format: Show error immediately
- Code doesn't exist: Server returns 404
- Game full: Server returns error
- Network error: Show retry button

### Responsive Design
- Mobile-first (320px+ width)
- Touch-friendly buttons (minimum 44×44px)
- Portrait and landscape orientations

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Join form created (code, name, avatar inputs)
- [ ] Client-side validation working
- [ ] Server validation working
- [ ] Error messages displayed clearly
- [ ] Success: Player added to game
- [ ] Responsive design tested on mobile
- [ ] Manual test: Join game from phone
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 1.6 (Host Create Game - player needs code from host)

**Unblocks:** Story 3.2 (Card Hand Display - player must be joined)

---

## Source References

- [GAME_DESIGN.md § 2. Player UI Experience](../planning-artifacts/GAME_DESIGN.md#2-player-ui-experience)
- [epics.md Story 3.1](../planning-artifacts/epics.md#story-31-player-join--avatar-setup)
