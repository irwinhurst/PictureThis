# Picture This - Development Epics & Stories

**Generated**: February 7, 2026  
**Project**: Picture This (Web-based party card game)  
**Platform**: Web (Jack Box style)

---

## Epic 1: Core Game Infrastructure & Server

Establish the backend foundation for game state management, WebSocket communication, and round orchestration.

### Story 1.1: Game Server & WebSocket Setup

**User Story:**  
As a backend engineer, I want to establish a Node.js/Python game server with WebSocket support, so that all players can receive real-time game state updates.

**Acceptance Criteria:**
- [ ] Game server starts and listens on configured port
- [ ] WebSocket server accepts client connections
- [ ] Server broadcasts game state updates to all connected clients at 100ms intervals
- [ ] Graceful handling of client disconnect/reconnect
- [ ] Basic error logging and connection monitoring

**Technical Requirements:**
- Node.js 18+ with Express.js + Socket.io
- Environment configuration via .env file
- Structured logging (Winston)
- Connection limits: Support 20+ concurrent players

**Source**: [GAME_DESIGN.md#7-Technical-Architecture](GAME_DESIGN.md#7-technical-architecture)

---

### Story 1.2: Game State Management & Round Orchestration

**User Story:**  
As a game server, I want to manage complete game state (players, rounds, scores, card hands), so that all game logic operates on a consistent source of truth.

**Acceptance Criteria:**
- [ ] Game state includes: players list, current round number, active judge, card hands per player, scores, game phase
- [ ] Round progression: Setup → Selection → ImageGen → Judging → Results → Next Round
- [ ] Automatic timer management (30-45s selection phase, 5s image gen display, 30s judging)
- [ ] Card hand management: Track 6-8 cards per player, automatic refill after rounds
- [ ] Immutability: Game state updates are atomic (all-or-nothing)

**Technical Requirements:**
- State stored in server memory (no persistence required for now)
- Round state transitions are strictly enforced (no invalid transitions)
- Timers use setInterval or async scheduling (no race conditions)
- Support game reset on host request

**Source**: [GAME_DESIGN.md#1-Core-Game-Mechanics](GAME_DESIGN.md#1-core-game-mechanics--flow)

---

### Story 1.3: Card Deck & Hand Management

**User Story:**  
As a game server, I want to manage a deck of cards and distribute hands to players, so that each player receives randomized cards without replacement until refresh.

**Acceptance Criteria:**
- [ ] Load base noun deck (150-200 nouns from database/JSON)
- [ ] Load sentence templates (30-50 templates with 1-3 noun blanks each)
- [ ] Shuffle noun deck on game start (Fisher-Yates or equivalent)
- [ ] Distribute 6-8 noun cards to each player at game start
- [ ] On round completion, refill each player's noun hand to starting size
- [ ] Track which noun cards are in which player's hand
- [ ] On each round start, randomly select one sentence template from available pool
- [ ] Prevent player from selecting same noun card twice in a single round

**Technical Requirements:**
- Card data structure: { id, text, type: noun|sentence, pack: base_game }
- Noun cards: 150-200 diverse nouns and short phrases
- Sentence cards: 30-50 templates with varying blank counts (1-3 blanks per sentence)
- Handle empty noun deck scenarios gracefully (reshuffle if needed)
- Sentence pool remains constant (templates cycle, not consumed)

**Source**: [GAME_DESIGN.md#5-Card-Database-Structure](GAME_DESIGN.md#5-card-database-structure)

---

### Story 1.4: Player Session Management

**User Story:**  
As a game server, I want to create and manage game sessions with unique codes, so that players can join the correct game via a short code.

**Acceptance Criteria:**
- [ ] Generate unique 6-character alphanumeric game code (e.g., "AB12CD")
- [ ] Store session metadata: creation time, host player ID, max rounds, current phase
- [ ] Session timeout after 60 minutes of inactivity
- [ ] Support multiple concurrent games (isolated state per game)
- [ ] Session cleanup on host disconnect or game end

**Technical Requirements:**
- Game code format: 6 uppercase alphanumeric (36^6 = ~2.2B possibilities)
- Session data structure: { code, host_id, created_at, last_activity_at, max_rounds, state: {...} }
- Collision check when generating new code (use Set or database for quick lookup)

**Source**: [GAME_DESIGN.md#2-Player-UI-Experience](GAME_DESIGN.md#2-player-ui-experience)

---

### Story 1.5: Host Authentication with Google OAuth

**User Story:**  
As a host, I want to authenticate using my Google account, so that my game sessions are tied to my identity and can be recovered if needed.

**Acceptance Criteria:**
- [ ] Integrate Google OAuth 2.0 login on host landing page
- [ ] Redirect to Google login, then back to Picture This after authentication
- [ ] Store host user profile: Google ID, email, name, profile picture
- [ ] Session token issued to authenticated host (JWT or session cookie)
- [ ] Host remains logged in across browser sessions (remember device)
- [ ] Logout button available to end session
- [ ] Error handling for failed authentication (network, user cancellation)

**Technical Requirements:**
- Google OAuth 2.0 Client ID (from Google Cloud Console)
- OAuth endpoints: /auth/google (login), /auth/google/callback (redirect)
- Session storage: JWT (signed, 24 hour expiry) or server-side session with secure cookie
- User table: { id, google_id, email, name, profile_picture_url, created_at, last_login_at }
- Middleware to verify authentication on protected endpoints

**Dependencies**: Story 1.1 (Game Server setup)

**Source**: [GAME_DESIGN.md#1-Core-Game-Mechanics](GAME_DESIGN.md#1-core-game-mechanics--flow)

---

### Story 1.6: Host Create Game Session

**User Story:**  
As an authenticated host, I want to create a new game session with configurable settings, so that I can invite players to my game.

**Acceptance Criteria:**
- [ ] "Create Game" button visible after host login
- [ ] Form to configure: Max players (2-20, default 8), Max rounds (5-20, default 10)
- [ ] System generates unique 6-character game code
- [ ] Game session created in database with host_id, code, settings
- [ ] Redirect host to game lobby screen showing code and waiting player list
- [ ] Display code prominently (large font for TV display)
- [ ] "Start Game" button available (disabled until 2+ players joined)

**Technical Requirements:**
- Create new game_sessions record with: code, host_id, max_players, max_rounds, status='lobby'
- Code generation: Check for collision, retry if exists
- Validation: Max players 2-20, max rounds 5-20
- Return: { code, game_id, host_id, created_at, settings }

**Dependencies**: Story 1.4 (Session Management), Story 1.5 (Host Authentication)

**Source**: [GAME_DESIGN.md#1-Core-Game-Mechanics](GAME_DESIGN.md#1-core-game-mechanics--flow)

---

## Epic 2: Database Design & Schema

Design and implement the database schema for persistent data storage, including players, games, cards, and game history.

### Story 2.1: Database Schema Design

**User Story:**  
As a backend engineer, I want to design a complete database schema, so that we have a clear structure for storing game data persistently.

**Acceptance Criteria:**
- [ ] Define tables: players, game_sessions, cards, game_rounds, player_selections, game_history, generated_images
- [ ] Specify primary keys and relationships (foreign keys)
- [ ] Define indexes for frequently queried columns (game_code, player_id, session_id)
- [ ] Schema documentation with column descriptions and data types
- [ ] Version control for schema (track migrations)
- [ ] Support for 1000+ concurrent players and 100+ simultaneous games

**Table Schemas:**

**users (hosts)**
- id (UUID) - Primary Key
- google_id (VARCHAR 255) - Indexed, Unique (Google OAuth ID)
- email (VARCHAR 255) - Indexed
- name (VARCHAR 100)
- profile_picture_url (VARCHAR 500, nullable)
- created_at (TIMESTAMP)
- last_login_at (TIMESTAMP, nullable)
- deleted_at (TIMESTAMP, nullable)

**players**
- id (UUID) - Primary Key
- username (VARCHAR 20) - Indexed
- avatar (VARCHAR 50) - Emoji or avatar ID
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP, nullable) - Soft delete support

**game_sessions**
- id (UUID) - Primary Key
- code (VARCHAR 6) - Indexed, Unique
- host_id (UUID) - FK to players.id
- status (ENUM: lobby, in_progress, completed, cancelled)
- max_rounds (INT)
- max_players (INT, default 8)
- created_at (TIMESTAMP)
- started_at (TIMESTAMP, nullable)
- ended_at (TIMESTAMP, nullable)
- deleted_at (TIMESTAMP, nullable)

**cards**
- id (UUID) - Primary Key
- text (VARCHAR 200) - Indexed
- type (ENUM: noun, sentence) - Indexed
- blank_count (INT, nullable) - For sentence cards: 1, 2, or 3 blanks
- pack (VARCHAR 50) - Indexed (e.g., base_game)
- difficulty (ENUM: easy, medium, hard)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

**game_participants**
- id (UUID) - Primary Key
- session_id (UUID) - FK to game_sessions.id, Indexed
- player_id (UUID) - FK to players.id, Indexed
- score (INT, default 0)
- judge_count (INT, default 0) - Times player served as judge
- created_at (TIMESTAMP)
- left_at (TIMESTAMP, nullable)

**game_rounds**
- id (UUID) - Primary Key
- session_id (UUID) - FK to game_sessions.id, Indexed
- round_number (INT)
- judge_id (UUID) - FK to players.id
- sentence_template (VARCHAR 200)
- status (ENUM: selection, image_gen, judging, completed)
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP, nullable)

**player_selections**
- id (UUID) - Primary Key
- round_id (UUID) - FK to game_rounds.id, Indexed
- player_id (UUID) - FK to players.id, Indexed
- blank_number (INT) - 1, 2, 3, etc.
- card_id (UUID) - FK to cards.id
- created_at (TIMESTAMP)

**round_results**
- id (UUID) - Primary Key
- round_id (UUID) - FK to game_rounds.id, Indexed
- winner_id (UUID) - FK to players.id (player whose cards were selected)
- judge_id (UUID) - FK to players.id
- selected_card_ids (JSON array) - Card IDs that won
- points_awarded (INT)
- created_at (TIMESTAMP)

**generated_images**
- id (UUID) - Primary Key
- round_id (UUID) - FK to game_rounds.id, Indexed
- prompt (TEXT)
- image_url (VARCHAR 500)
- image_base64 (LONGTEXT, nullable)
- generation_time_ms (INT) - Milliseconds to generate
- provider (VARCHAR 50) - e.g., "dall-e-3", "stability-ai"
- created_at (TIMESTAMP)

**Technical Requirements:**
- Database: PostgreSQL 14+ (primary), SQLite for dev/testing
- ORM: Sequelize (Node.js) or SQLAlchemy (Python)
- Connection pooling: Support 20 concurrent connections minimum
- Constraints: NOT NULL on critical fields, CHECK constraints for enums/ranges
- Indexes: On foreign keys, status fields, timestamps for range queries

**Source**: [GAME_DESIGN.md#7-Technical-Architecture](GAME_DESIGN.md#7-technical-architecture)

---

### Story 2.2: Database Migrations & DDL

**User Story:**  
As a backend engineer, I want to manage database schema changes through migrations, so that we can safely evolve the schema across environments.

**Acceptance Criteria:**
- [ ] Create migration system (Sequelize migrations or Alembic for Python)
- [ ] Write initial DDL migration to create all tables (Story 2.1 schema)
- [ ] Migration files are versioned and ordered (001, 002, etc.)
- [ ] Migrations support both up (apply) and down (rollback)
- [ ] Test rollback to ensure migrations are reversible
- [ ] Online migrations don't block writes (for large tables)
- [ ] Track migration history in database

**Technical Requirements:**
- Migration naming: `YYYYMMDD_HHmmss_description.sql` or framework-specific naming
- Rollback tested on all migrations
- Lock mechanism to prevent concurrent migrations
- Dry-run capability for previewing changes
- Seed data migrations separate from schema migrations

**Source**: Database best practices

---

### Story 2.3: Card Pack Seed Data & Initial Load

**User Story:**  
As the game server, I want to load a base deck of 150-200 cards on startup, so that games can begin with immediate card availability.

**Acceptance Criteria:**
- [ ] Define base card pack (base_game) with 150-200 nouns and 30-50 sentence templates
- [ ] Nouns: Mix of accessible and absurd single/short-phrase words
- [ ] Sentences: Various blank counts (1, 2, or 3 blanks per template)
- [ ] All cards are family-friendly (profanity check in review)
- [ ] Seed script loads cards into database on first run
- [ ] Idempotent load (safe to run multiple times without duplicates)
- [ ] Seed data from JSON file (cards.json) organized by card type
- [ ] Card difficulty distribution (mix of easy, medium, hard)

**Card Data File Format (cards.json):**
```json
{
  "base_game": {
    "nouns": [
      { "text": "elephant", "type": "noun", "difficulty": "easy" },
      { "text": "rubber duck", "type": "noun", "difficulty": "easy" },
      { "text": "my grandmother's dentures", "type": "noun", "difficulty": "medium" },
      ...
    ],
    "sentences": [
      { "text": "I saw a _____ trying to rob a bank", "type": "sentence", "blank_count": 1, "difficulty": "easy" },
      { "text": "Yesterday, I met a _____ at the grocery store while buying _____", "type": "sentence", "blank_count": 2, "difficulty": "medium" },
      { "text": "The best thing about _____ is that it smells like _____ and tastes like _____", "type": "sentence", "blank_count": 3, "difficulty": "hard" },
      ...
    ]
  }
}
```

**Technical Requirements:**
- Seed script: command-line runnable (npm run seed or python seed.py)
- Validation: Check noun count (150-200) and sentence count (30-50)
- Duplicate detection: Prevent loading same card pack twice
- Optional: Support multiple card packs (future expansion)

**Source**: [GAME_DESIGN.md#5-Card-Database-Structure](GAME_DESIGN.md#5-card-database-structure)

---

### Story 2.4: Database Connection & Pooling Configuration

**User Story:**  
As the backend server, I want configured database connection pooling, so that I can efficiently handle concurrent player connections without exhausting database resources.

**Acceptance Criteria:**
- [ ] Connection pool with configurable size (default 20 connections)
- [ ] Idle connection timeout (30 minutes, configurable)
- [ ] Connection validation/health checks before use
- [ ] Connection retry on failure (exponential backoff)
- [ ] Environment-specific configs (dev, staging, prod)
- [ ] Database URL stored in .env file (not hardcoded)
- [ ] Graceful shutdown: drain connection pool before exit

**Technical Requirements:**
- Pool size: Min 5, Max 20 (configurable)
- Idle timeout: 30 minutes
- Health check query: SELECT 1 (lightweight)
- Retry strategy: 3 attempts with 1s, 2s, 4s backoff
- Logging: Connection events (acquire, release, error)

**Environment Variables:**
- `DATABASE_URL` - Connection string (postgresql://user:pass@host/db)
- `DB_POOL_MIN` - Minimum connections (default 5)
- `DB_POOL_MAX` - Maximum connections (default 20)
- `DB_IDLE_TIMEOUT` - Idle timeout in seconds (default 1800)

**Source**: Database best practices for web apps

---

## Epic 3: Player Mobile UI & Controls

Deliver a responsive mobile web interface for players to join, manage hand, and select cards.

### Story 3.1: Player Join & Avatar Setup

**User Story:**  
As a player, I want to enter a game code and create a custom avatar/name, so that I can join a game and be identified.

**Acceptance Criteria:**
- [ ] Input field for 6-character game code (auto-formatted)
- [ ] Name input field (max 20 characters, alphanumeric + spaces)
- [ ] Avatar picker: 6-8 emoji options in grid (minimum 2x2 layout)
- [ ] "Join Game" button validates all fields before submission
- [ ] Error message if code doesn't exist or game is full
- [ ] Success: Player sees lobby waiting screen with player list

**Technical Requirements:**
- Responsive design: Mobile first (320px+ width), works on iOS Safari + Chrome
- Form validation on client (real-time feedback)
- Server validation on join (code exists, room capacity < max)
- Selected avatar sent with player name on join

**Source**: [UI_WIREFRAMES.md#1-Join-Screen](UI_WIREFRAMES.md#1-join-screen)

---

### Story 3.2: Player Card Hand Display & Selection

**User Story:**  
As a player, I want to see my hand of cards and select appropriate card(s) for sentence blanks, so that I can complete the sentence.

**Acceptance Criteria:**
- [ ] Display 6-8 cards in a scrollable/grid layout
- [ ] Show sentence template with numbered blanks above card hand
- [ ] Tap cards to select them for each blank (visual feedback: highlight/checkmark)
- [ ] Submit button enabled only when all blanks filled
- [ ] Timer shows remaining seconds (countdown bar + number)
- [ ] Auto-submit on timer expiry if anything selected, or reject with warning
- [ ] Prevent selecting same card twice

**Technical Requirements:**
- Touch-friendly card size: minimum 60x80px
- Responsive layout adjusts for landscape/portrait
- Real-time timer sync with server (tolerance ±500ms)
- Visual feedback for selected cards (background color, checkmark, or border)

**Source**: [UI_WIREFRAMES.md#4-Selection-Phase-Screen](UI_WIREFRAMES.md#4-selection-phase-screen-player), [GAME_DESIGN.md#3-Card-Selection-Phase](GAME_DESIGN.md#1-core-game-mechanics--flow)

---

### Story 3.3: Judge's Judging Interface

**User Story:**  
As the judge, I want to view 4 generated images and select the funniest one, so that I can award points to the winning player.

**Acceptance Criteria:**
- [ ] Display 4 images in 2x2 grid (or carousel on mobile)
- [ ] Images clearly labeled with player number (not name, for impartiality)
- [ ] Tap/swipe to view carousel if layout requires
- [ ] "Pick" button to confirm selection
- [ ] Visual highlight on hovered/selected image
- [ ] Timer for judging phase (30-40 seconds)
- [ ] Cannot interact until all images have loaded

**Technical Requirements:**
- Images preloaded/cached before display to judge
- Image aspect ratio consistent (4:3 or 1:1 recommended)
- Touch-friendly selection areas (minimum 80x100px each)
- Spinner during image load, then instant display

**Source**: [UI_WIREFRAMES.md#6-Judge's-Judging-Screen](UI_WIREFRAMES.md#6-judges-judging-screen)

---

### Story 3.4: Round Results & Leaderboard

**User Story:**  
As a player, I want to see round results (who won, points awarded) and current leaderboard, so that I understand the score progression.

**Acceptance Criteria:**
- [ ] Show winning card combo that was selected
- [ ] Display points awarded (e.g., "+5 POINTS")
- [ ] Show updated leaderboard with current rankings
- [ ] Auto-progress to next round after 5 seconds (visible countdown)
- [ ] Final leaderboard available at game end
- [ ] Medals/trophies for top 3 players at game end
- [ ] "Funniest Judge" special award displayed

**Technical Requirements:**
- Leaderboard sorted by points (descending)
- Auto-advance timer interruptible (manual next button optional)
- Data refresh from server on round completion

**Source**: [UI_WIREFRAMES.md#7-Results-Screen](UI_WIREFRAMES.md#7-results-screen-player)

---

## Epic 4: Host Display & Game Dashboard

Build a large-screen TV-friendly dashboard showing game state, timers, images, and management controls.

### Story 4.1: Host Lobby Screen

**User Story:**  
As a host, I want to see the game code, player list, and controls to start the game, so that I can manage the lobby and begin play.

**Acceptance Criteria:**
- [ ] Display large, readable game code (6-character, 48pt+ font)
- [ ] Live updating player list with avatars and names
- [ ] Player count indicator (X/max players)
- [ ] Rounds selector dropdown (10, 15, 20, custom)
- [ ] "Start Game" button (disabled if fewer than 2 players)
- [ ] Layout optimized for 40"+ screens (readable from 10 feet away)

**Technical Requirements:**
- Minimum 24pt font for all text (TV viewing distance ~8-10 feet)
- Clean, vibrant colors with high contrast
- Real-time player list updates via WebSocket

**Source**: [UI_WIREFRAMES.md#1-Lobby-Screen](UI_WIREFRAMES.md#1-lobby-screen)

---

### Story 4.2: Round Intro & Judge Announcement

**User Story:**  
As a host, I want to display the current round number, judge name, and sentence template, so that all players understand the setup.

**Acceptance Criteria:**
- [ ] Show round number (e.g., "ROUND 3 OF 10")
- [ ] Display judge's avatar and name prominently
- [ ] Show sentence template with blanks visible (e.g., "I SAW A _____ TRYING TO _____")
- [ ] Mini leaderboard in corner with top 4 players
- [ ] Clear visual hierarchy (judge info largest, sentence middle, leaderboard small)

**Technical Requirements:**
- 36pt font minimum for judge name
- 28pt font for sentence template
- Leaderboard: 18pt font, shows rank, name, points

**Source**: [UI_WIREFRAMES.md#2-Round-Intro-Screen](UI_WIREFRAMES.md#2-round-intro-screen)

---

### Story 4.3: Selection Timer & Progress Display

**User Story:**  
As a host, I want to see a countdown timer and player submission progress during the selection phase, so that all players understand time remaining.

**Acceptance Criteria:**
- [ ] Display countdown timer (visual bar + numeric seconds)
- [ ] Show number of players who have submitted (e.g., "3 of 4 players ready")
- [ ] Animated spinner for visual interest
- [ ] Leaderboard visible in corner (not distracting)
- [ ] Timer counts down to 0 and auto-advances to image generation

**Technical Requirements:**
- Timer accuracy: ±1 second
- Progress bar animates smoothly
- Visual feedback when all players have submitted (progress bar fills fully)

**Source**: [UI_WIREFRAMES.md#3-Selection-Timer-Screen](UI_WIREFRAMES.md#3-selection-timer-screen)

---

### Story 4.4: Image Generation Display

**User Story:**  
As a host, I want to see a loading state while AI generates images, so that players understand the system is processing their prompts.

**Acceptance Criteria:**
- [ ] Show "Creating images..." message with animated spinner
- [ ] Progress counter: "Generated: X of 4 images"
- [ ] Calming, engaging animation
- [ ] Automatically transition to judging screen when all images ready

**Technical Requirements:**
- Spinner animation smooth (60 FPS)
- Estimated generation time 10-30 seconds (dependent on API service)
- Loading state duration acceptable (show encouraging message if >20s)

**Source**: [UI_WIREFRAMES.md#4-Image-Generation-Screen](UI_WIREFRAMES.md#4-image-generation-screen)

---

### Story 4.5: Judging Display with Images

**User Story:**  
As a host, I want to display 4 generated images prominently for the judge to select, so that all players can see the "punchlines."

**Acceptance Criteria:**
- [ ] Display 4 images in 2x2 grid (or carousel responsive to screen size)
- [ ] Large image size (suitable for 40"+ TV viewing, at least 400x400px each)
- [ ] Images labeled with player numbers only (not names, for impartiality)
- [ ] Fade-in animation as images load (2-3 second transition)
- [ ] Judge indicator showing who is choosing
- [ ] Instructions: "Tap on TV or click mobile device to pick"
- [ ] Optional: Highlight selected image with border or glow effect

**Technical Requirements:**
- Images cached in memory after generation for instant display
- Layout: responsive to screen size (scaling from mobile to 4K)
- Aspect ratio consistency across all 4 images

**Source**: [UI_WIREFRAMES.md#5-Judging-Display-Screen](UI_WIREFRAMES.md#5-judging-display-screen)

---

### Story 4.6: Results & Score Update Animation

**User Story:**  
As a host, I want to highlight the winning image and show points awarded, so that all players celebrate the winner.

**Acceptance Criteria:**
- [ ] Display winning image with prominent highlight/border
- [ ] Show winning player name/avatar
- [ ] Show winning card combo (e.g., "elephant" + "juggling" + "sparkly")
- [ ] Animate points awarded (pop/bounce effect)
- [ ] Show confetti or celebration animation
- [ ] Display updated leaderboard with new rankings
- [ ] Highlight next judge's name/avatar
- [ ] Auto-advance to next round after 5 seconds (visible countdown)

**Technical Requirements:**
- CSS animations or canvas-based effects for confetti
- Leaderboard sorts dynamically after score update
- Natural pause before auto-advance (5 seconds)

**Source**: [UI_WIREFRAMES.md#6-Results-Screen](UI_WIREFRAMES.md#6-results-screen)

---

### Story 4.7: Final Leaderboard & Game End

**User Story:**  
As a host, I want to display final rankings, medals for top players, and special awards, so that the game ends on a celebratory note.

**Acceptance Criteria:**
- [ ] Show "GAME OVER" clearly
- [ ] Display final leaderboard with all players ranked by points
- [ ] Add medals: 🥇 for 1st, 🥈 for 2nd, 🥉 for 3rd
- [ ] Display special award: "⭐ FUNNIEST JUDGE: [Player Name]"
- [ ] Buttons: "Play Again" and "Exit Game"
- [ ] Final leaderboard visible for review (not auto-advance)

**Technical Requirements:**
- Leaderboard sorted by total points (descending)
- Award calculation: Count judge selections per player for "Funniest Judge"
- No time pressure (manual button required to proceed)

**Source**: [UI_WIREFRAMES.md#7-Final-Leaderboard-Screen](UI_WIREFRAMES.md#7-final-leaderboard-screen)

---

## Epic 5: AI Image Generation Integration

Integrate with an external AI image generation service to create images from card selections.

### Story 5.1: Sentence Formatting & Prompt Engineering

**User Story:**  
As the image generation service, I want to receive well-formatted, descriptive prompts from card selections, so that generated images are visually coherent and funny.

**Acceptance Criteria:**
- [ ] Take the sentence template with noun blanks
- [ ] Fill blanks with selected noun cards in order
- [ ] Example:
  - Template: "I saw a _____ trying to rob a bank while wearing a _____"
  - Selected nouns: [elephant, tutu]
  - Completed: "I saw an elephant trying to rob a bank while wearing a tutu"
- [ ] Prepend "Realistic illustration of:" to create image prompt
- [ ] Final prompt: "Realistic illustration of: I saw an elephant trying to rob a bank while wearing a tutu"
- [ ] Keep total prompt concise (under 200 characters)
- [ ] Handle special characters/punctuation safely

**Technical Requirements:**
- Prompt template: "Realistic illustration of: {sentence}"
- Card text integrated without extra articles or connectors
- No profanity or unsafe content filter (inherit from card deck validation)

**Source**: [GAME_DESIGN.md#6-AI-Image-Generation-Integration](GAME_DESIGN.md#6-ai-image-generation-integration)

---

### Story 5.2: Image Generation API Integration

**User Story:**  
As the backend, I want to call an AI image generation API (DALL-E, Midjourney, or Stability AI) and retrieve generated images, so that we have visual punchlines for the judge.

**Acceptance Criteria:**
- [ ] Integrate with at least one service (DALL-E 3 or Stability AI recommended for cost/quality)
- [ ] API call includes formatted prompt and authentication
- [ ] Retry logic: 3 attempts with exponential backoff if API fails
- [ ] Timeout handling: 60-second timeout with fallback to placeholder image
- [ ] Response includes image URL or Base64 encoded image data
- [ ] Handle rate limiting (queue requests if API near limit)

**Technical Requirements:**
- API key stored in environment variables (.env)
- SDK or HTTP client for chosen service
- Request timeout: 60 seconds
- Fallback image: Gray placeholder with error message if generation fails
- Log all API calls and failures for debugging

**Source**: [GAME_DESIGN.md#6-AI-Image-Generation-Integration](GAME_DESIGN.md#6-ai-image-generation-integration)

---

### Story 5.3: Image Caching & Storage

**User Story:**  
As the game server, I want to cache generated images for the current game session, so that we can replay/share images without re-generating them.

**Acceptance Criteria:**
- [ ] Store generated images in memory during active game session
- [ ] Cache key: Round number + image variant (e.g., "round-3-image-1")
- [ ] Images available for instant replay on leaderboard/results screens
- [ ] Clear cache on game end
- [ ] Optional: Persist to disk or CDN for post-game sharing (MVP: memory only)

**Technical Requirements:**
- In-memory cache (Map or similar)
- Cache cleanup on session timeout
- Image format: PNG or JPEG (not SVG, for generation service compatibility)

**Source**: [GAME_DESIGN.md#6-AI-Image-Generation-Integration](GAME_DESIGN.md#6-ai-image-generation-integration)

---

## Epic 6: Scoring System & Leaderboard

Implement scoring logic, point tracking, and dynamic leaderboard updates.

### Story 6.1: Score Calculation & Points Award

**User Story:**  
As the game server, I want to calculate and award points based on judge selection and bonuses, so that players' scores reflect the game progression accurately.

**Acceptance Criteria:**
- [ ] Base points: 5 points to winning player (whose cards were selected by judge)
- [ ] Bonus: +2 points if judge picks 3 cards from same player in a round
- [ ] Funniest Judge bonus: +3 points at end of game to player judged most times (most selections)
- [ ] Award points immediately after judge selects winner
- [ ] Track total score across all rounds
- [ ] Win condition: First to 30 points OR all rounds completed

**Technical Requirements:**
- Score data: { player_id, round_scores: [5, 7, 5, ...], total_score: 42 }
- Point calculation includes base + applicable bonuses
- Immutable score record (no modifications after round completion)

**Source**: [GAME_DESIGN.md#4-Scoring-System](GAME_DESIGN.md#4-scoring-system)

---

### Story 6.2: Leaderboard Calculation & Updates

**User Story:**  
As the game server, I want to maintain a current leaderboard ranking all players by score, so that players always see accurate standings.

**Acceptance Criteria:**
- [ ] Leaderboard sorted by total score (descending)
- [ ] Ties broken by: earliest win in game
- [ ] Leaderboard updated after every round
- [ ] First-place player highlighted or emphasized
- [ ] Display format: Rank, Name/Avatar, Points (e.g., "1. Alex 45 pts")
- [ ] Displayed on host screen after every round and at game end

**Technical Requirements:**
- Leaderboard recalculated and broadcast after each round completion
- Sort algorithm: descending by total_score, then by order of first win
- Real-time updates via WebSocket to all clients

---

### Story 6.3: Final Standings & Awards

**User Story:**  
As a game, I want to calculate final standings including "Funniest Judge" award, so that we can celebrate achievements beyond just high score.

**Acceptance Criteria:**
- [ ] Calculate final leaderboard after all rounds complete
- [ ] Award medals to top 3: 🥇 🥈 🥉
- [ ] Calculate "Funniest Judge": Count times each player was judge and had selections
- [ ] Award "+3 bonus points" to Funniest Judge (reflected in final tally)
- [ ] Display final standings with all players ranked
- [ ] Display special award: "⭐ FUNNIEST JUDGE: [Player Name]"

**Technical Requirements:**
- Funniest Judge calculation: Count judge selections per player across all rounds
- Award bonus points only if that award exists (tie → no individual award, but display "Tie")
- Final tally includes bonus points in displayed total

**Source**: [GAME_DESIGN.md#4-Scoring-System](GAME_DESIGN.md#4-scoring-system)

---

## Epic 7: Real-time Synchronization & WebSocket Communication

Ensure all clients receive consistent, synchronized game state updates and handle network edge cases.

### Story 7.1: Client-Server Sync Protocol

**User Story:**  
As a game client, I want to send card selections and receive game state updates in a consistent format, so that my UI always reflects the true game state.

**Acceptance Criteria:**
- [ ] Client sends: player_id, selected_cards (array of card IDs), timestamp
- [ ] Server broadcasts: game state snapshot including round, phase, leaderboard, timers
- [ ] Update frequency: at least every 100ms for timers, immediately for phase changes
- [ ] Payload size: <10KB per update (compression if needed)
- [ ] Message format: JSON with consistent schema versioning

**Technical Requirements:**
- WebSocket message schema: { type: "state_update", data: {...}, version: "1.0" }
- Client validates message schema (ignore malformed messages)
- Timestamp included in all messages for debugging
- Network resilience: auto-reconnect on disconnect (exponential backoff)

---

### Story 7.2: Disconnect & Reconnection Handling

**User Story:**  
As a player with a network interruption, I want my client to automatically reconnect without losing my place in the game, so that I can continue playing.

**Acceptance Criteria:**
- [ ] Client auto-reconnects on WebSocket drop (up to 3 attempts, 5s timeout each)
- [ ] On reconnect, client resync's with current game state from server
- [ ] If reconnect fails after 3 attempts, show "Connection Lost" message with manual retry
- [ ] Server removes unresponsive clients after 30 seconds of inactivity
- [ ] If player's socket drops after card selection submitted, their selection counts (not lost)
- [ ] Host disconnect ends the game gracefully for all players

**Technical Requirements:**
- Exponential backoff: 1s, 2s, 4s between retry attempts
- Client stores last known state while offline
- Server tracks client socket ID and player ID separately
- Graceful shutdown: server notifies all clients on host disconnect

---

### Story 7.3: Game Phase Synchronization

**User Story:**  
As a game server, I want to synchronously transition all clients through game phases (Selection → ImageGen → Judging → Results), so that UI states remain consistent.

**Acceptance Criteria:**
- [ ] Server maintains authoritative phase state
- [ ] Phase changes broadcast to all clients immediately (WebSocket message)
- [ ] Clients are not allowed to send state-changing actions during wrong phase (validation)
- [ ] Phase transitions: Submission → ImageGeneration (auto 1s) → Judging (wait for judge choice) → Results (5s) → NextRound
- [ ] Timers synced client-side with server time (NTP-like adjustment)

**Technical Requirements:**
- Phase enum: LOBBY, ROUND_INTRO, SELECTION, IMAGE_GEN, JUDGING, RESULTS, GAME_END
- Server timestamp with every phase change message
- Client adjusts local timer using server time (handles clock skew)

---

## Epic 8: Testing, Polish & Deployment

Final quality assurance, bug fixes, and production readiness.

### Story 8.1: Automated Testing Suite

**User Story:**  
As a developer, I want automated unit and integration tests covering critical game logic, so that we can deploy with confidence.

**Acceptance Criteria:**
- [ ] Unit tests for: card shuffling, score calculation, round logic, state transitions
- [ ] Integration tests for: game flow (setup → selection → results → next round)
- [ ] Mock WebSocket for testing real-time communication
- [ ] Test coverage: 80%+ for game logic, 60%+ overall
- [ ] Tests run in CI/CD pipeline on every commit

**Technical Requirements:**
- Testing framework: Jest (Node.js) or Pytest (Python)
- Mocking library for external services (API calls, date/time)
- CI/CD integration (GitHub Actions, GitLab CI, etc.)

---

### Story 8.2: Performance Optimization

**User Story:**  
As a player, I want smooth UI performance with responsive card taps and timely image display, so that the gameplay experience is fluid.

**Acceptance Criteria:**
- [ ] Card selection response time: <100ms (tap to highlight)
- [ ] Image display: fade-in complete within 2-3 seconds
- [ ] Timer updates: smooth countdown without jank (60 FPS target)
- [ ] Mobile performance: acceptable on entry-level phones (>30 FPS)
- [ ] Memory usage: <100MB per client, <500MB server for 10 concurrent games

**Technical Requirements:**
- Frontend: Lazy loading for images, virtual scrolling for card lists if needed
- Backend: Connection pooling, efficient data structures (Map instead of Array for lookups)
- CDN: Images served via CDN for fast delivery

---

### Story 8.3: Bug Fixes & Edge Cases

**User Story:**  
As a quality assurance tester, I want all edge cases handled gracefully, so that the game is robust against unusual player behavior.

**Acceptance Criteria:**
- [ ] Multiple rapid button clicks: debounced/ignored
- [ ] Player leaving mid-round: their hand removed, game continues
- [ ] Network latency >5s: graceful timeout + reconnection prompts
- [ ] Image generation failures: fallback placeholder, game continues
- [ ] Simultaneous judge selections: first received wins (deterministic ordering)
- [ ] Invalid card selections: rejected with user-friendly error

**Technical Requirements:**
- Debounce UI actions (300ms threshold)
- Server validates all client inputs (no trust)
- Comprehensive error logging and alerting

---

### Story 8.4: Production Deployment & Monitoring

**User Story:**  
As an operator, I want to deploy the game to production and monitor health, so that we can respond to issues quickly.

**Acceptance Criteria:**
- [ ] Docker containerization for backend and frontend
- [ ] Environment configuration (dev, staging, prod)
- [ ] Automated deployment pipeline (Docker build → push → deploy)
- [ ] Health check endpoint for load balancer
- [ ] Error tracking and logging (Sentry, DataDog, etc.)
- [ ] Performance monitoring (response times, error rates, WebSocket connections)
- [ ] Graceful shutdown (complete in-flight rounds before stopping)

**Technical Requirements:**
- Docker: Backend service + Frontend service (separate containers)
- Kubernetes (optional): Horizontal scaling for backend
- Monitoring: Dashboard showing active games, players, errors
- Alerting: Critical errors notify on-call engineer

---

### Story 8.5: Host Keep-Alive Polling (Service Spin-Down Prevention)

**User Story:**  
As a host running on a free/cheap hosting tier with auto-sleep, I want the host dashboard to periodically poll the backend, so that the service stays active and WebSocket connections don't drop.

**Acceptance Criteria:**
- [ ] Host dashboard sends lightweight HTTP request every 5 minutes
- [ ] Polling endpoint: `GET /api/keep-alive` or `POST /api/health`
- [ ] Response: `{ status: "ok", timestamp }` (~100 bytes, <1KB)
- [ ] Polling runs silently in background (no UI changes or notifications)
- [ ] Polling only active when host page is open (checked via isVisible API)
- [ ] Prevents 15-minute auto-sleep on Render, Railway, or similar platforms
- [ ] Does not interfere with WebSocket communication (polling is backup)
- [ ] Gracefully handles polling failures (logs but doesn't break game)

**Technical Requirements:**
- JavaScript timer: setInterval(pollKeepAlive, 5 * 60 * 1000) = 5 minute interval
- Polling function: fetch('/api/keep-alive', { method: 'GET', signal: AbortSignal.timeout(10000) })
- Detect page visibility: document.addEventListener('visibilitychange', togglePolling)
- Stop polling if host page is hidden/minimized (Save battery)
- Log polling failures but don't surface to user
- Endpoint on backend: lightweight, no database access required

**Backend Implementation:**
```javascript
app.get('/api/keep-alive', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
```

**Hosting Impact:**
- Enables free tier deployment on Render (no spin-down with active polling)
- Also works on Railway, Fly.io, and other platforms with inactivity timeouts
- Cost savings: Stay on free/cheap tier instead of upgrading to paid

**Source**: [GAME_DESIGN.md#7-Technical-Architecture](GAME_DESIGN.md#7-technical-architecture)

---

## Story Dependencies & Sequencing

**Recommended Order** (by epic, stories implement in sequence):

1. **Epic 1** (Core Infrastructure) → **Epic 2** (Database) → **Epic 3** (Player UI) → **Epic 4** (Host UI)
   - Foundation & database allow testing with real players
2. **Epic 5** (Image Generation) → integrated when stories 1-4 complete
3. **Epic 6** (Scoring) → parallel with Epic 3/4
4. **Epic 7** (WebSocket Sync) → parallel with Epic 1, foundational
5. **Epic 8** (Testing & Deployment) → ongoing, final steps before launch

**Critical Path**: Epic 1.1, 1.2, 1.3, 1.4 → Epic 2.1, 2.2, 2.3 → Epic 3.1, 3.2, 3.4 → Epic 4.1-4.6 → Epic 5.1, 5.2 → Epic 6.1 → ready for alpha playtest

---

## Summary

| Aspect | Count |
|--------|-------|
| Total Epics | 8 |
| Total Stories | 30 |
| Estimated Effort | 12-16 weeks (2-person team) |
| MVP Stories | 1.1-1.4, 2.1-2.4, 3.1-3.6, 4.1-4.2, 5.1, 6.1-6.2 |
| Polish | Story 7.1-7.4, 8.5 (final 2 weeks) |

