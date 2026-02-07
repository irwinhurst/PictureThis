# Picture This - API Endpoints & Data Schema

## REST API Endpoints

Base URL: `{host}/api`

### **Game Management**

#### **POST** `/games`
Create a new game
```json
{
  "host_name": "string",
  "max_rounds": "integer (10-15)"
}
```
**Response (201)**:
```json
{
  "game_id": "uuid",
  "game_code": "string (6 chars, e.g., 'AB12CD')",
  "host_player_id": "uuid",
  "status": "LOBBY_WAITING",
  "created_at": "iso8601"
}
```

---

#### **GET** `/games/{game_code}`
Get current game state
**Response (200)**:
```json
{
  "game_id": "uuid",
  "game_code": "string",
  "status": "string (current state)",
  "round_number": "integer",
  "max_rounds": "integer",
  "players": [
    {
      "player_id": "uuid",
      "name": "string",
      "avatar": "string (emoji or color)",
      "score": "integer",
      "is_judge": "boolean",
      "is_connected": "boolean"
    }
  ],
  "current_sentence": "string or null",
  "leaderboard": [
    {
      "rank": "integer",
      "player_name": "string",
      "score": "integer"
    }
  ]
}
```

---

#### **POST** `/games/{game_code}/start`
Host starts the game
```json
{
  "max_rounds": "integer"
}
```
**Response (200)**:
```json
{
  "status": "ROUND_INITIALIZATION",
  "message": "Game started"
}
```

---

#### **POST** `/games/{game_code}/end`
Host ends game early
**Response (200)**:
```json
{
  "status": "GAME_OVER",
  "final_leaderboard": [...]
}
```

---

### **Player Management**

#### **POST** `/games/{game_code}/players`
Player joins game
```json
{
  "player_name": "string",
  "avatar": "string (emoji or color code)"
}
```
**Response (201)**:
```json
{
  "player_id": "uuid",
  "game_code": "string",
  "status": "joined",
  "session_token": "jwt (for future requests)"
}
```

---

#### **POST** `/games/{game_code}/players/{player_id}/disconnect`
Player leaves or connection lost
**Response (200)**:
```json
{
  "status": "disconnected",
  "message": "Player marked as disconnected"
}
```

---

#### **GET** `/games/{game_code}/players/{player_id}/hand`
Get current card hand
**Response (200)**:
```json
{
  "hand": [
    {
      "card_id": "uuid",
      "text": "string",
      "category": "noun|verb|adjective"
    },
    ...
  ],
  "hand_size": "integer"
}
```

---

### **Card Selection (Round Play)**

#### **POST** `/games/{game_code}/sentence-card`
Judge selects/creates sentence card
```json
{
  "sentence_id": "uuid or null",
  "sentence_text": "string (with _____ for blanks)",
  "player_id": "uuid (judge)"
}
```
**Response (200)**:
```json
{
  "status": "SELECTION_PHASE",
  "sentence": "I saw a _____ trying to _____ while wearing _____",
  "timer_seconds": 45
}
```

---

#### **POST** `/games/{game_code}/submissions`
Player submits card selections for blanks
```json
{
  "player_id": "uuid",
  "card_selections": ["card_id_1", "card_id_2", "card_id_3"],
  "timestamp": "iso8601"
}
```
**Response (200)**:
```json
{
  "status": "submitted",
  "message": "Cards submitted"
}
```

---

### **Image Generation & Judging**

#### **GET** `/games/{game_code}/images`
Get all generated images for current round (called after IMAGE_GENERATION phase)
**Response (200)**:
```json
{
  "images": [
    {
      "image_id": "uuid",
      "player_id": "uuid",
      "player_name": "string",
      "image_url": "string (https://...)",
      "completed_sentence": "string",
      "art_style": "string (realistic|cartoon|cinematic|whimsical)"
    },
    ...
  ],
  "status": "JUDGING_PHASE"
}
```

---

#### **POST** `/games/{game_code}/judge-pick`
Judge selects winning image
```json
{
  "judge_id": "uuid",
  "winning_image_id": "uuid"
}
```
**Response (200)**:
```json
{
  "status": "RESULTS_DISPLAY",
  "winning_player_id": "uuid",
  "winning_player_name": "string",
  "points_awarded": "integer",
  "next_round": "boolean or null"
}
```

---

### **Scoring & Leaderboard**

