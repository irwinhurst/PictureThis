# Story 2.3: Card Pack Seed Data & Initial Load

**Epic:** Epic 2: Database Design & Schema  
**Status:** ready-for-dev  
**Estimated Effort:** 8 hours (1 day)  

---

## User Story

As the game server, I want to load a base deck of cards on startup, so that games can begin with immediate card availability.

---

## Acceptance Criteria

- [ ] Define base card pack (base_game) with 150-200 nouns and 100 sentence templates
- [ ] Nouns: Mix of accessible and absurd single/short-phrase words (family-friendly)
- [ ] Sentences: Various blank counts (1, 2, or 3 blanks per template)
  - 70 sentences with 1 blank (easy)
  - 20 sentences with 2 blanks (medium)
  - 10 sentences with 3 blanks (hard)
- [ ] All cards are family-friendly (no profanity or inappropriate content)
- [ ] Seed script loads cards into database on first run
- [ ] Idempotent load (safe to run multiple times without duplicates)
- [ ] Card data from JSON file organized by card type
- [ ] Card difficulty distribution: mix of easy, medium, hard
- [ ] Validation: Count 150-200 nouns and 100 sentences

---

## Card Data Format

**JSON file structure (cards.json):**
```
base_game.nouns: array of { text, difficulty }
base_game.sentences: array of { text, blank_count, difficulty }
```

**Example entries:**
- Nouns: "elephant", "rubber duck", "my grandmother", "coffee machine", etc.
- Sentences: "I saw a _____ trying to rob a bank", "Yesterday I met a _____ at the store", etc.

---

## Technical Requirements

### Seed Script
- Command: `npm run seed` or `npm run seed cards`
- Runs idempotently (no duplicate inserts if run multiple times)
- Validates card counts: 150-200 nouns, 100 sentences
- Logs output: "Loaded X nouns, Y sentences"
- Handles errors gracefully (transactional: all-or-nothing)

### Card Validation
- Check noun count is in range [150-200]
- Check sentence count = 100
- Check blank_count distribution (70:20:10)
- Reject if validation fails with clear error message

### Optional: Multiple Card Packs
- Support future expansion (different packs for different themes)
- All cards tagged with pack name (e.g., "base_game", "holiday_special")

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] cards.json file created with 150-200 nouns, 100 sentences
- [ ] All cards reviewed for family-friendliness
- [ ] Seed script created and tested
- [ ] Idempotency verified (run twice, same result)
- [ ] Validation checks working (counts, distribution)
- [ ] Manual test: Load seeds, verify counts in database
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 2.2 (Migrations - need DB schema first)

**Unblocks:** Story 1.3 (Card Deck Management - loads cards from DB)

---

## Source References

- [GAME_DESIGN.md § 5. Card Database Structure](../planning-artifacts/GAME_DESIGN.md#5-card-database-structure)
- [epics.md Story 2.3](../planning-artifacts/epics.md#story-23-card-pack-seed-data--initial-load)
