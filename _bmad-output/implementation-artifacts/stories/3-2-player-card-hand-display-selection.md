# Story 3.2: Player Card Hand Display & Selection

**Epic:** Epic 3: Player Mobile UI & Controls  
**Status:** ready-for-dev  
**Estimated Effort:** 8 hours (1 day)  

---

## User Story

As a player, I want to see my hand of cards and select appropriate card(s) for sentence blanks, so that I can complete the sentence.

---

## Acceptance Criteria

- [ ] Display 6-8 cards in scrollable/grid layout
- [ ] Show sentence template with numbered blanks above card hand
- [ ] Tap cards to select them for each blank (visual feedback: highlight/checkmark)
- [ ] Submit button enabled only when all blanks filled
- [ ] Timer shows remaining seconds (countdown bar + number)
- [ ] Auto-submit on timer expiry if anything selected
- [ ] Reject submission with warning if time expires with no selections
- [ ] Prevent selecting same card twice in same round
- [ ] Show visual indicator of which blanks are filled

---

## Technical Requirements

### Card Hand Display
- Touch-friendly card size: minimum 60×80px
- Scrollable layout if hand > 8 cards
- Highlight selected cards (background color or border)

### Sentence Display
- Show template with numbered blanks: "___ and ___"
- Show how many blanks need to be filled
- Visual matching between blank number and selected card

### Timer Integration
- Real-time countdown synchronization with server
- Tolerance: ±500ms acceptable
- Update every 100ms (smooth countdown)
- Auto-submit or reject on timeout

### Responsive Layout
- Adapts to portrait and landscape
- Works on small screens (320px width)
- Touch-optimized controls

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Card hand rendered with proper layout
- [ ] Selection logic working (cards highlight when tapped)
- [ ] Blank matching working (correct blank gets correct card)
- [ ] Submit button enable/disable logic working
- [ ] Timer synchronization tested
- [ ] Auto-submit/reject timeout handling working
- [ ] Manual test: Play full round as player
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 1.3 (Card Deck - hand comes from deck)

**Unblocks:** Story 6.1 (Scoring - needs player selections)

---

## Source References

- [GAME_DESIGN.md § 2. Player UI Experience](../planning-artifacts/GAME_DESIGN.md#2-player-ui-experience)
- [epics.md Story 3.2](../planning-artifacts/epics.md#story-32-player-card-hand-display--selection)
