# Picture This - State Diagram

## Game State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                      GAME STATES                            │
└─────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │   START      │
                         └──────┬───────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   LOBBY WAITING        │
                    │ (waiting for players)  │
                    └───────┬───────┬────────┘
                            │       │
                    host OK │       │ player joins/leaves
                            │       │
                            ▼       ▼
                    ┌──────────────────────┐
                    │  ROUND INITIALIZATION │  ◄─────┐
                    │ (select judge,       │         │
                    │  assign sentence)    │         │
                    └───────┬──────────────┘         │
                            │                       │
                            ▼                       │
                    ┌──────────────────────┐         │
                    │  SELECTION PHASE     │         │
                    │ (players pick cards  │         │
                    │  for blanks, 30-45s) │         │
                    └───────┬──────────────┘         │
                            │                       │
                            ▼                       │
                    ┌──────────────────────┐         │
                    │  IMAGE GENERATION    │         │
                    │ (AI creates images,  │         │
                    │  wait for completion)│         │
                    └───────┬──────────────┘         │
                            │                       │
                            ▼                       │
                    ┌──────────────────────┐         │
                    │  JUDGING PHASE       │         │
                    │ (judge picks winner, │         │
                    │  no time limit)      │         │
                    └───────┬──────────────┘         │
                            │                       │
                            ▼                       │
                    ┌──────────────────────┐         │
                    │  RESULTS DISPLAY     │         │
                    │ (show winner,        │         │
                    │  award points, 3-5s) │         │
                    └───────┬──────────────┘         │
                            │                       │
                ┌───────────┴────────────┐           │
                │                        │           │
            all rounds   more rounds     │ keep playing
              complete      remain       │
                │                        └───────────┘
                ▼
        ┌──────────────────┐
        │  GAME OVER       │
        │  (final leaderboard)
        └──────┬───────────┘
               │
               ▼
        ┌──────────────────┐
        │   END            │
        └──────────────────┘
```

---

## Detailed State Definitions

### **LOBBY_WAITING**
- **Purpose**: Players join game, host configures
- **Entry**: Game created (choose rounds)
- **Exit**: Host clicks "Start Game"
- **Data**:
  - Game code
  - Player list (joining in real-time)
  - Round count (set by host before start)
- **Host Display**: Player list with avatars, start button
- **Player Display**: "Game starting..." or "Waiting for host"

---

### **ROUND_INITIALIZATION**
- **Purpose**: Set up for new round
- **Entry**: Game started OR previous round complete
- **Exit**: Selection phase timer begins
- **Actions**:
  1. Randomly select a new Judge (rotate, no repeats in 1 round)
  2. Judge draws/selects a sentence card from their hand
  3. Sentence displayed on TV with blanks
  4. All other players shown their card hands on mobile
- **Data**:
  - Current round number
  - Current judge (player ID)
  - Current sentence (text with _____ blanks)
- **Duration**: ~2 seconds (transition screen)

---

### **SELECTION_PHASE**
- **Purpose**: Players fill in blanks
- **Entry**: Round initialized
- **Exit**: Timer expires (30-45 sec) OR all non-judge players submit
- **Actions**:
  1. Start countdown timer
  2. All non-judge players tap cards to fill blanks
  3. Players hit "Submit" button
  4. Submission locked when timer runs out
- **Data**:
  - Submissions: `{ player_id: [card_id_blank1, card_id_blank2, card_id_blank3] }`
  - Remaining submissions
- **Host Display**: "Waiting for players... X/Y submitted" + countdown
- **Judge Display**: "Judging next..." or spectate mode

---

### **IMAGE_GENERATION**
- **Purpose**: AI generates images from submissions
- **Entry**: Selection phase complete
- **Exit**: All images returned from AI service
- **Actions**:
  1. For each player submission:
     - Fill blanks: "I saw a {card1} trying to {card2} while wearing {card3}"
     - Send to AI image generator
  2. Store generated images
  3. Display loading state on TV
- **Data**:
  - Image URLs (cached)
  - Completed sentences (for reference)
- **Host Display**: "Creating images..." + animated loader
- **Duration**: 5-15 seconds (depends on AI API response)

---

### **JUDGING_PHASE**
- **Purpose**: Judge views images and picks winner
- **Entry**: All images generated
- **Exit**: Judge selects an image
- **Actions**:
  1. Display all player images (carousel or grid)
  2. Judge taps image to select
  3. Award points to winning player
- **Data**:
  - Selected image (player_id)
  - Points awarded
- **Host Display**: All images visible, judge indicator
- **Judge Device**: Larger image view, tap/click to select
- **Duration**: No timer (judge takes their time)

---

### **RESULTS_DISPLAY**
- **Purpose**: Show round results
- **Entry**: Judge selected image
- **Exit**: 3-5 seconds elapsed
- **Actions**:
  1. Highlight winning image
  2. Announce winner + points
  3. Update leaderboard
  4. Show next judge highlight
- **Data**:
  - Round winner
  - Points awarded
  - Current standings
- **Host Display**: "Player X wins! +5 pts!" + animation
- **Duration**: 3-5 seconds (auto-transition)

---

### **GAME_OVER**
- **Purpose**: Show final results
- **Entry**: All rounds complete
- **Exit**: Host closes game or players leave
- **Actions**:
  1. Display final leaderboard
  2. Show "Funniest Judge" if applicable
  3. Play Again
  4. Exit (to main menu)
- **Data**:
  - Final standings
  - Game stats (total rounds, images generated)
- **Host Display**: Full final leaderboard

---

## Player Connection States

Separate from game states—handles disconnections:

```
┌──────────────┐
│  CONNECTED   │
└────┬──────┬──────┐
     │      │      │
     ▼      ▼      ▼
  ACTIVE  IDLE  DISCONNECTED
```

- **ACTIVE**: Player actively playing
- **IDLE**: Connected but AFK (may auto-reconnect)
- **DISCONNECTED**: Lost connection (timer to rejoin, then remove from game)

---

## Edge Cases & Transitions

| Scenario | Current State | Action | New State |
|----------|---------------|--------|-----------|
| Player disconnects during selection | SELECTION_PHASE | Wait 10s for reconnect; if fails, treat as auto-submit | Image generation continues |
| Judge disconnects before judging | JUDGING_PHASE | Auto-pick random image OR skip round | Results display |
| Host closes browser | Any | Game paused (60s pause); auto-resume if host reconnects | Same state |
| Last player joins after rounds set | LOBBY_WAITING | Block start until player count stable? | TBD |

