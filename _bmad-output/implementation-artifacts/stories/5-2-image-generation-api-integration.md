# Story 5.2: Image Generation API Integration

**Epic:** Epic 5: AI Image Generation Integration  
**Status:** ✅ complete  
**Estimated Effort:** 12 hours (1.5 days)  
**Actual Effort:** 12 hours  
**Developer:** @game-solo-dev  
**Completed:** 2026-02-09  

---

## User Story

As the backend, I want to call an AI image generation API (DALL-E, Midjourney, or Stability AI) and retrieve generated images, so that we have visual punchlines for the judge.

---

## Acceptance Criteria

- [x] Integrate with at least one service (DALL-E 3 or Stability AI recommended)
- [x] API call includes formatted prompt and authentication
- [x] Retry logic: 3 attempts with exponential backoff if API fails
- [x] Timeout handling: 60-second timeout with fallback to placeholder image
- [x] Response includes image URL or Base64 encoded image data
- [x] Handle rate limiting (queue requests if API near limit)
- [x] Images download to server storage (don't just return URLs)
- [x] All 4 player submissions generate images within 30-60 seconds total
- [x] Generate images simultaneously when possible (respect rate limits)

---

## Technical Requirements

### ImageGeneratorService

Create `ImageGeneratorService.js` with:
- Constructor: accepts API key, service type (dalle3 or stability-ai)
- Method: `generateImage(prompt, gameCode, roundId, playerId, artStyle)`
- Queue management: max 2-4 concurrent requests
- Retry logic: exponential backoff (1s, 2s, 4s)
- Timeout: 60 seconds maximum per request
- Response: `{ imageUrl, imagePath, completedSentence, artStyle, generatedAt }`

### Recommended Service: DALL-E 3

**API Details:**
```javascript
POST https://api.openai.com/v1/images/generations
Authorization: Bearer {OPENAI_API_KEY}
Content-Type: application/json

{
  "model": "dall-e-3",
  "prompt": "[formatted prompt from Story 5.1]",
  "n": 1,
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid"
}
```

**Cost:** $0.04 per image (~$0.16 per game with 4 players)

### Alternative: Stability AI

**API Details:**
```javascript
POST https://api.stability.ai/v1/generate
Authorization: Bearer {STABILITY_API_KEY}
Content-Type: application/json

{
  "prompt": "[formatted prompt]",
  "steps": 30,
  "width": 1024,
  "height": 1024
}
```

**Cost:** Lower than DALL-E 3, faster generation

### Error Handling

- **API Unavailable**: Use placeholder "Could not generate image" graphic
- **Rate Limit**: Queue request, wait, retry
- **Timeout**: After 60s, use placeholder image
- **Invalid Response**: Log error, use placeholder
- **Network Error**: Retry 3x with exponential backoff, then placeholder

### Image Storage

Save downloaded images to:
```
picture-this-server/public/generated-images/
├── {gameCode}/
│   └── {roundId}/
│       ├── {playerId}.jpg
│       ├── {playerId}.jpg
│       ├── {playerId}.jpg
│       └── {playerId}.jpg
```

Return path: `/generated-images/{gameCode}/{roundId}/{playerId}.jpg`

### Game Flow Integration

1. After selection phase ends, get all player selections
2. For each player:
   - Get sentence template + selected noun cards
   - Format prompt using PromptFormatter (Story 5.1)
   - Queue image generation request
3. Show "Creating images..." loading state on host display
4. Display progress: "Generated: X of 4 images"
5. When all complete or 60s timeout:
   - Save image metadata to session
   - Transition to judging phase
   - Broadcast images to judge interface

---

## Definition of Done

- [x] Code committed to PR
- [x] All acceptance criteria checked off
- [x] ImageGeneratorService created at `src/services/ImageGeneratorService.js`
- [x] DALL-E 3 integration complete and tested
- [x] Images download and save to server storage
- [x] Queue management handles rate limiting
- [x] Retry logic with exponential backoff working
- [x] Timeout handling with placeholder fallback working
- [x] Integration with GameSessionManager
- [x] Logging for all API calls and errors
- [x] Unit tests for service (with mocked API)
- [x] Integration test with full 4-player flow
- [x] Performance test: 4 images generated within 60 seconds
- [x] Manual test: Real API calls with production key
- [x] Code review completed

---

## Dependencies

**Blocked By:** Story 5.1 (Sentence Formatting - needs formatted prompts)

**Unblocks:** 
- Story 5.3 (Image Caching - needs generated images)
- Story 4.4 (Host Display - needs images for display)

---

## Configuration

Add to `.env`:
```bash
# Image Generation (Story 5.2)
IMAGE_GENERATION_SERVICE=dalle3  # or stability-ai
OPENAI_API_KEY=sk-...
STABILITY_API_KEY=sk-...
IMAGE_GENERATION_TIMEOUT=60000  # milliseconds
IMAGE_GENERATION_MAX_CONCURRENT=2
```

---

## Performance & Costs

**DALL-E 3 Estimates:**
- Cost per image: $0.04
- Cost per game (4 images): $0.16
- Speed: 10-30 seconds per image
- Budget for 100 games: ~$16
- Budget for 1000 games: ~$160

---

## Source References

- [GAME_DESIGN.md § 6. AI Image Generation Integration](../planning-artifacts/GAME_DESIGN.md#6-ai-image-generation-integration)
- [epics.md Story 5.2](../planning-artifacts/epics.md#story-52-image-generation-api-integration)
- [STATE_DIAGRAM.md § IMAGE_GENERATION](../planning-artifacts/STATE_DIAGRAM.md#image_generation)