#### **GET** `/games/{game_code}/leaderboard`
Get current standings
**Response (200)**:
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "player_id": "uuid",
      "player_name": "string",
      "score": "integer",
      "wins": "integer"
    },
    ...
  ]
}
```

---

### **WebSocket Events (Real-Time Updates)**

Instead of polling, use WebSocket for live updates:

```
ws://{host}/games/{game_code}/{player_id}
```

**Server sends events:**

| Event | Payload | Trigger |
|-------|---------|---------|
| `game.state_changed` | `{ status, round_number }` | State transition |
| `round.started` | `{ round_number, judge_name, sentence }` | Round initialized |
| `submissions.update` | `{ submitted_count, total_players }` | Player submits cards |
| `images.ready` | `{ image_count: 4 }` | All images generated |
| `judging.complete` | `{ winner_name, points }` | Judge picks winner |
| `player.joined` | `{ player_name, count }` | New player joins |
| `player.disconnected` | `{ player_name }` | Player leaves |
| `game.ended` | `{ final_leaderboard }` | Game over |

---

## Data Schema

### **Games Table**
```sql
CREATE TABLE games (
  game_id UUID PRIMARY KEY,
  game_code VARCHAR(6) UNIQUE NOT NULL,
  host_player_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  max_rounds INTEGER NOT NULL,
  current_round INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (host_player_id) REFERENCES players(player_id)
);
```

---

### **Players Table**
```sql
CREATE TABLE players (
  player_id UUID PRIMARY KEY,
  game_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  avatar VARCHAR(100),
  score INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  is_connected BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP NULL,
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);
```

---

### **Rounds Table**
```sql
CREATE TABLE rounds (
  round_id UUID PRIMARY KEY,
  game_id UUID NOT NULL,
  round_number INTEGER NOT NULL,
  judge_id UUID NOT NULL,
  sentence_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  winner_player_id UUID NULL,
  points_awarded INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
  FOREIGN KEY (judge_id) REFERENCES players(player_id),
  FOREIGN KEY (winner_player_id) REFERENCES players(player_id)
);
```

---

### **Cards Table**
```sql
CREATE TABLE cards (
  card_id UUID PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- 'noun', 'verb', 'adjective'
  pack VARCHAR(50), -- 'base_game', 'expansion1', etc.
  difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### **Player Hands Table** (Current cards in player's hand)
```sql
CREATE TABLE player_hands (
  player_id UUID NOT NULL,
  card_id UUID NOT NULL,
  game_id UUID NOT NULL,
  drawn_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (player_id, card_id, game_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id),
  FOREIGN KEY (card_id) REFERENCES cards(card_id),
  FOREIGN KEY (game_id) REFERENCES games(game_id)
);
```

---

### **Submissions Table** (Card selections per round)
```sql
CREATE TABLE submissions (
  submission_id UUID PRIMARY KEY,
  round_id UUID NOT NULL,
  player_id UUID NOT NULL,
  card_id_1 UUID NOT NULL,
  card_id_2 UUID NOT NULL,
  card_id_3 UUID NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (round_id) REFERENCES rounds(round_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id),
  FOREIGN KEY (card_id_1) REFERENCES cards(card_id),
  FOREIGN KEY (card_id_2) REFERENCES cards(card_id),
  FOREIGN KEY (card_id_3) REFERENCES cards(card_id)
);
```

---

### **Generated Images Table**
```sql
CREATE TABLE generated_images (
  image_id UUID PRIMARY KEY,
  round_id UUID NOT NULL,
  player_id UUID NOT NULL,
  submission_id UUID NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  completed_sentence TEXT NOT NULL,
  art_style VARCHAR(50), -- 'realistic', 'cartoon', 'cinematic', 'whimsical'
  ai_service VARCHAR(50), -- 'dalle', 'stability', 'midjourney'
  generated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (round_id) REFERENCES rounds(round_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id),
  FOREIGN KEY (submission_id) REFERENCES submissions(submission_id)
);
```

---

### **Sentence Cards Table** (Templates judges can choose from)
```sql
CREATE TABLE sentence_cards (
  sentence_id UUID PRIMARY KEY,
  text TEXT NOT NULL,
  blank_count INTEGER DEFAULT 3,
  pack VARCHAR(50), -- 'base_game', etc.
  difficulty VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### **Player Sentence Hands Table** (Sentence cards in judge's hand)
```sql
CREATE TABLE player_sentence_hands (
  player_id UUID NOT NULL,
  sentence_id UUID NOT NULL,
  game_id UUID NOT NULL,
  drawn_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (player_id, sentence_id, game_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id),
  FOREIGN KEY (sentence_id) REFERENCES sentence_cards(sentence_id),
  FOREIGN KEY (game_id) REFERENCES games(game_id)
);
```

---

## Query Examples

### Get all players in game (leaderboard)
```sql
SELECT player_id, name, score, wins
FROM players
WHERE game_id = $1
ORDER BY score DESC;
```

### Get current round status
```sql
SELECT r.round_number, r.judge_id, p.name as judge_name,
       s.text as sentence, r.status
FROM rounds r
JOIN players p ON r.judge_id = p.player_id
JOIN sentence_cards s ON r.sentence_id = s.sentence_id
WHERE r.game_id = $1 AND r.round_number =
      (SELECT MAX(round_number) FROM rounds WHERE game_id = $1);
```

### Get all submissions for a round
```sql
SELECT p.name, sub.card_id_1, sub.card_id_2, sub.card_id_3
FROM submissions sub
JOIN players p ON sub.player_id = p.player_id
WHERE sub.round_id = $1;
```

