require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const path = require('path');
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

// Track connected clients
const connectedClients = new Map();

// Placeholder game state
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
    timestamp: Date.now()
  });
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
    socket: socket
  });
  
  // Send connected event to client
  socket.emit('connected', createMessage(MESSAGE_TYPES.CONNECTED, {
    socket_id: socketId,
    timestamp: Date.now()
  }));
  
  // Handle join-game event
  socket.on('join-game', (data) => {
    try {
      logger.info('Player joining game', { socketId, data });
      
      // Add player to game state
      gameState.players.push({
        socketId,
        name: data.name || 'Anonymous',
        avatar: data.avatar || '🎮',
        code: data.code
      });
      
      // Broadcast player joined event
      io.emit('player-joined', createMessage(MESSAGE_TYPES.PLAYER_JOINED, {
        player: gameState.players[gameState.players.length - 1],
        player_count: gameState.players.length
      }));
    } catch (error) {
      logger.error('Error handling join-game', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: 'Failed to join game',
        code: 'ERR_001'
      }));
    }
  });
  
  // Handle select-cards event
  socket.on('select-cards', (data) => {
    try {
      logger.debug('Player selecting cards', { socketId, data });
      // Placeholder - actual game logic will be in Story 1.2
    } catch (error) {
      logger.error('Error handling select-cards', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: 'Failed to select cards',
        code: 'ERR_002'
      }));
    }
  });
  
  // Handle judge-select event
  socket.on('judge-select', (data) => {
    try {
      logger.debug('Judge selecting winner', { socketId, data });
      // Placeholder - actual game logic will be in Story 1.2
    } catch (error) {
      logger.error('Error handling judge-select', { socketId, error: error.message });
      socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
        message: 'Failed to select winner',
        code: 'ERR_003'
      }));
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socketId}`, { reason });
    
    // Remove from connected clients
    connectedClients.delete(socketId);
    
    // Remove player from game state
    gameState.players = gameState.players.filter(p => p.socketId !== socketId);
  });
  
  // Catch-all error handler
  socket.on('error', (error) => {
    logger.error('Socket error', { socketId, error: error.message });
  });
});

// Broadcast game state to all connected clients
// Note: Currently broadcasts every 100ms unconditionally.
// Future optimization (Story 1.2+): Only broadcast when state changes,
// or use different intervals for lobby vs active game clients.
function broadcastGameState() {
  if (connectedClients.size === 0) {
    return; // No clients connected, skip broadcast
  }
  
  // Update timestamp
  gameState.timestamp = Date.now();
  
  // Send state update to all connected clients
  io.emit('state-update', createMessage(MESSAGE_TYPES.STATE_UPDATE, {
    game_state: gameState
  }));
  
  logger.debug(`State broadcast sent to ${connectedClients.size} clients`);
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

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  clearInterval(broadcastInterval);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  clearInterval(broadcastInterval);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
