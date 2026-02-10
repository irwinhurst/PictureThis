/**
 * ---
 * title: Game Session Manager
 * purpose: Main facade for managing game sessions. Composes SessionStore, PlayerOperations,
 *          PhaseOperations, SelectionOperations, and TimeoutChecker into a unified API.
 * exports: GameSessionManager class
 * dependencies: SessionStore, PlayerOperations, PhaseOperations, SelectionOperations, TimeoutChecker
 * ---
 */

const SessionStore = require('./SessionStore');
const PlayerOperations = require('./PlayerOperations');
const PhaseOperations = require('./PhaseOperations');
const SelectionOperations = require('./SelectionOperations');
const TimeoutChecker = require('./TimeoutChecker');

class GameSessionManager {
  constructor(config = {}) {
    // Initialize session store
    this.store = new SessionStore();
    
    // Configuration
    this.timeoutMinutes = config.timeoutMinutes || 60;
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialize timeout checker
    this.timeoutChecker = new TimeoutChecker({
      timeoutMinutes: this.timeoutMinutes,
      checkIntervalSeconds: config.checkIntervalSeconds || 300,
      getSessionsCallback: () => this.store.getAll(),
      cleanupCallback: (code) => this.cleanupSession(code),
      emitCallback: (event, ...args) => this.emit(event, ...args)
    });
    
    // Start background timeout checker
    this.timeoutChecker.start();
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Register an event listener
   * @param {string} eventName - Event name
   * @param {function} callback - Callback function
   */
  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }

