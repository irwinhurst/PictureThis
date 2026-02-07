# Picture This - Game Design Document

A family-friendly party card game where players create absurd, visual scenes by completing fill-in-the-blank sentences. The completed sentence is sent to an AI image generator, and the resulting image becomes the punchline. Playstyle is similar to card games such as Cards Against Humanity.

## Target Specifications
- **Player Count**: Any size (2-20+ players, sweet spot: 4-8)
- **Platform**: Web-based, Jack Box style party game
- **Input Method**: Cards selection (multiple choice, similar to Cards Against Humanity)
- **Punchline**: AI-generated images
- **Judge Mechanic**: Active player who chose the sentence picks the best image

---

## 1. Core Game Mechanics & Flow

### Game Setup & Flow

1. **Host Authentication**:
   - Host visits Picture This website
   - Required: Login with Google account (OAuth 2.0)
   - Once authenticated, host can create and manage games

2. **Create Game**:
   - Host clicks "Create Game"
   - System generates unique 6-character game code (e.g., "AB12CD")
   - Host configures: Max players (default 8), Rounds (default 10)
   - Game lobby created, ready for players to join
   - Host sees player list and "Start Game" button (disabled until min 2 players)

3. **Player Join**:
   - Players (no login required) visit Picture This and enter game code
   - Players enter unique name and select avatar
   - Players are added to the game session
   - Host sees real-time player list update

4. **Host Starts Game**:
   - Once 2+ players joined and host ready, host clicks "Start Game"
   - Game transitions from lobby to first round

### Game Round Structure

1. **Round Start**:
   - A random player becomes the "Judge" (rotates each round)
   - A sentence template displays with blanks: "I saw a _____ trying to rob a bank while wearing a _____"
   - Judge cannot play (watches other players select)

2. **Card Selection Phase** (30-45 seconds):
   - All OTHER players select a noun card from their hand for EACH blank in the sentence
   - Players submit simultaneously (prevents observing others)
   - Judge watches timer, cannot play

3. **Image Generation Phase**:
   - System fills sentence blanks with selected nouns: "I saw an **elephant** trying to rob a bank while wearing a **tutu**"
   - Generates AI image from completed sentence via image generation API
   - Display: "Creating images..." with progress indicator

4. **Judging Phase**:
   - All 4 player combinations are sent to image generator (4 unique images created)
   - Judge views 4 generated images side-by-side
   - Judge selects the first and second place images
   - Players/Audience vote on their favorite (1pt)
   - The players whose nouns were in the chosen image scores points (first:5pts, second:2pts)

5. **Scoring & Next Round**:
   - Points awarded to winning players (first:5pts, second:2pts, audience: 1pt)
   - Leaderboard updated and displayed
   - New Judge selected for next round
   - Players draw new noun cards to refill hand to 6-8 cards
   - Repeat for remaining rounds

6. **Game End**:
   - After all rounds complete, show final leaderboard
   - Display special award: "⭐ Funniest Judge: [Player]"
   - Host option: "Play Again" or "Exit"

### Key Mechanics
- **Authentication**: Host login required (Google OAuth), players anonymous
- **Game Code**: 6-character session identifier for player joining
- **Hand Limit**: Each player has 6-8 noun cards at all times
- **Card Refresh**: After each round, draw nouns until hand is full
- **Judge Rotation**: Each player judges exactly once per round cycle
- **Simultaneous Play**: Prevents information leakage between players
- **Noun-Only Selection**: Sentence blanks filled only with noun cards (no verbs/adjectives)

---

## 2. Player UI Experience

### Device Setup (Jack Box Style)
- **Host/Main Screen**: TV/monitor showing current sentence, timer, images, scores
- **Player Devices**: Phones/tablets with card hands and selection interface

### Player Mobile Screen States

