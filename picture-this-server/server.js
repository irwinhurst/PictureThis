require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const path = require('path');

// Import game management modules
const GameManager = require('./src/game/GameManager');
const GameSessionManager = require('./src/game/GameSessionManager');
const { getPlayerBySocketId } = require('./src/game/GameState');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const auth = require('./auth');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] [${level}] ${message} ${metaStr}`;
        })
      )
    })
  ]
});

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('SESSION_SECRET must be set in production');
    process.exit(1);
  }
  logger.warn('WARNING: SESSION_SECRET not set. Using default for development only.');
}

app.use(session({
  secret: sessionSecret || 'default-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth
auth.configureGoogleStrategy();

// Initialize Game Manager (Story 1.2)
const gameManager = new GameManager(logger, io);

// Initialize Game Session Manager (Story 1.4)
const sessionManager = new GameSessionManager({
  timeoutMinutes: parseInt(process.env.GAME_SESSION_TIMEOUT_MINUTES) || 60,
  checkIntervalSeconds: 300 // Check every 5 minutes
});

// Log session events
sessionManager.on('onSessionCreated', (gameId, code) => {
  logger.info('Session created', { gameId, code });
});

sessionManager.on('onSessionEnded', (code) => {
  logger.info('Session ended', { code });
});

sessionManager.on('onSessionTimedOut', (code) => {
  logger.warn('Session timed out', { code });
});

sessionManager.on('onPlayerJoined', (code, playerId, playerCount) => {
  logger.debug('Player joined session', { code, playerId, playerCount });
});

sessionManager.on('onHostDisconnected', (code) => {
  logger.warn('Host disconnected from session', { code });
});

// Track connected clients and their game associations
const connectedClients = new Map(); // socketId -> { gameId, playerId }

// Legacy placeholder for backward compatibility
let gameState = {
  round: 0,
  phase: 'waiting',
  timer: 0,
  leaderboard: [],
  players: [],
  timestamp: Date.now()
};

// Message type constants
const MESSAGE_TYPES = {
  STATE_UPDATE: 'state_update',
  PHASE_CHANGE: 'phase_change',
  ERROR: 'error',
  CONNECTED: 'connected',
  PLAYER_JOINED: 'player-joined'
};

// Helper function to create structured message
function createMessage(type, data) {
  return {
    type,
    data,
    timestamp: Date.now(),
    version: '1.0'
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  logger.info('Health check requested');
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    activeGames: gameManager.getGameCount(),
    activeSessions: sessionManager.getAllActiveSessions().length
  });
});

// Session Management Endpoints (Story 1.4)

// Create a new game session
app.post('/api/session/create', auth.requireAuth, (req, res) => {
  try {
    const { maxRounds, maxPlayers } = req.body;
    const hostId = req.user.id;
    
    const session = sessionManager.createSession(
      hostId,
      maxRounds || 5,
      maxPlayers || 8
    );
    
    logger.info('Session created via API', { 
      sessionCode: session.code, 
      hostId,
      gameId: session.gameId 
    });
    
    res.json({
      success: true,
      gameId: session.gameId,
      code: session.code,
      status: session.status
    });
  } catch (error) {
    logger.error('Error creating session', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session info by code
app.get('/api/session/:code', (req, res) => {
  try {
    const { code } = req.params;
    const session = sessionManager.getSessionByCode(code);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code
      });
    }
    
    res.json({
      gameId: session.gameId,
      code: session.code,
      hostId: session.hostId,
      currentPhase: session.currentPhase,
      currentRound: session.currentRound,
      maxRounds: session.maxRounds,
      status: session.status,
      playerCount: session.players.length,
      maxPlayers: session.maxPlayers,
      players: session.players
    });
  } catch (error) {
    logger.error('Error getting session', { error: error.message });
    res.status(500).json({
      error: error.message
    });
  }
});

// Join a session
app.post('/api/session/:code/join', (req, res) => {
  try {
    const { code } = req.params;
    const { playerId, name, avatar } = req.body;
    
    if (!playerId || !name) {
      return res.status(400).json({
        error: 'playerId and name are required'
      });
    }
    
    const session = sessionManager.joinSession(code, {
      playerId,
      name,
      avatar: avatar || '🎮'
    });
    
    logger.info('Player joined session', { 
      code, 
      playerId, 
      playerCount: session.players.length 
    });
    
    res.json({
      success: true,
      gameId: session.gameId,
      code: session.code,
      playerCount: session.players.length,
      maxPlayers: session.maxPlayers
    });
  } catch (error) {
    logger.error('Error joining session', { error: error.message });
    res.status(400).json({
      error: error.message
    });
  }
});

// Get session statistics
app.get('/api/session/stats/all', (req, res) => {
  try {
    const stats = sessionManager.getStatistics();
    
    res.json({
      sessions: stats.totalActiveSessions,
      lobbyCount: stats.lobbyCount,
      inProgressCount: stats.inProgressCount,
      totalPlayers: stats.totalPlayers,
      activeCodes: stats.activeCodes
    });
  } catch (error) {
    logger.error('Error getting session stats', { error: error.message });
    res.status(500).json({
      error: error.message
    });
  }
});

// Debug endpoint for session state (Story 1.4)
app.get('/api/debug/session/:code', (req, res) => {
  const { code } = req.params;
  const session = sessionManager.getSessionByCode(code);
  
  if (!session) {
    return res.status(404).json({
      error: 'Session not found',
      code
    });
  }
  
  res.json({
    session,
    timestamp: Date.now()
  });
});
app.get('/api/debug/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  const state = gameManager.exportGameState(gameId);
  
  if (!state) {
    return res.status(404).json({
      error: 'Game not found',
      gameId
    });
  }
  
  res.json({
    gameState: state,
    timerInfo: gameManager.timerManager.getTimerInfo(gameId),
    timestamp: Date.now()
  });
});

// Create game endpoint (Story 1.6: Host Create Game Session)
app.post('/api/game/create-session', auth.requireAuth, (req, res) => {
  try {
    const { maxRounds, maxPlayers } = req.body;
    const hostId = req.user.id;
    
    // Validation
    const maxPlayersVal = parseInt(maxPlayers) || 8;
    const maxRoundsVal = parseInt(maxRounds) || 10;
    
    if (maxPlayersVal < 2 || maxPlayersVal > 20) {
      return res.status(400).json({
        success: false,
        error: 'Max players must be between 2 and 20'
      });
    }
    
    if (maxRoundsVal < 1 || maxRoundsVal > 20) {
      return res.status(400).json({
        success: false,
        error: 'Max rounds must be between 1 and 20'
      });
    }
    
    // Create session with GameSessionManager
    const session = sessionManager.createSession(hostId, maxRoundsVal, maxPlayersVal);
    
    logger.info('Game session created', { 
      code: session.code,
      gameId: session.gameId,
      hostId,
      maxPlayers: maxPlayersVal,
      maxRounds: maxRoundsVal
    });
    
    res.json({
      success: true,
      gameId: session.gameId,
      code: session.code,
      hostId: session.hostId,
      maxPlayers: maxPlayersVal,
      maxRounds: maxRoundsVal,
      status: session.status,
      createdAt: session.createdAt,
      settings: {
        maxPlayers: maxPlayersVal,
        maxRounds: maxRoundsVal
      }
    });
  } catch (error) {
    logger.error('Error creating game session', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Story 3.0: Start Game - transition from lobby to round 1
app.post('/api/game/:code/start', auth.requireAuth, (req, res) => {
  try {
    const { code } = req.params;
    const hostId = req.user.id;

    // Get the session
    const session = sessionManager.getSessionByCode(code);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Game session not found'
      });
    }

    // Verify the requester is the host
    if (session.hostId !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Only the host can start the game'
      });
    }

    // Validate at least 2 players
    if (!session.players || session.players.length < 2) {
      return res.status(400).json({
        success: false,
        error: `Not enough players to start game (need 2, have ${session.players.length})`
      });
    }

    // Default sentence templates (Story 1.3 would load from database)
    const sentenceTemplates = [
      'I SAW A _____ TRYING TO _____',
      'THE _____ WAS _____ AND _____',
      'MY FRIEND _____ LOVES _____',
      'IN THE _____, THERE WAS A _____',
      'THE BEST _____ I EVER SAW WAS _____',
      'A _____ IS NOT A _____',
      'IF I HAD A _____, I WOULD _____'
    ];

    // Start the game
    const updatedSession = sessionManager.startGame(code, sentenceTemplates);

    // Find the judge player info
    const judge = updatedSession.players.find(p => p.playerId === updatedSession.judgeId);

    logger.info('Game started', {
      code,
      gameId: updatedSession.gameId,
      hostId,
      players: updatedSession.players.length,
      judge: judge?.name,
      sentence: updatedSession.sentenceTemplate
    });

    // Broadcast game-started event to all connected players via WebSocket using code-based room
    io.to(`game-${code}`).emit('game-started', {
      gameId: updatedSession.gameId,
      code: updatedSession.code,
      round: updatedSession.currentRound,
      judge: {
        id: judge.playerId,
        name: judge.name,
        avatar: judge.avatar
      },
      sentence: updatedSession.sentenceTemplate,
      time_remaining: 45,
      max_rounds: updatedSession.maxRounds,
      status: 'round_1_selection'
    });

    // Start countdown timer (emit every second)
    let timeRemaining = 45;
    const countdownInterval = setInterval(() => {
      timeRemaining--;
      if (timeRemaining <= 0) {
        clearInterval(countdownInterval);
        // Would auto-submit here in full implementation
      } else {
        io.to(`game-${code}`).emit('timer-update', {
          time_remaining: timeRemaining
        });
      }
    }, 1000);

    // Return response to host
    res.json({
      success: true,
      gameId: updatedSession.gameId,
      code: updatedSession.code,
      round: updatedSession.currentRound,
      judge: {
        id: judge.playerId,
        name: judge.name,
        avatar: judge.avatar
      },
      sentence: updatedSession.sentenceTemplate,
      time_remaining: timeRemaining,
      max_rounds: updatedSession.maxRounds,
      status: 'round_1_selection'
    });
  } catch (error) {
    logger.error('Error starting game', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Story 3.2: Submit card selections - player selects cards for sentence blanks
app.post('/api/game/:code/submit-selection', auth.requireAuth, (req, res) => {
  try {
    const { code } = req.params;
    const { playerId, selections } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!playerId || !selections || typeof selections !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid playerId or selections'
      });
    }

    // Get the session
    const session = sessionManager.getSessionByCode(code);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Game session not found'
      });
    }

    // Validate game is in selection phase
    if (session.currentPhase !== 'round_1_selection' && session.currentPhase !== 'round_voting') {
      return res.status(400).json({
        success: false,
        error: `Game is not in selection phase (current: ${session.currentPhase})`
      });
    }

    // Record the player's selection
    const updatedSession = sessionManager.recordPlayerSelection(code, playerId, selections);

    // Calculate how many players have submitted
    const totalPlayers = updatedSession.players.filter(p => p.playerId !== updatedSession.judgeId).length;
    const submittedCount = Object.keys(updatedSession.playerSelections).length;

    logger.info('Player submitted card selection', {
      code,
      playerId,
      selections,
      submittedCount,
      totalPlayers
    });

    // Broadcast update to all players
    io.to(`game-${code}`).emit('selection-submitted', {
      playerId,
      submittedCount,
      totalPlayers
    });

    // Check if all non-judge players have submitted
    if (submittedCount === totalPlayers) {
      // All selections received, advance to next phase
      session.currentPhase = 'round_voting';
      session.lastActivityAt = Date.now();
      sessionManager.sessionMap.set(code, session);

      logger.info('All selections received, advancing to voting phase', {
        code,
        submittedCount
      });

      io.to(`game-${code}`).emit('selections-complete', {
        message: 'All players have submitted selections'
      });
    }

    res.json({
      success: true,
      gameId: updatedSession.gameId,
      code: updatedSession.code,
      playerId,
      submittedCount,
      totalPlayers,
      allSubmitted: submittedCount === totalPlayers
    });
  } catch (error) {
    logger.error('Error submitting player selection', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Legacy create game endpoint
app.post('/api/game/create', (req, res) => {
  try {
    const { maxRounds, maxPlayers, hostId } = req.body;
    const game = gameManager.createGame({
      maxRounds: maxRounds || 5,
      maxPlayers: maxPlayers || 8,
      hostId
    });
    
    logger.info('Game created via API', { gameId: game.gameId, code: game.code });
    
    res.json({
      success: true,
      gameId: game.gameId,
      code: game.code
    });
  } catch (error) {
    logger.error('Error creating game', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Keep-alive endpoint
app.post('/api/keep-alive', (req, res) => {
  logger.debug('Keep-alive ping received');
  res.json({
    status: 'ok',
    timestamp: Date.now()
  });
});

// Authentication routes

// Initiate Google OAuth login
app.get('/auth/google',
  passport.authenticate('google', { scope: ['openid', 'profile', 'email'] })
);

// Google OAuth callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failed' }),
  (req, res) => {
    // Generate JWT token
    const token = auth.generateToken(req.user);
    
    // Redirect to frontend with token
    // In a real app, this would redirect to the host dashboard
    res.redirect(`/login.html?token=${token}`);
  }
);

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      logger.error('Error during logout', { error: err.message });
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session', { error: err.message });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// Get current user profile (protected route)
app.get('/api/profile', auth.requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      profile_picture_url: req.user.profile_picture_url
    }
  });
});

// Login failed page
app.get('/login-failed', (req, res) => {
  res.status(401).json({
    error: 'Authentication failed',
    message: 'Failed to authenticate with Google. Please try again.'
  });
});

// Protected game endpoints (placeholders for Story 1.6)

// Create game (requires authentication)
app.post('/api/games', auth.requireAuth, (req, res) => {
  logger.info('Create game requested', { userId: req.user.id });
  
  // Placeholder response - full implementation in Story 1.6
  res.status(501).json({
    message: 'Game creation endpoint - to be fully implemented in Story 1.6',
    user: req.user.name
  });
});

// Start game (requires authentication)
app.post('/api/games/:id/start', auth.requireAuth, (req, res) => {
  const gameId = req.params.id;
  logger.info('Start game requested', { userId: req.user.id, gameId });
  
  // Placeholder response - full implementation in Story 1.6
  res.status(501).json({
    message: 'Start game endpoint - to be fully implemented in Story 1.6',
    gameId,
    host: req.user.name
  });
});

// WebSocket connection handler
io.on('connection', (socket) => {
  const socketId = socket.id;
  
  logger.info(`Client connected: ${socketId}`);
  
  // Add to connected clients
  connectedClients.set(socketId, {
    id: socketId,
    connectedAt: Date.now(),
    socket: socket,
    gameId: null,
    playerId: null
  });
  
  // Send connected event to client
  socket.emit('connected', createMessage(MESSAGE_TYPES.CONNECTED, {
    socket_id: socketId,
    timestamp: Date.now()
  }));
  
  // Handle create-game event
  socket.on('create-game', (data) => {
    try {
      logger.info('Creating new game', { socketId, data });
      
      const game = gameManager.createGame({
        maxRounds: data.maxRounds || 5,
        maxPlayers: data.maxPlayers || 8,
        hostId: socketId
      });
      
      socket.emit('game-created', createMessage('game_created', {
        gameId: game.gameId,
        code: game.code
      }));
      
    } catch (error) {
      logger.error('Error creating game', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: 'Failed to create game',
        code: 'ERR_CREATE_GAME'
      }));
    }
  });
  
  // Handle join-game event (Story 1.2 - Updated)
  socket.on('join-game', (data) => {
    try {
      logger.info('Player joining game', { socketId, data });
      
      const { code, name, avatar } = data;
      
      // Find game by code
      let game = gameManager.getGameByCode(code);
      
      // If no game exists, create one for backward compatibility
      if (!game) {
        game = gameManager.createGame({ code });
        logger.info('Auto-created game for join', { code, gameId: game.gameId });
      }
      
      // Add player to game
      const newState = gameManager.addPlayerToGame(game.gameId, {
        socketId,
        name: name || 'Anonymous',
        avatar: avatar || '🎮',
        isHost: game.players.length === 0
      });
      
      // Store player's game association
      const player = newState.players[newState.players.length - 1];
      const clientInfo = connectedClients.get(socketId);
      if (clientInfo) {
        clientInfo.gameId = game.gameId;
        clientInfo.playerId = player.id;
        clientInfo.code = code;
      }
      
      // Join socket room using game CODE as room identifier  (not gameId)
      socket.join(`game-${code}`);
      
      // Send join confirmation to player
      socket.emit('game-joined', createMessage('game_joined', {
        gameId: game.gameId,
        playerId: player.id,
        code: game.code,
        player
      }));
      
      // Legacy support - update old gameState
      gameState.players.push({
        socketId,
        name: name || 'Anonymous',
        avatar: avatar || '🎮',
        code
      });
      
      // Broadcast player joined event to all in game
      io.to(`game-${code}`).emit('player-joined', createMessage(MESSAGE_TYPES.PLAYER_JOINED, {
        player,
        player_count: newState.players.length
      }));
    } catch (error) {
      logger.error('Error handling join-game', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: 'Failed to join game',
        code: 'ERR_001'
      }));
    }
  });

  // Handle watch-game event for host (just join the room, don't add as player)
  socket.on('watch-game', (data) => {
    try {
      const { code } = data;
      if (!code) {
        throw new Error('Game code is required');
      }

      logger.info('Host/watcher joining game room', { socketId, code });
      
      // Just join the code-based room to receive broadcasts
      socket.join(`game-${code}`);
      
      // Store code for future reference
      const clientInfo = connectedClients.get(socketId);
      if (clientInfo) {
        clientInfo.code = code;
      }

      logger.debug('Client joined game room', { socketId, room: `game-${code}` });
    } catch (error) {
      logger.error('Error handling watch-game', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: 'Failed to join game room',
        code: 'ERR_WATCH'
      }));
    }
  });
  
  // Handle start-game event (Story 1.2)
  socket.on('start-game', (data) => {
    try {
      const clientInfo = connectedClients.get(socketId);
      if (!clientInfo || !clientInfo.gameId) {
        throw new Error('Not in a game');
      }
      
      logger.info('Starting game', { socketId, gameId: clientInfo.gameId });
      
      const newState = gameManager.startGame(clientInfo.gameId);
      
      // Broadcast game started event using code-based room
      io.to(`game-${clientInfo.code}`).emit('game-started', createMessage('game_started', {
        round: newState.currentRound,
        phase: newState.currentPhase,
        judgeId: newState.judgeId,
        sentenceTemplate: newState.sentenceTemplate
      }));
      
    } catch (error) {
      logger.error('Error starting game', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: error.message,
        code: 'ERR_START_GAME'
      }));
    }
  });
  
  // Handle select-cards event (Story 1.2 - Updated)
  socket.on('select-cards', (data) => {
    try {
      const clientInfo = connectedClients.get(socketId);
      if (!clientInfo || !clientInfo.gameId || !clientInfo.playerId) {
        throw new Error('Not in a game');
      }
      
      logger.debug('Player selecting cards', { 
        socketId, 
        gameId: clientInfo.gameId,
        playerId: clientInfo.playerId,
        cards: data.cards 
      });
      
      const newState = gameManager.submitSelection(
        clientInfo.gameId,
        clientInfo.playerId,
        data.cards
      );
      
      // Confirmation sent to player
      socket.emit('selection-confirmed', createMessage('selection_confirmed', {
        success: true
      }));
      
    } catch (error) {
      logger.error('Error handling select-cards', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: error.message,
        code: 'ERR_002'
      }));
    }
  });
  
  // Handle judge-select event (Story 1.2 - Updated)
  socket.on('judge-select', (data) => {
    try {
      const clientInfo = connectedClients.get(socketId);
      if (!clientInfo || !clientInfo.gameId || !clientInfo.playerId) {
        throw new Error('Not in a game');
      }
      
      logger.debug('Judge selecting winner', { 
        socketId,
        gameId: clientInfo.gameId,
        selection: data 
      });
      
      const newState = gameManager.submitJudgeSelection(
        clientInfo.gameId,
        clientInfo.playerId,
        {
          firstPlace: data.firstPlace,
          secondPlace: data.secondPlace
        }
      );
      
      // Results will be broadcast automatically by orchestrator
      
    } catch (error) {
      logger.error('Error handling judge-select', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: error.message,
        code: 'ERR_003'
      }));
    }
  });
  
  // Handle disconnect (Story 1.2 - Updated)
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socketId}`, { reason });
    
    const clientInfo = connectedClients.get(socketId);
    
    // Remove player from their game if they were in one
    if (clientInfo && clientInfo.gameId && clientInfo.playerId) {
      try {
        gameManager.removePlayerFromGame(clientInfo.gameId, clientInfo.playerId);
        logger.info('Player removed from game on disconnect', {
          gameId: clientInfo.gameId,
          playerId: clientInfo.playerId
        });
      } catch (error) {
        logger.error('Error removing player on disconnect', { error: error.message });
      }
    }
    
    // Remove from connected clients
    connectedClients.delete(socketId);
    
    // Legacy support - remove from old gameState
    gameState.players = gameState.players.filter(p => p.socketId !== socketId);
  });
  
  // Catch-all error handler
  socket.on('error', (error) => {
    logger.error('Socket error', { socketId, error: error.message });
  });
});