  /**
   * Emit an event
   * @private
   */
  emit(eventName, ...args) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in ${eventName} listener:`, error);
        }
      });
    }
  }

  // ============================================
  // Session Creation & Retrieval
  // ============================================

  /**
   * Create a new game session
   * @param {string} hostId - UUID of the host player
   * @param {number} maxRounds - Maximum number of rounds (1-20)
   * @param {number} maxPlayers - Maximum players (1-20, use 1 for single-player mode)
   * @returns {Object} - Created GameSession object
   */
  createSession(hostId, maxRounds = 5, maxPlayers = 8) {
    // Validate parameters
    if (!hostId) throw new Error('hostId is required');
    if (maxRounds < 1 || maxRounds > 20) throw new Error('maxRounds must be between 1 and 20');
    if (maxPlayers < 1 || maxPlayers > 20) throw new Error('maxPlayers must be between 1 and 20');

    const code = this.store.generateUniqueCode();
    const gameId = this.store.generateGameId();
    const now = Date.now();

    const session = {
      gameId,
      code,
      hostId,
      createdAt: now,
      lastActivityAt: now,
      maxRounds,
      currentRound: 0,
      currentPhase: 'lobby',
      maxPlayers,
      status: 'lobby',
      players: [],
      sentenceTemplate: null,
      selectedNouns: [],
      playerSelections: {},
      timeoutMinutes: this.timeoutMinutes
    };

    this.store.set(code, session);
    this.emit('onSessionCreated', gameId, code);

    return session;
  }

  /**
   * Get a session by its code
   * @param {string} code - 6-character game code
   * @returns {Object|null} - GameSession or null
   */
  getSessionByCode(code) {
    return this.store.get(code);
  }

  /**
   * Get a session by its gameId
   * @param {string} gameId - UUID of the game
   * @returns {Object|null} - GameSession or null
   */
  getSessionByGameId(gameId) {
    return this.store.getByGameId(gameId);
  }

  /**
   * Get all active sessions
   * @returns {Array<Object>} - Array of active GameSession objects
   */
  getAllActiveSessions() {
    return this.store.getAll();
  }

  // ============================================
  // Player Management (delegates to PlayerOperations)
  // ============================================

  /**
   * Add a player to a session
   * @param {string} code - 6-character game code
   * @param {Object} player - Player object {playerId, name, avatar}
   * @returns {Object} - Updated GameSession
   */
  joinSession(code, player) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }
    
    const updated = PlayerOperations.joinSession(
      session, 
      player, 
      (event, ...args) => this.emit(event, ...args)
    );
    
    this.store.set(code, updated);
    return updated;
  }

  /**
   * Remove a player from a session
   * @param {string} code - 6-character game code
   * @param {string} playerId - UUID of player to remove
   * @returns {Object} - Updated GameSession
   */
  removePlayerFromSession(code, playerId) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }
    
    const updated = PlayerOperations.removePlayer(
      session, 
      playerId, 
      (event, ...args) => this.emit(event, ...args)
    );
    
    this.store.set(code, updated);
    return updated;
  }

  // ============================================
  // Phase Management (delegates to PhaseOperations)
  // ============================================

  /**
   * Update the phase of a session with validation
   * @param {string} code - 6-character game code
   * @param {string} newPhase - New phase name
   * @returns {Object} - Updated GameSession
   */
  updateSessionPhase(code, newPhase) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }
    
    const updated = PhaseOperations.updatePhase(
      session, 
      newPhase, 
      (event, ...args) => this.emit(event, ...args)
    );
    
    this.store.set(code, updated);
    return updated;
  }

  /**
   * Update the current round
   * @param {string} code - 6-character game code
   * @param {number} roundNumber - New round number
   * @returns {Object} - Updated GameSession
   */
  updateCurrentRound(code, roundNumber) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }
    
    const updated = PhaseOperations.updateRound(session, roundNumber);
    this.store.set(code, updated);
    return updated;
  }

  /**
   * Update sentence template and selected nouns
   * @param {string} code - 6-character game code
   * @param {string} sentence - Sentence template with blanks
   * @param {Array<string>} nouns - Selected nouns
   * @returns {Object} - Updated GameSession
   */
  updateRoundContent(code, sentence, nouns = []) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }
    
    const updated = PhaseOperations.updateRoundContent(session, sentence, nouns);
    this.store.set(code, updated);
    return updated;
  }

  /**
   * Update last activity timestamp
   * @param {string} code - 6-character game code
   */
  updateLastActivity(code) {
    const session = this.store.get(code);
    if (session) {
      session.lastActivityAt = new Date().toISOString();
      this.store.set(code, session);
    }
  }

  /**
   * Update session status
   * @param {string} code - 6-character game code
   * @param {string} status - New status
   * @returns {Object} - Updated GameSession
   */
  updateSessionStatus(code, status) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }
    
    const updated = PhaseOperations.updateStatus(session, status);
    this.store.set(code, updated);
    return updated;
  }

  /**
   * End a session (mark as completed)
   * @param {string} code - 6-character game code
   * @returns {Object} - Updated GameSession
   */
  endSession(code) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }
    
    const updated = PhaseOperations.endSession(
      session, 
      (event, ...args) => this.emit(event, ...args)
    );
    
    this.store.set(code, updated);
    return updated;
  }

  // ============================================
  // Game Flow
  // ============================================

  /**
   * Start the game (transition from lobby to round 1)
   * @param {string} code - 6-character game code
   * @param {Array<string>} sentenceTemplates - Array of sentence templates
   * @returns {Object} - Updated GameSession with judge and sentence selected
   */
  startGame(code, sentenceTemplates = []) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.players || session.players.length < 1) {
      throw new Error('Not enough players to start game');
    }

    if (session.status !== 'lobby') {
      throw new Error('Game has already started');
    }

    // Check if single-player mode
    const isSinglePlayer = session.players.length === 1;

    // Select random judge (skip if single player)
    let judgeIndex = null;
    let judge = null;
    if (!isSinglePlayer) {
      judgeIndex = Math.floor(Math.random() * session.players.length);
      judge = session.players[judgeIndex];
    }

    // Select random sentence template
    let sentenceTemplate = null;
    if (sentenceTemplates && sentenceTemplates.length > 0) {
      sentenceTemplate = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];
    } else {
      sentenceTemplate = 'I SAW A _____ TRYING TO _____';
    }

    // Update session
    session.status = 'in_progress';
    session.currentPhase = 'round_1_selection';
    session.currentRound = 1;
    session.judgeId = judge ? judge.playerId : null;
    session.judgeIndex = judgeIndex;
    session.sentenceTemplate = sentenceTemplate;
    session.lastActivityAt = Date.now();
    session.gameStartedAt = Date.now();
    session.isSinglePlayer = isSinglePlayer;

    this.store.set(code, session);
    this.emit('onGameStarted', session.gameId, code, judge, sentenceTemplate);

    return session;
  }

  // ============================================
  // Card Selection (delegates to SelectionOperations)
  // ============================================

  /**
   * Record player's card selections for the current round
   * @param {string} code - 6-character game code
   * @param {string} playerId - UUID of the player
   * @param {Object} selections - Map of { blankIndex: cardIndex }
   * @returns {Object} - Updated session
   */
  recordPlayerSelection(code, playerId, selections) {
    const session = this.store.get(code);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const updated = SelectionOperations.recordSelection(
      session, 
      playerId, 
      selections,
      (event, ...args) => this.emit(event, ...args)
    );
    
    this.store.set(code, updated);
    return updated;
  }

  /**
   * Get all player selections for the current round
   * @param {string} code - 6-character game code
   * @returns {Object} - Map of { playerId: selections }
   */
  getPlayerSelections(code) {
    const session = this.store.get(code);
    return SelectionOperations.getAllSelections(session);
  }

  /**
   * Get selection for a specific player
   * @param {string} code - 6-character game code
   * @param {string} playerId - UUID of the player
   * @returns {Object|null} - Player's selections or null
   */
  getPlayerSelection(code, playerId) {
    const session = this.store.get(code);
    return SelectionOperations.getPlayerSelection(session, playerId);
  }

  // ============================================
  // Timeout & Cleanup
  // ============================================

  /**
   * Check for sessions that have timed out
   * @returns {Array<string>} - Array of game codes that have timed out
   */
  checkTimeouts() {
    return this.timeoutChecker.checkTimeouts();
  }

  /**
   * Cleanup a session (remove from active registry)
   * @param {string} code - 6-character game code
   * @returns {Object|null} - Cleaned up GameSession object or null
   */
  cleanupSession(code) {
    const session = this.store.get(code);
    if (!session) {
      return null;
    }

    session.status = 'inactive';
    this.store.delete(code);
    this.emit('onSessionCleaned', code);

    return session;
  }

  /**
   * Cleanup all timed-out sessions
   * @returns {Array<string>} - Array of cleaned up game codes
   */
  cleanupTimedOutSessions() {
    return this.timeoutChecker.checkAndCleanup();
  }

  /**
   * Shutdown the session manager
   */
  shutdown() {
    this.timeoutChecker.stop();
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get session statistics
   * @returns {Object} - Statistics object
   */
  getStatistics() {
    const sessions = this.store.getAll();
    const lobbyCount = sessions.filter(s => s.status === 'lobby').length;
    const inProgressCount = sessions.filter(s => s.status === 'in_progress').length;
    const totalPlayers = sessions.reduce((sum, s) => sum + s.players.length, 0);

    return {
      totalActiveSessions: sessions.length,
      lobbyCount,
      inProgressCount,
      totalPlayers,
      activeCodes: this.store.getActiveCodes()
    };
  }
}

module.exports = GameSessionManager;