| State | Display |
|-------|---------|
| **Waiting to Join** | Game code input, name/avatar selection |
| **Round Waiting** | "Next round starting...", their current score |
| **Judge Round** | "You're judging this round!" (spectator view) |
| **Selection Phase** | Card hand (8 cards), blanks above. Tap cards to fill blanks, submit button |
| **Voting Phase** | "Waiting for judge..." spinner |
| **Results** | "Your cards won! +5 pts!" or "Judge picked image #3 and #2" |
| **Leaderboard** | End-game stats (wins, points, funniest judge) |

---

## 3. Host/Main Display UI

| Screen | Content |
|--------|---------|
| **Lobby** | Game code, player list (names/avatars), start button |
| **Round Intro** | Current judge's name, sentence template (censored blanks) |
| **Selection Timer** | "Players submitting... 30 seconds" with animated countdown |
| **Image Generation** | "Creating images..." with loading state |
| **Judging Display** | 4 images side-by-side (or carousel), Judge watching, timer |
| **Results** | Shows which player's cards won, award animation, next judge highlight |
| **Final Leaderboard** | Ranked by points, "Funniest Judge" special award |

---

## 4. Scoring System

- **Base Points**: Players whose cards were chosen score 5pts and 2pts for first and secodn place
- **Bonus Points**:
  - Players/Audience Favorite scores 1pt
- **Win Condition**: Highest points after fixed number of rounds chosen at game setup

---

## 5. Card Database Structure

### Card Types
- **Noun Cards**: Players fill blanks with these single words or short phrases
  - Examples: "elephant", "rubber duck", "my uncle", "DJ losing music", "cover in pudding","a dog carrying something important ", "a referee with no game", "a DJ who lost the playlist","a raccoon stealing snacks"
- **Sentence Cards**: Sentence templates with blanks to be filled only with nouns
  - Examples: 
    - "I saw a _____ trying to rob a bank"
    - "Yesterday, I met a _____ at the grocery store"
    - "The best thing about _____ is that it smells like _____"
  - Sentences use natural grammar with nouns filling the blanks (creates absurdity when random nouns inserted)

### Card Format (Database)
```json
{
  "id": "card_001",
  "text": "elephant",
  "type": "noun",
  "pack": "base_game"
}
```

OR for sentence cards:
```json
{
  "id": "sent_001",
  "text": "I saw a _____ trying to rob a bank",
  "type": "sentence",
  "blank_count": 1,
  "pack": "base_game"
}
```

### Deck Composition
- **Noun Cards**: 150-200 base nouns + short phrases
  - Mix of accessible and absurd nouns to create funny combinations when inserted into sentences
- **Sentence Cards**: 100 sentence templates
  - Variety of blank counts (1 (70%), 2 (20%), or 3(10%) noun blanks per sentence)
  - Fixed sentence structure with only noun replacement positions

---

## 6. AI Image Generation Integration

### Flow
1. Get completed sentence from card selections
2. Send to AI service (OpenAI DALL-E, Midjourney API, or Stability AI)
3. Generate 1 high-quality image per player per round
4. Cache/store for later replay/sharing
5. Display with 2-3 second fade-in animation

### Sentence Format Sent to AI
- Template: Create a clear, detailed image that literally depicts the following scene as a single moment in time:

"[INSERT COMPLETED SENTENCE HERE]"

The scene should be visually understandable without text, showing all key subjects, actions, and surroundings implied by the sentence. Use expressive body language, clear facial expressions, and a strong sense of environment. The image should be family-friendly, humorous, and slightly exaggerated for clarity. Show the moment just before or just after something goes wrong.
- Keep prompts concise but descriptive
- Consistency: Choose a random art style per round and use it for all players
    **Realistic:** realistic photography, natural lighting, candid moment  
    **Cartoon:** colorful cartoon illustration, exaggerated expressions  
    **Cinematic:** wide shot, dramatic lighting, frozen motion  
    **Whimsical:** children’s book illustration, soft colors  

---

## 7. Technical Architecture

