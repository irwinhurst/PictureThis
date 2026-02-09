/**
 * ---
 * title: PictureThis Game Server - Main Entry Point
 * purpose: Initializes and starts the game server, connecting all modular
 *          components including Express routes, WebSocket handlers, and
 *          game/session managers. Handles server lifecycle and graceful shutdown.
 * exports: app, server, io - for testing and external access
 * ---
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Import core modules
const logger = require('./src/config/logger');
const auth = require('./auth');
const GameManager = require('./src/game/GameManager');
const GameSessionManager = require('./src/game/GameSessionManager');

// Import route modules
const setupHealthRoutes = require('./src/routes/health');
const setupSessionRoutes = require('./src/routes/session');
const setupGameRoutes = require('./src/routes/game');
const setupAuthRoutes = require('./src/routes/authRoutes');
const setupJudgeRoutes = require('./src/routes/judge');

// Import WebSocket modules
const { setupWebSocketHandlers } = require('./src/websocket/handlers');
const { startBroadcast, stopBroadcast } = require('./src/websocket/broadcast');

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

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

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

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

// ============================================================================
// GAME MANAGERS INITIALIZATION
// ============================================================================

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

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

// Dependencies shared across route modules
const routeDeps = {
  gameManager,
  sessionManager,
  auth,
  io,
  passport,
  logger
};

// Register all route modules
setupHealthRoutes(app, routeDeps);
setupSessionRoutes(app, routeDeps);
setupGameRoutes(app, routeDeps);
setupAuthRoutes(app, routeDeps);
setupJudgeRoutes(app, routeDeps);
setupAuthRoutes(app, routeDeps);

// ============================================================================
// WEBSOCKET SETUP
// ============================================================================

// Set up WebSocket event handlers
setupWebSocketHandlers(io, { gameManager, sessionManager, logger });

// Start periodic state broadcast (1 second intervals)
// Note: Most updates happen via WebSocket events, this is just a fallback
const broadcast = startBroadcast(io, gameManager, logger, 1000);

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Game server started on port ${PORT}`);
  logger.info(`WebSocket server ready`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Max concurrent players: ${process.env.MAX_CONCURRENT_PLAYERS}`);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function gracefulShutdown(signal) {
  logger.info(`${signal} signal received: closing HTTP server`);
  stopBroadcast();
  gameManager.shutdown();
  sessionManager.shutdown();
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server, io };
