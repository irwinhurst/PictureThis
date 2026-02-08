# Story 3.3: Judge's Judging Interface

**Epic:** Epic 3: Player Mobile UI & Controls  
**Status:** in-progress  
**Assigned To:** Developer  
**Estimated Effort:** 6 hours (half day)  

---

## User Story

As the judge, I want to view the players generated images and select winners, so that I can award points to the winning players.

---

## Acceptance Criteria

- [ ] Display all player images in a carousel
- [ ] Images labeled with player number only (not name, for impartiality)
- [ ] Tap/swipe to view carousel if layout requires
- [ ] Two selection buttons: "Pick 1st Place" and "Pick 2nd Place"
- [ ] Visual highlight on selected images
- [ ] no Timer for judging phase
- [ ] Cannot interact until all images have loaded


---

## Technical Requirements

### Image Display
- Aspect ratio: 4:3 or 1:1 (consistent across all 4)
- Minimum size: 80×100px per image for selection
- Preload/cache images before display

### Selection UI
- Clear labeling: Image 1, Image 2, Image 3, Image 4
- Two separate selection actions (1st vs 2nd place)
- Visual state: Unselected, Selected 1st, Selected 2nd



---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Images displaying correctly
- [ ] Selection interaction working
- [ ] Visual feedback for selected images
- [ ] Mobile carousel working (if implemented)
- [ ] Manual test: Judge flow with images
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 5.2 (Image Generation - must generate images first)

**Unblocks:** Story 6.1 (Scoring - uses judge selection)

---

## Source References

- [GAME_DESIGN.md § 1. Core Game Mechanics & Flow](../planning-artifacts/GAME_DESIGN.md#1-core-game-mechanics--flow)
- [epics.md Story 3.3](../planning-artifacts/epics.md#story-33-judges-judging-interface)