```
Frontend (Players/Judge)
├── React/Vue or plain HTML+JS
├── Real-time updates via WebSocket
└── Mobile-optimized (phones/tablets)

Backend
├── Game Server (Node.js + Express)
│   ├── Game state management
│   ├── Round logic & timers
│   ├── Card deck management
│   └── WebSocket communication (Socket.io)
├── AI Integration Service
│   ├── API calls to image generator
│   ├── Prompt engineering
│   └── Image caching
└── Database (PostgreSQL)
    ├── users (host authentication)
    ├── players (game participants)
    ├── game_sessions (game instances)
    ├── game_participants (join table)
    ├── game_rounds (round tracking)
    ├── cards (noun + sentence templates)
    ├── player_selections (card choices)
    ├── round_results (scoring outcomes)
    └── generated_images (image cache)

Host Display
└── Web-based dashboard (browser on TV)
    ├── Polling keep-alive (every 5 min)
    └── Prevents service spin-down on free/cheap hosting
```

### Database Schema Summary

**9 Core Tables** (detailed spec in epics.md Story 2.1):

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | Host authentication (Google OAuth) | id, google_id, email, name, profile_picture_url |
| `players` | Game participant identities | id, username, avatar |
| `game_sessions` | Game instances with config | id, code (6-char), host_id, status, max_rounds, max_players |
| `game_participants` | Player-game assignments | id, session_id, player_id, score, judge_count |
| `game_rounds` | Round-level tracking | id, session_id, round_number, judge_id, sentence_template, status |
| `cards` | Card library | id, text, type (noun/sentence), blank_count, pack |
| `player_selections` | Individual card choices | id, round_id, player_id, blank_number, card_id |
| `round_results` | Scoring outcomes | id, round_id, winner_id, judge_id, points_awarded |
| `generated_images` | Image generation cache | id, round_id, prompt, image_url, provider (DALL-E/Stability/etc) |

**Relationships:**
- `users` ←→ `game_sessions` (1:N) — Host creates sessions
- `players` ←→ `game_participants` ←→ `game_sessions` (M:N join) — Players join sessions
- `game_sessions` ←→ `game_rounds` (1:N) — Sessions have rounds
- `cards` ←→ `player_selections` (1:N) — Cards selected in rounds
- `game_rounds` ←→ `round_results` (1:N) — Rounds produce results
- `game_rounds` ←→ `generated_images` (1:N) — Rounds generate images

### Activity Polling (Keep-Alive Mechanism)

**Purpose:** Prevent serverless/cheap hosting platforms (Render, Railway, etc.) from auto-sleeping after 15 minutes of inactivity.

**Implementation:**
- Host dashboard sends lightweight HTTP request every 5 minutes
- Request hits simple endpoint: `GET /api/health` or `POST /api/keep-alive`
- Response: `{ status: "ok", timestamp }` (lightweight, <1KB)
- Host page polls silently in background (no user interruption)
- Keeps backend service active indefinitely

**Technical Details:**
- Polling interval: 5 minutes (refresh before 15-min timeout)
- Only active when host page is open (not draining battery)
- Endpoint lightweight (no game state changes, just a ping)
- Can coexist with WebSocket (polling as backup)

**Benefit:**
- Enables deployment on free/cheap hosting tiers without spin-down issues
- Zero user-facing impact
- Simple fallback mechanism

---

## 8. Game Summary

| Aspect | Details |
|--------|---------|
| **Players** | 2-20+ (design sweet spot: 4-8) |
| **Round Duration** | 2-3 minutes |
| **Session Length** | 20-40 minutes |
| **Key Innovation** | AI-generated images as punchlines (vs. card art) |
| **Core Loop** | Choose Sentence → Select cards → Generate image → Judge → Award → Next |

---

## Next Steps

- [ ] Expand on specific sections (detailed UI wireframes)
- [ ] Build technical foundation (backend game server)
- [ ] Design the card database and create initial card packs
- [ ] Plan the frontend architecture for mobile + host display
