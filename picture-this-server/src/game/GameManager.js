/**
 * Game Manager
 * Story 1.2: Game State Management & Round Orchestration
 * 
 * Central manager for all active games
 */

const { createGameState, addPlayer, removePlayer, exportState, getPlayerBySocketId } = require('./GameState');
const GameOrchestrator = require('./GameOrchestrator');
const TimerManager = require('./TimerManager');

class GameManager {
  /**
   * Creates a new game manager
   * @param {Object} logger - Winston logger instance
   * @param {Object} io - Socket.io server instance
   */
  constructor(logger, io) {
    this.logger = logger;
    this.io = io;
    this.games = new Map(); // gameId -> state
    this.timerManager = new TimerManager();
    this.orchestrator = new GameOrchestrator(
      logger,
      this.timerManager,
      this._handleBroadcastEvent.bind(this)
    );
  }

  /**
   * Creates a new game
   * @param {Object} options - Game options
   * @returns {Object} New game state
   */
  createGame(options = {}) {
    const state = createGameState(options);
    this.games.set(state.gameId, state);
    
    this.logger.info('Game created', {
      gameId: state.gameId,
      code: state.code
    });
    
    return state;
  }

  /**
   * Gets a game by ID
   * @param {string} gameId - Game ID
   * @returns {Object|null} Game state or null
   */
  getGame(gameId) {
    return this.games.get(gameId) || null;
  }

  /**
   * Gets a game by code
   * @param {string} code - Game code
   * @returns {Object|null} Game state or null
   */
  getGameByCode(code) {
    for (const game of this.games.values()) {
      if (game.code === code) {
        return game;
      }
    }
    return null;
  }

  /**
   * Updates a game's state
   * @param {string} gameId - Game ID
   * @param {Object} newState - New state
   */
  updateGame(gameId, newState) {
    this.games.set(gameId, newState);
  }

  /**
   * Deletes a game
   * @param {string} gameId - Game ID
   */
  deleteGame(gameId) {
    this.timerManager.cancelTimer(gameId);
    this.games.delete(gameId);
    this.logger.info('Game deleted', { gameId });
  }

  /**
   * Adds a player to a game
   * @param {string} gameId - Game ID
   * @param {Object} playerOptions - Player options
   * @returns {Object} Updated game state
   */
  addPlayerToGame(gameId, playerOptions) {
    const state = this.getGame(gameId);
    if (!state) {
      throw new Error('Game not found');
    }
    
    const newState = addPlayer(state, playerOptions);
    this.updateGame(gameId, newState);
    
    this.logger.info('Player added to game', {
      gameId,
      playerId: newState.players[newState.players.length - 1].id,
      playerName: playerOptions.name
    });
    
    // Broadcast update
    this._broadcastGameState(gameId);
    
    return newState;
  }

  /**
   * Removes a player from a game
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @returns {Object} Updated game state
   */
  removePlayerFromGame(gameId, playerId) {
    const state = this.getGame(gameId);
    if (!state) {
      throw new Error('Game not found');
    }
    
    const newState = removePlayer(state, playerId);
    this.updateGame(gameId, newState);
    
    this.logger.info('Player removed from game', {
      gameId,
      playerId
    });
    
    // Broadcast update
    this._broadcastGameState(gameId);
    
    return newState;
  }

  /**
   * Starts a game
   * @param {string} gameId - Game ID
   * @returns {Object} Updated game state
   */
  startGame(gameId) {
    const state = this.getGame(gameId);
    if (!state) {
      throw new Error('Game not found');
    }
    
    const newState = this.orchestrator.startGame(state);
    this.updateGame(gameId, newState);
    
    return newState;
  }

  /**
   * Handles phase timeout
   * @param {string} gameId - Game ID
   */
  handlePhaseTimeout(gameId) {
    const state = this.getGame(gameId);
    if (!state) {
      return;
    }
    
    try {
      const newState = this.orchestrator.advancePhase(state, null, 'timeout');
      this.updateGame(gameId, newState);
    } catch (error) {
      this.logger.error('Phase timeout error', {
        gameId,
        error: error.message
      });
    }
  }

  /**
   * Submits player card selection
   * @param {string} gameId - Game ID
   * @param {string} playerId - Player ID
   * @param {Array<string>} cards - Selected cards
   * @returns {Object} Updated game state
   */
  submitSelection(gameId, playerId, cards) {
    const state = this.getGame(gameId);
    if (!state) {
      throw new Error('Game not found');
    }
    
    const newState = this.orchestrator.submitSelection(state, playerId, cards);
    this.updateGame(gameId, newState);
    
    // Broadcast selection event
    this.io.to(gameId).emit('player_submitted', {
      playerId,
      submissionCount: Object.keys(newState.playerSelections).length,
      totalPlayers: newState.players.filter(p => p.id !== newState.judgeId).length
    });
    
    return newState;
  }

  /**
   * Submits judge selection
   * @param {string} gameId - Game ID
   * @param {string} judgeId - Judge player ID
   * @param {Object} selection - { firstPlace, secondPlace }
   * @returns {Object} Updated game state
   */
  submitJudgeSelection(gameId, judgeId, selection) {
    const state = this.getGame(gameId);
    if (!state) {
      throw new Error('Game not found');
    }
    
    const newState = this.orchestrator.submitJudgeSelection(state, judgeId, selection);
    this.updateGame(gameId, newState);
    
    return newState;
  }

  /**
   * Gets all active games
   * @returns {Array<Object>} Array of game states
   */
  getAllGames() {
    return Array.from(this.games.values());
  }

  /**
   * Gets game count
   * @returns {number} Number of active games
   */
  getGameCount() {
    return this.games.size;
  }

  /**
   * Exports game state for debugging
   * @param {string} gameId - Game ID
   * @returns {Object|null} Exported state or null
   */
  exportGameState(gameId) {
    const state = this.getGame(gameId);
    if (!state) {
      return null;
    }
    return exportState(state);
  }

  /**
   * Broadcasts game state to all players in a game
   * @param {string} gameId - Game ID
   * @private
   */
  _broadcastGameState(gameId) {
    const state = this.getGame(gameId);
    if (!state) {
      return;
    }
    
    this.io.to(gameId).emit('state_update', {
      type: 'state_update',
      data: { game_state: exportState(state) },
      timestamp: Date.now()
    });
  }

  /**
   * Handles broadcast events from orchestrator
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   * @private
   */
  _handleBroadcastEvent(eventType, data) {
    if (eventType === 'phase_change' && data.gameId) {
      this._broadcastGameState(data.gameId);
      
      this.io.to(data.gameId).emit('phase_change', {
        phase: data.currentPhase,
        timestamp: Date.now()
      });
    } else if (eventType === 'phase_timeout' && data.gameId) {
      this.handlePhaseTimeout(data.gameId);
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    this.logger.info('Shutting down game manager');
    this.timerManager.cancelAll();
    this.games.clear();
  }
}

module.exports = GameManager;
