/**
 * ---
 * title: WebSocket State Broadcasting
 * purpose: Manages periodic game state broadcasts to connected clients.
 *          Provides fallback synchronization in addition to event-driven updates.
 *          Broadcasts state for each active game to its participants.
 * exports: startBroadcast - Starts the periodic broadcast interval
 *          stopBroadcast - Stops the broadcast interval
 * dependencies: gameManager, logger, io, websocket handlers (for client tracking)
 * ---
 */

const { MESSAGE_TYPES, createMessage } = require('../utils/messages');
const { getConnectedClients, getLegacyGameState } = require('./handlers');

let broadcastInterval = null;

/**
 * Broadcast game state to all connected clients
 * Broadcasts state for each active game to its participants
 */
function broadcastGameState(io, gameManager, logger) {
  const connectedClients = getConnectedClients();
  const gameState = getLegacyGameState();
  
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

/**
 * Start periodic state broadcasting
 * @param {object} io - Socket.io server instance
 * @param {object} gameManager - GameManager instance
 * @param {object} logger - Logger instance
 * @param {number} intervalMs - Broadcast interval in milliseconds (default: 1000)
 * @returns {object} Object with stop function
 */
function startBroadcast(io, gameManager, logger, intervalMs = 1000) {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
  }
  
  broadcastInterval = setInterval(() => {
    broadcastGameState(io, gameManager, logger);
  }, intervalMs);
  
  logger.info(`State broadcast started with ${intervalMs}ms interval`);
  
  return {
    stop: stopBroadcast
  };
}

/**
 * Stop periodic state broadcasting
 */
function stopBroadcast() {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
}

module.exports = {
  startBroadcast,
  stopBroadcast,
  broadcastGameState
};
