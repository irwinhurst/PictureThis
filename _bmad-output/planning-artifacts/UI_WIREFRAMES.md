# Picture This - UI Wireframes

## Device Types

- **Host Display** (TV/Monitor, desktop browser): Main game state, all players see it
- **Player Mobile** (Phone/Tablet): Individual player controls and card hand
- **Judge Mobile**: Same as player, but switches to judging view when judging

---

## HOST DISPLAY WIREFRAMES

### **1. Lobby Screen**
```
┌────────────────────────────────────┐
│  PICTURE THIS                      │
├────────────────────────────────────┤
│                                    │
│  Game Code: AB12CD                 │
│  Players:  4/8                     │
│                                    │
│  [Avatar] Player 1      [Avatar] █  │
│  [Avatar] Player 2      [Avatar] O  │
│  [Avatar] Player 3                 │
│  [Avatar] Player 4                 │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Max Rounds: [  10 rounds ]  │  │
│  │         [Dropdown]           │  │
│  └──────────────────────────────┘  │
│                                    │
│          [ START GAME ]            │
│                                    │
└────────────────────────────────────┘
```

**Key Elements:**
- Game code (big, easy to read on TV)
- Player count
- Player list with avatars (update in real-time as players join)
- Rounds selector dropdown
- Start button (disabled until min 2 players)

---

### **2. Round Intro Screen**
```
┌────────────────────────────────────┐
│       ROUND 3 OF 10                │
├────────────────────────────────────┤
│                                    │
│         [Avatar] Sarah             │
│         is the JUDGE               │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  I SAW A _____               │  │
│  │  TRYING TO _____             │  │
│  │  WHILE WEARING _____         │  │
│  └──────────────────────────────┘  │
│                                    │
│    WAITING FOR PLAYERS TO JOIN     │
│                                    │
│          LEADERBOARD               │
│    1. Alex     45 pts              │
│    2. Sarah    40 pts              │
│    3. Jordan   35 pts              │
│    4. Maya     30 pts              │
│                                    │
└────────────────────────────────────┘
```

**Key Elements:**
- Judge name/avatar
- Sentence template with _____ blanks (visible)
- Leaderboard in corner
- No card hands shown (privacy)

---

### **3. Selection Timer Screen**
```
┌────────────────────────────────────┐
│  PLAYERS ARE SUBMITTING...         │
├────────────────────────────────────┤
│                                    │
│        3 of 4 players ready        │
│                                    │
│   ████████░░░░░░░░░░░░░░ 18 sec   │
│                                    │
│        [Spinner animation]         │
│                                    │
│          LEADERBOARD               │
│    1. Alex     45 pts              │
│    2. Sarah    40 pts              │
│    3. Jordan   35 pts              │
│    4. Maya     30 pts              │
│                                    │
└────────────────────────────────────┘
```

**Key Elements:**
- Submission progress (X of Y)
- Countdown timer (visual bar + seconds)
- Animated spinner
- Leaderboard continues

---

### **4. Image Generation Screen**
```
┌────────────────────────────────────┐
│    CREATING IMAGES...              │
├────────────────────────────────────┤
│                                    │
│        [Loading spinner]           │
│                                    │
│   Generating witty illustrations   │
│                                    │
│   Generated: 2 of 4 images         │
│                                    │
│        [ animated wait ]           │
│                                    │
│          LEADERBOARD               │
│    1. Alex     45 pts              │
│    2. Sarah    40 pts              │
│    3. Jordan   35 pts              │
│    4. Maya     30 pts              │
│                                    │
└────────────────────────────────────┘
```

**Key Elements:**
- Loading animation
- Progress counter (X of Y images)
- Calming message
- Leaderboard visible

---

### **5. Judging Display Screen**
```
┌────────────────────────────────────┐
│       WHAT'S THE FUNNIEST?         │
├────────────────────────────────────┤
│                                    │
│  [Large Image 1]  [Large Image 2]  │
│                                    │
│  [Large Image 3]  [Large Image 4]  │
│                                    │
│     Judge: [Avatar] Sarah          │
│     is choosing...                 │
│                                    │
│     Tap on TV or click mobile      │
├────────────────────────────────────┤
│              LEADERBOARD           │
│    1. Alex     45 pts              │
│    2. Sarah    40 pts              │
│    3. Jordan   35 pts              │
│    4. Maya     30 pts              │
└────────────────────────────────────┘
```

**Key Elements:**
- All images displayed prominently (square grid or carousel)
- Judge indicator visible
- Judge makes choice via mobile or TV tap
- Images are large, visible from across room
- Leaderboard in small size below