// Broadcast game state to all connected clients (Story 1.2 - Enhanced)
// Broadcasts state for each active game to its participants
function broadcastGameState() {
  if (connectedClients.size === 0) {
    return; // No clients connected, skip broadcast
  }
  
  // Broadcast state for each active game
  const games = gameManager.getAllGames();
  for (const game of games) {
    const exportedState = gameManager.exportGameState(game.gameId);
    if (exportedState) {
      io.to(`game-${game.code}`).emit('state-update', createMessage(MESSAGE_TYPES.STATE_UPDATE, {
        game_state: exportedState
      }));
    }
  }
  
  // Legacy support - broadcast old gameState to all
  gameState.timestamp = Date.now();
  io.emit('state-update', createMessage(MESSAGE_TYPES.STATE_UPDATE, {
    game_state: gameState
  }));
  
  logger.debug(`State broadcast sent to ${connectedClients.size} clients, ${games.length} games`);
}

// Set up periodic state broadcast (1 second intervals - reduced from 100ms for performance)
// Note: Most updates happen via WebSocket events, this is just a fallback
const broadcastInterval = setInterval(broadcastGameState, 1000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Game server started on port ${PORT}`);
  logger.info(`WebSocket server ready`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Max concurrent players: ${process.env.MAX_CONCURRENT_PLAYERS}`);
});

// Graceful shutdown (Story 1.2 - Enhanced, Story 1.4)
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  clearInterval(broadcastInterval);
  gameManager.shutdown(); // Clean up game manager
  sessionManager.shutdown(); // Clean up session manager
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  clearInterval(broadcastInterval);
  gameManager.shutdown(); // Clean up game manager
  sessionManager.shutdown(); // Clean up session manager
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
