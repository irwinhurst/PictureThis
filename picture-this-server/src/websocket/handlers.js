/**
 * ---
 * title: WebSocket Event Handlers
 * purpose: Manages all Socket.io event handlers for real-time game communication.
 *          Handles player connections, game creation/joining, card selection,
 *          judge actions, and player disconnections.
 * exports: function(io, deps) - WebSocket setup function
 * dependencies: gameManager, sessionManager, logger, MESSAGE_TYPES, createMessage
 * ---
 */

const { MESSAGE_TYPES, createMessage } = require('../utils/messages');

// Track connected clients and their game associations
const connectedClients = new Map(); // socketId -> { gameId, playerId, code, socket, connectedAt }

// Legacy placeholder for backward compatibility
let gameState = {
  round: 0,
  phase: 'waiting',
  timer: 0,
  leaderboard: [],
  players: [],
  timestamp: Date.now()
};

/**
 * Get the connected clients map (for use by broadcast module)
 */
function getConnectedClients() {
  return connectedClients;
}

/**
 * Get the legacy game state (for use by broadcast module)
 */
function getLegacyGameState() {
  return gameState;
}

/**
 * Set up all WebSocket event handlers
 */
function setupWebSocketHandlers(io, { gameManager, sessionManager, logger }) {

  io.on('connection', (socket) => {
    const socketId = socket.id;
    
    logger.info(`Client connected: ${socketId}`);
    
    // Add to connected clients
    connectedClients.set(socketId, {
      id: socketId,
      connectedAt: Date.now(),
      socket: socket,
      gameId: null,
      playerId: null,
      code: null
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
        
        const { code, name, avatar, playerId } = data;
        
        // Check SessionManager first to see if game exists via REST API
        const session = sessionManager.getSessionByCode(code);
        if (!session) {
          throw new Error(`Game session not found: ${code}`);
        }
        
        // Find game in GameManager
        let game = gameManager.getGameByCode(code);
        
        // If game doesn't exist in GameManager but exists in SessionManager,
        // create it in GameManager to sync both systems
        if (!game) {
          game = gameManager.createGame({ code });
          logger.info('Created game in GameManager to sync with SessionManager', { code, gameId: game.gameId });
        }
        
        // Check if player already exists in SessionManager (by playerId)
        let existingPlayer = session.players.find(p => p.playerId === playerId);
        
        if (existingPlayer) {
          logger.info('Player reconnecting, not adding duplicate', { 
            code, 
            playerId,
            socketId
          });
          // Find the player in game or just use the first matching name
          let gamePlayer = game.players.find(p => p.socketId === socketId);
          if (!gamePlayer) {
            // Add player to GameManager if not there
            gameManager.addPlayerToGame(game.gameId, {
              socketId,
              name: existingPlayer.name,
              avatar: existingPlayer.avatar,
              isHost: false
            });
            const updatedGame = gameManager.getGame(game.gameId);
            gamePlayer = updatedGame.players[updatedGame.players.length - 1];
            game = updatedGame;
            logger.info('Added reconnecting player to GameManager', { code, playerId, socketId });
          }
        } else {
          // New player - add to both systems
          const newState = gameManager.addPlayerToGame(game.gameId, {
            socketId,
            name: name || 'Anonymous',
            avatar: avatar || '🎮',
            isHost: game.players.length === 0
          });
          game = newState;
          
          // Add to SessionManager
          sessionManager.joinSession(code, {
            playerId,
            name: name || 'Anonymous',
            avatar: avatar || '🎮'
          });
          logger.info('Added new player to both managers', { code, playerId, socketId });
        }
        
        // Get the final player object
        const player = game.players.find(p => p.socketId === socketId);
        if (!player) {
          throw new Error(`Could not find player in game. Players: ${game.players.length}, socketId: ${socketId}`);
        }
        
        // Store player's game association
        const clientInfo = connectedClients.get(socketId);
        if (clientInfo) {
          clientInfo.gameId = game.gameId;
          clientInfo.playerId = playerId || player.id;
          clientInfo.code = code;
        }
        
        // Join socket room using game CODE as room identifier
        socket.join(`game-${code}`);
        
        // Send join confirmation to player
        socket.emit('game-joined', createMessage('game_joined', {
          gameId: game.gameId,
          playerId: player.id,
          code: game.code,
          player
        }));
        
        // Legacy support - update old gameState (only if new player)
        if (!existingPlayer) {
          gameState.players.push({
            socketId,
            name: name || 'Anonymous',
            avatar: avatar || '🎮',
            code
          });
          
          // Broadcast player joined event to all in game (only if new player)
          io.to(`game-${code}`).emit('player-joined', createMessage(MESSAGE_TYPES.PLAYER_JOINED, {
            player,
            player_count: game.players.length
          }));
        } else {
          logger.info('Existing player reconnected', { code, playerId, socketId });
        }
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
        if (!clientInfo || !clientInfo.code) {
          throw new Error('Not in a game');
        }
        
        logger.info('Starting game via WebSocket', { socketId, code: clientInfo.code });
        
        // Get session
        const session = sessionManager.getSessionByCode(clientInfo.code);
        if (!session) {
          throw new Error(`Session not found for code: ${clientInfo.code}`);
        }
        
        // Default sentence templates
        const sentenceTemplates = [
          'I SAW A _____ TRYING TO _____',
          'THE _____ WAS _____ AND _____',
          'MY FRIEND _____ LOVES _____',
          'IN THE _____, THERE WAS A _____',
          'THE BEST _____ I EVER SAW WAS _____'
        ];
        
        // Start game in SessionManager (source of truth)
        const updatedSession = sessionManager.startGame(clientInfo.code, sentenceTemplates);
        
        // Find the judge player info
        const judge = updatedSession.players.find(p => p.playerId === updatedSession.judgeId);
        
        logger.info('Game started', {
          code: clientInfo.code,
          gameId: updatedSession.gameId,
          players: updatedSession.players.length,
          judgeId: updatedSession.judgeId,
          judgeName: judge?.name,
          judgeAvatar: judge?.avatar
        });
        
        // Broadcast game started event using code-based room
        io.to(`game-${clientInfo.code}`).emit('game-started', {
          gameId: updatedSession.gameId,
          code: updatedSession.code,
          round: updatedSession.currentRound,
          judge: judge ? {
            id: judge.playerId,
            name: judge.name,
            avatar: judge.avatar
          } : null,
          sentence: updatedSession.sentenceTemplate,
          sentenceTemplate: updatedSession.sentenceTemplate,
          time_remaining: 45,
          max_rounds: updatedSession.maxRounds,
          status: updatedSession.currentPhase
        });
        
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
    
    // Handle judge-ready event (Story 3.3 - Judge interface ready)
    socket.on('judge-ready', (data) => {
      try {
        const { code, judgeId } = data;
        
        if (!code) {
          throw new Error('Game code is required');
        }
        
        logger.debug('Judge interface ready', { 
          socketId,
          code,
          judgeId
        });
        
        // Update client info with game code (judge is already a player in the session)
        const clientInfo = connectedClients.get(socketId);
        if (clientInfo) {
          clientInfo.code = code;
          clientInfo.judgeId = judgeId;
        }
        
        // Join the game room to receive events
        socket.join(`game-${code}`);
        
        // Broadcast judge is ready to see submissions
        io.to(`game-${code}`).emit('judge-interface-ready', createMessage('judge_ready', {
          judgeId,
          timestamp: Date.now()
        }));
        
      } catch (error) {
        logger.error('Error handling judge-ready', { socketId, error: error.message });
        socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
          message: error.message,
          code: 'ERR_JUDGE_READY'
        }));
      }
    });
    
    // Handle judge-submission event (Story 3.3 - Judge selections submitted)
    socket.on('judge-submission', (data) => {
      try {
        const { code, firstPlaceId, secondPlaceId } = data;
        
        if (!code) {
          throw new Error('Game code is required');
        }
        
        logger.info('Judge submitted selections', { 
          socketId,
          code,
          firstPlace: firstPlaceId,
          secondPlace: secondPlaceId
        });
        
        // Broadcast judge selections to all players in game
        io.to(`game-${code}`).emit('judge-selections-submitted', createMessage('judge_submitted', {
          code,
          firstPlaceId,
          secondPlaceId,
          submittedAt: Date.now()
        }));
        
      } catch (error) {
        logger.error('Error handling judge-submission', { socketId, error: error.message });
        socket.emit('error', createMessage(MESSAGE_TYPES.ERROR, {
          message: error.message,
          code: 'ERR_JUDGE_SUBMISSION'
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
}

module.exports = {
  setupWebSocketHandlers,
  getConnectedClients,
  getLegacyGameState
};
