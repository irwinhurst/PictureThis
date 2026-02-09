# Story 5.3: Image Caching & Storage

**Epic:** Epic 5: AI Image Generation Integration  
**Status:** not-started  
**Estimated Effort:** 8 hours (1 day)  

---

## User Story

As the game system, I want to cache generated images and store them efficiently, so that we can replay rounds, reduce API calls for duplicate prompts, and enable image sharing.

---

## Acceptance Criteria

- [ ] Generated images saved to persistent storage (filesystem + database metadata)
- [ ] Each image linked to player, round, submission, and original prompt
- [ ] Support image retrieval by game code and round
- [ ] Images accessible via HTTP GET (served from public folder)
- [ ] Old images cleaned up (configurable retention policy)
- [ ] Database schema includes image metadata and expiration dates
- [ ] Support for image expiration (default 30 days)
- [ ] CDN-ready: architecture supports future move to cloud storage (S3, Azure Blob)

---

## Technical Requirements

### Database Schema

```sql
CREATE TABLE generated_images (
  image_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  round_id UUID NOT NULL,
  player_id UUID NOT NULL,
  submission_id UUID NOT NULL,
  completed_sentence TEXT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_path VARCHAR(500),
  art_style VARCHAR(50),
  ai_service VARCHAR(50),
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  FOREIGN KEY (game_id) REFERENCES games(game_id),
  FOREIGN KEY (round_id) REFERENCES rounds(round_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id),
  
  INDEX(game_id),
  INDEX(round_id),
  INDEX(expires_at)
);

CREATE TABLE image_cache (
  cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash VARCHAR(64) NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  image_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  hit_count INT DEFAULT 1,
  last_hit TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (image_id) REFERENCES generated_images(image_id),
  INDEX(prompt_hash)
);
```

### ImageStorageService

Create `ImageStorageService.js` with:
```javascript
class ImageStorageService {
  constructor(config) {
    this.baseDir = config.baseDir || './public/generated-images';
    this.retentionDays = config.retentionDays || 30;
    this.db = config.db;
  }

  async saveImage(buffer, gameCode, roundId, playerId);
  async getImage(gameCode, roundId, playerId);
  async getGameImages(gameCode, roundId);
  async cacheImageMetadata(playerId, roundId, sentence, url, style);
  async checkPromptCache(promptHash);
  async recordCacheHit(promptHash);
  async cleanupExpiredImages();
}
```

### Cache Deduplication

If identical prompt (sentence + cards) was generated before:
1. Calculate SHA256 hash of prompt
2. Check `image_cache` table for existing hash
3. If found: return cached image URL, increment hit count
4. If not found: generate new image, save to cache

### File Organization

```
picture-this-server/public/generated-images/
├── game-abc123/
│   └── round-1/
│       ├── player-1.jpg
│       ├── player-2.jpg
│       ├── player-3.jpg
│       └── player-4.jpg
└── game-def456/
    └── round-1/
        └── player-1.jpg
```

### Cleanup Job

Daily cron job (runs at 2 AM):
1. Query database for expired images (`expires_at < NOW()`)
2. Delete files from filesystem
3. Delete database records
4. Log cleanup results

### HTTP Endpoints

```javascript
// GET /api/games/:gameCode/rounds/:roundId/images
// Returns all images for a round
app.get('/api/games/:gameCode/rounds/:roundId/images', ...);

// Static file serving (handled by Express.static)
// GET /generated-images/{gameCode}/{roundId}/{playerId}.jpg
```

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] ImageStorageService created at `src/services/ImageStorageService.js`
- [ ] Database schema migrations created
- [ ] Images saved to filesystem with correct structure
- [ ] Metadata stored in database with expiration dates
- [ ] Cache deduplication working (prompt hash matching)
- [ ] Expiration/cleanup job created and scheduled
- [ ] HTTP endpoints for image retrieval
- [ ] Configuration in .env
- [ ] Unit tests for storage service
- [ ] Integration tests with ImageGeneratorService
- [ ] Performance test: cleanup handles 1000+ images
- [ ] Manual testing: images accessible, cleanup runs correctly
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 5.2 (Image Generation API - needs generated images)

**Unblocks:** 
- Story 3.3 (Judge Interface - needs image retrieval)
- Future stories for image sharing/replay

---

## Configuration

Add to `.env`:
```bash
# Image Storage (Story 5.3)
IMAGE_STORAGE_BASE_DIR=./public/generated-images
IMAGE_RETENTION_DAYS=30
IMAGE_CLEANUP_ENABLED=true
IMAGE_CLEANUP_CRON=0 2 * * *  # Daily at 2 AM UTC
```

---

## Testing

### Unit Tests
- Save image to filesystem (buffer → file)
- Retrieve image metadata from database
- Prompt cache hit (duplicate prompt returns cached URL)
- Prompt cache miss (new prompt generates image)
- Cleanup expired images (delete files + DB records)

### Integration Tests
- Full flow: generate → save → retrieve → cleanup
- Cache deduplication with duplicate prompts
- Cleanup job runs on schedule

### Performance Tests
- Image save/load speed (measure latency)
- Cleanup performance with 1000+ images
- Database query efficiency (indexes working)

---

## Cloud Storage (Future Enhancement)

For scalability, support cloud providers in future:
```javascript
if (process.env.IMAGE_STORAGE_TYPE === 's3') {
  const s3 = new AWS.S3();
  await s3.putObject({
    Bucket: 'picture-this-images',
    Key: `${gameCode}/${roundId}/${playerId}.jpg`,
    Body: imageBuffer
  });
}
```

---

## Monitoring & Analytics

Track metrics:
- Total images generated per day
- Cache hit rate (% of reused images)
- Average image size (MB)
- Total storage usage
- API cost savings from cache hits

---

## Source References

- [epics.md Story 5.3](../planning-artifacts/epics.md#story-53-image-caching--storage)
- [API_ENDPOINTS_SCHEMA.md § Generated Images Table](../planning-artifacts/API_ENDPOINTS_SCHEMA.md#generated-images-table)
