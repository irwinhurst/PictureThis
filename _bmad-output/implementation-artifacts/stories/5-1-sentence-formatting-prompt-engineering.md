# Story 5.1: Sentence Formatting & Prompt Engineering

**Epic:** Epic 5: AI Image Generation Integration  
**Status:** not-started  
**Estimated Effort:** 6 hours  

---

## User Story

As the image generation service, I want to receive well-formatted, descriptive prompts from card selections, so that generated images are visually coherent and funny.

---

## Acceptance Criteria

- [ ] Take the sentence template with noun blanks
- [ ] Fill blanks with selected noun cards in order
- [ ] Example transformation:
  - Template: `"I saw a _____ trying to rob a bank while wearing a _____"`
  - Selected nouns: `["elephant", "tutu"]`
  - Completed: `"I saw an elephant trying to rob a bank while wearing a tutu"`
- [ ] Create AI-ready image prompt with instruction context
- [ ] Keep total prompt concise (under 250 characters when possible)
- [ ] Handle special characters/punctuation safely
- [ ] Support art style variations: realistic, cartoon, cinematic, whimsical

---

## Technical Requirements

### PromptFormatter Utility

Create `promptFormatter.js` utility with:
- Method: `formatImagePrompt(sentence, selectedCards, artStyle) -> string`
- Input: sentence template with `_____` placeholders, array of selected noun card texts
- Output: AI-ready image prompt string

### Prompt Template Structure

```
Create a clear, detailed image that literally depicts the following scene as a single moment in time:

"[COMPLETED SENTENCE HERE]"

The scene should be visually understandable without text, showing all key subjects, actions, and surroundings implied by the sentence. Use expressive body language, clear facial expressions, and a strong sense of environment. The image should be family-friendly, humorous, and slightly exaggerated for clarity.
```

### Art Style Variations
- **Realistic**: realistic photography, natural lighting, candid moment
- **Cartoon**: colorful cartoon illustration, exaggerated expressions
- **Cinematic**: wide shot, dramatic lighting, frozen motion
- **Whimsical**: children's book illustration, soft colors

### Example Outputs

**Single Blank:**
- Input: `"The _____ was wearing sunglasses at a beach party"` + `"Disco-Dancing Llama"`
- Output: `"Create a clear, detailed image... 'The Disco-Dancing Llama was wearing sunglasses at a beach party'"`

**Multiple Blanks:**
- Input: `"A _____ fell in love with a _____"` + `["Dragon Cooking Dinner", "Sentient Rubber Duck"]`
- Output: `"Create a clear, detailed image... 'A Dragon Cooking Dinner fell in love with a Sentient Rubber Duck'"`

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] PromptFormatter utility created at `src/utils/promptFormatter.js`
- [ ] All sentence blanks can be filled with noun cards
- [ ] Prompt stays under 250 characters where feasible
- [ ] Special characters sanitized (quotes, apostrophes handled)
- [ ] Unit tests with 10+ example sentence-card combinations
- [ ] Integration test with game flow (selection → prompt generation)
- [ ] Code review completed

---

## Dependencies

**Blocked By:** 
- Story 1.3 (Card Deck - need noun cards)
- Sentence card JSON data (`sentence-cards.json`)
- Noun card JSON data (`noun-cards.json`)

**Unblocks:** Story 5.2 (Image Generation API - needs formatted prompts)

---

## Source References

- [GAME_DESIGN.md § 6. AI Image Generation Integration](../planning-artifacts/GAME_DESIGN.md#6-ai-image-generation-integration)
- [epics.md Story 5.1](../planning-artifacts/epics.md#story-51-sentence-formatting--prompt-engineering)
- [SENTENCE_CARDS.md](../SENTENCE_CARDS.md)
- [NOUN_CARDS.md](../NOUN_CARDS.md)
