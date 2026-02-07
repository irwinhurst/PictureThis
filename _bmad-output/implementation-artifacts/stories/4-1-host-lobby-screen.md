# Story 4.1: Host Lobby Screen

**Epic:** Epic 4: Host Display & Game Dashboard  
**Status:** ready-for-dev  
**Estimated Effort:** 6 hours (half day)  

---

## User Story

As a host, I want to see the game code, player list, and controls to start the game, so that I can manage the lobby and begin play.

---

## Acceptance Criteria

- [ ] Display large, readable game code (6-character, 48pt+ font)
- [ ] Live updating player list with avatars and names
- [ ] Player count indicator (X/max players)
- [ ] Rounds selector dropdown (5, 10, 15, 20, custom)
- [ ] "Start Game" button (disabled if fewer than 2 players)
- [ ] Layout optimized for 40"+ screens (readable from 10 feet away)
- [ ] Minimum font size: 24pt for all text
- [ ] Clean, vibrant colors with high contrast
- [ ] Real-time player list updates via WebSocket

---

## Technical Requirements

### Code Display
- Font size: 48pt+ (large & readable from distance)
- Background: Contrasting color (dark background with light text)
- Placement: Centered, top of screen

### Player List
- Avatars: Emoji or colored circles, 40×40px minimum
- Names: 18pt+ font
- Format: Avatar | Name | Status (joined/ready)
- Auto-update as players join (WebSocket event)

### Controls
- "Start Game" button: 40×40px minimum tap target
- Disabled state visible (grayed out)
- Only enabled when 2+ players joined
- Rounds selector: Dropdown (5-20, default 10)

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Code display prominent and readable
- [ ] Player list rendering correctly
- [ ] Real-time updates working (WebSocket)
- [ ] "Start Game" button enable/disable logic working
- [ ] Rounds selector working
- [ ] Layout tested on large screen (40"+)
- [ ] Manual test: Host view on TV
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 1.6 (Host Create Game - creates lobby)

**Unblocks:** Story 4.2 (Round Intro - next screen after start)

---

## Source References

- [GAME_DESIGN.md § 3. Host/Main Display UI](../planning-artifacts/GAME_DESIGN.md#3-hostmain-display-ui)
- [epics.md Story 4.1](../planning-artifacts/epics.md#story-41-host-lobby-screen)