---

### **6. Results Screen**
```
┌────────────────────────────────────┐
│      🎉 ROUND WINNER! 🎉           │
├────────────────────────────────────┤
│                                    │
│   [Winning Image - HIGHLIGHTED]    │
│                                    │
│        [Avatar] Jordan's cards:    │
│   "elephant" + "juggling" + "hat"  │
│                                    │
│      EARNED 5 POINTS!              │
│         [Confetti animation]       │
│                                    │
│   NEXT JUDGE: [Avatar] Maya        │
│                                    │
│          UPDATED LEADERBOARD       │
│    1. Jordan   40 pts ⬆️            │
│    2. Alex     45 pts              │
│    3. Sarah    40 pts              │
│    4. Maya     30 pts              │
│                                    │
│      (Auto-continues in 5s...)     │
│                                    │
└────────────────────────────────────┘
```

**Key Elements:**
- Large highlighted winning image
- Card combo that won
- Points awarded with animation
- Next judge highlighted
- Updated leaderboard
- Auto-transition to next round (or display final leaderboard if done)

---

### **7. Final Leaderboard Screen**
```
┌────────────────────────────────────┐
│        GAME OVER!                  │
│        All 10 Rounds Complete      │
├────────────────────────────────────┤
│                                    │
│       🏆 FINAL STANDINGS 🏆        │
│                                    │
│   1. Alex      92 pts  👑          │
│   2. Jordan    87 pts  🥈          │
│   3. Sarah     75 pts  🥉          │
│   4. Maya      68 pts             │
│                                    │
│   ⭐ FUNNIEST JUDGE: Sarah        │
│                                    │
│        [ PLAY AGAIN? ]             │
│        [ EXIT GAME ]               │
│                                    │
│                                    │
└────────────────────────────────────┘
```

**Key Elements:**
- Final ranked leaderboard
- Medals/trophies for top 3
- Special award (Funniest Judge)
- Action buttons (Play Again, Exit)

---

## PLAYER MOBILE WIREFRAMES

### **1. Join Screen**
```
┌──────────────────────┐
│  PICTURE THIS        │
├──────────────────────┤
│                      │
│  GAME CODE:          │
│  ┌──────────────────┐│
│  │  [  AB12CD  ]    ││
│  │                  ││
│  │  [Paste or type] ││
│  └──────────────────┘│
│                      │
│  YOUR NAME:          │
│  ┌──────────────────┐│
│  │ [Type name...  ] ││
│  └──────────────────┘│
│                      │
│  AVATAR:             │
│  [😀] [😄] [😎]     │
│  [🤔] [😲] [🎉]     │
│                      │
│      [ JOIN GAME ]   │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Game code input (6 char)
- Name input
- Avatar picker (emoji grid)
- Join button

---

### **2. Waiting in Lobby Screen**
```
┌──────────────────────┐
│  PICTURE THIS        │
├──────────────────────┤
│                      │
│  ✓ Joined!           │
│                      │
│  [Game code]         │
│  AB12CD              │
│                      │
│  Players in game:    │
│  😀 Player 1         │
│  😄 Player 2         │
│  😎 Player 3         │
│  🤔 Player 4         │
│                      │
│  Waiting on TV...    │
│  Host will start     │
│  when ready          │
│                      │
│      [ LEAVE ]       │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Confirmation of join
- Game code
- Live player list
- Static waiting state
- Leave button

---

### **3. Round Waiting Screen (Before Selection)**
```
┌──────────────────────┐
│ ROUND 3 of 10        │
├──────────────────────┤
│                      │
│  🏷️  Judge:          │
│  [Avatar] Sarah      │
│                      │
│  Getting cards ready │
│                      │
│  [Animated pulse]    │
│                      │
│  YOUR SCORE: 35 pts  │
│                      │
│  STANDINGS:          │
│  1. Alex    45 pts   │
│  2. Sarah   40 pts   │
│  3. You     35 pts   │
│  4. Maya    30 pts   │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Round number
- Judge info
- Loading state
- Current score
- Mini leaderboard

---

### **4. Selection Phase Screen (Player)**
```
┌──────────────────────┐
│ SELECT YOUR CARDS    │
│ Time: ⏱️  30s        │
├──────────────────────┤
│ I SAW A _____        │
│ TRYING TO _____      │
│ WHILE WEARING _____  │
├──────────────────────┤
│ BLANK 1: [  ?  ]     │
│ ┌─────────────────┐  │
│ │ elephant    ✓   │  │
│ │ rubber duck     │  │
│ │ my uncle        │  │
│ │ DJ losing music │  │
│ └─────────────────┘  │
│ BLANK 2: [  ?  ]     │
│ ┌─────────────────┐  │
│ │ juggling    ✓   │  │
│ │ arguing         │  │
│ │ photobombing    │  │
│ │ fix it quietly   │  │
│ └─────────────────┘  │
│ BLANK 3: [ ? ]       │
│ ┌─────────────────┐  │
│ │ sparkly     ✓   │  │
│ │ ancient         │  │
│ │ confused        │  │
│ │ a hat           │  │
│ └─────────────────┘  │
│                      │
│    [ SUBMIT ]        │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Countdown timer (visual + seconds)
- Sentence template above
- Dropdown/selector for each blank
- Submit button (disabled until all blanks filled)
- Cards chosen display with ✓

