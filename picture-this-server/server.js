require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const path = require('path');

// Import game management modules
const GameManager = require('./src/game/GameManager');
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
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
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
    activeGames: gameManager.getGameCount()
  });
});

// Debug endpoint for game state (Story 1.2)
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

// Create game endpoint
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
    res.redirect(`/?token=${token}`);
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
      }
      
      // Join socket room for this game
      socket.join(game.gameId);
      
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
      io.to(game.gameId).emit('player-joined', createMessage(MESSAGE_TYPES.PLAYER_JOINED, {
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
  
  // Handle start-game event (Story 1.2)
  socket.on('start-game', (data) => {
    try {
      const clientInfo = connectedClients.get(socketId);
      if (!clientInfo || !clientInfo.gameId) {
        throw new Error('Not in a game');
      }
      
      logger.info('Starting game', { socketId, gameId: clientInfo.gameId });
      
      const newState = gameManager.startGame(clientInfo.gameId);
      
      // Broadcast game started event
      io.to(clientInfo.gameId).emit('game-started', createMessage('game_started', {
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
      io.to(game.gameId).emit('state-update', createMessage(MESSAGE_TYPES.STATE_UPDATE, {
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

// Set up periodic state broadcast (100ms intervals)
const broadcastInterval = setInterval(broadcastGameState, 100);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Game server started on port ${PORT}`);
  logger.info(`WebSocket server ready`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Max concurrent players: ${process.env.MAX_CONCURRENT_PLAYERS}`);
});

// Graceful shutdown (Story 1.2 - Enhanced)
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  clearInterval(broadcastInterval);
  gameManager.shutdown(); // Clean up game manager
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  clearInterval(broadcastInterval);
  gameManager.shutdown(); // Clean up game manager
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