---

### **5. Waiting for Judging Screen (Player)**
```
┌──────────────────────┐
│  WAITING...          │
├──────────────────────┤
│                      │
│  Cards submitted!    │
│  ✓ Your choices:     │
│    "elephant"        │
│    "juggling"        │
│    "sparkly"         │
│                      │
│  AI creating images  │
│  [Spinner...]        │
│                      │
│  Judge will pick     │
│  the funniest...     │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Confirmation of submission
- Cards shown
- Loading state
- Message about judge picking

---

### **6. Judge's Judging Screen**
```
┌──────────────────────┐
│  YOU'RE JUDGING!     │
│  Pick the funniest   │
├──────────────────────┤
│                      │
│  [Large Image]       │
│  Tap the image you   │
│  think is funniest   │
│                      │
│  < Player 1 >  [✓]   │ ← Swipe or buttons
│                      │
│          [ PICK ]    │
│                      │
│  Other options:      │
│  > Player 2          │
│  > Player 3          │
│  > Player 4          │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Large image display (carousel)
- Navigation (swipe or buttons)
- Pick button (confirms selection)
- Player identifiers (generic, no name reveal until results)

---

### **7. Results Screen (Player)**
```
┌──────────────────────┐
│  🎉 YOU WON! 🎉     │
├──────────────────────┤
│                      │
│  Judge picked:       │
│  "elephant" +        │
│  "juggling" +        │
│  "sparkly"           │
│                      │
│      +5 POINTS       │
│                      │
│  Your score: 40 pts  │
│                      │
│  NEXT JUDGE:         │
│  [Avatar] Maya       │
│                      │
│  (Next round in 5s)  │
│                      │
└──────────────────────┘
```

OR if they lost:

```
┌──────────────────────┐
│   JUDGE PICKED...    │
├──────────────────────┤
│                      │
│  [Avatar] Player 2   │
│  WINS THIS ROUND!    │
│                      │
│  Their cards:        │
│  "rubber duck" +     │
│  "fix it" + "ancient"│
│                      │
│  Your score: 40 pts  │
│                      │
│  STANDIGNS:          │
│  1. Player 2  45 pts │
│  2. You      40 pts  │
│                      │
│  (Next round in 5s)  │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Clear win/loss message
- Winning card combo shown
- Points (if won)
- Updated score
- Next judge
- Auto-continues

---

### **8. Final Leaderboard Screen (Player)**
```
┌──────────────────────┐
│   GAME OVER!         │
├──────────────────────┤
│                      │
│  🏆 YOU WON! 🏆     │
│                      │
│  FINAL STANDINGS:    │
│                      │
│  1. You       92 pts │
│  2. Player 2  87 pts │
│  3. Player 3  75 pts │
│  4. Player 4  68 pts │
│                      │
│  ⭐ FUNNIEST JUDGE   │
│  Player 3!           │
│                      │
│   [ PLAY AGAIN ]     │
│   [ EXIT GAME ]      │
│                      │
└──────────────────────┘
```

**Key Elements:**
- Final ranking
- Player's final score highlighted
- Funniest Judge award
- Action buttons

---

## Design Notes

1. **Colors**: Use bright, party-friendly colors. Suggest: Primary color #FF6B6B (red), accent #4ECDC4 (teal)
2. **Typography**: Large, readable fonts for TV display (min 24pt on host, 16pt on mobile)
3. **Animations**:
   - Countdown timer: Smooth bar shrink
   - Image reveal: Fade-in over 2-3 seconds
   - Winner announcement: Confetti or celebration animation
   - Score updates: Pop/bounce effect
4. **Accessibility**: High contrast, clear labels, large touch targets on mobile
5. **Responsive Design**: Host display scales to any TV size, mobile adapts to portrait/landscape

