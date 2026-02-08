const { v4: uuidv4 } = require('uuid');

/**
 * GameSessionManager
 * Manages all game sessions with unique codes, player tracking, and session lifecycle
 */
class GameSessionManager {
  constructor(config = {}) {
    // Session storage
    this.sessionMap = new Map(); // code -> GameSession
    this.activeGameCodes = new Set(); // For collision detection
    
    // Configuration
    this.timeoutMinutes = config.timeoutMinutes || 60;
    this.checkIntervalSeconds = config.checkIntervalSeconds || 300; // 5 minutes
    
    // Event listeners
    this.eventListeners = {};
    
    // Start background timeout checker
    this.startTimeoutChecker();
  }

  /**
   * Register an event listener
   * @param {string} eventName - Event name (e.g., 'onSessionCreated')
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

  /**
   * Generate a unique 6-character alphanumeric code with collision detection
   * @returns {string} - 6-character uppercase alphanumeric code
   * @throws {CodeGenerationFailedError} - If unable to generate unique code after retries
   */
  generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const maxRetries = 10;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Generate random 6-character code
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check for collision
      if (!this.activeGameCodes.has(code)) {
        return code;
      }
    }
    
    throw new Error('Failed to generate unique code after ' + maxRetries + ' retries');
  }

  /**
   * Create a new game session
   * @param {string} hostId - UUID of the host player
   * @param {number} maxRounds - Maximum number of rounds (5-20)
   * @param {number} maxPlayers - Maximum players (2-20)
   * @returns {Object} - Created GameSession object
   */
  createSession(hostId, maxRounds = 5, maxPlayers = 8) {
    // Validate parameters
    if (!hostId) throw new Error('hostId is required');
    if (maxRounds < 1 || maxRounds > 20) throw new Error('maxRounds must be between 1 and 20');
    if (maxPlayers < 2 || maxPlayers > 20) throw new Error('maxPlayers must be between 2 and 20');

    // Generate unique code
    const code = this.generateUniqueCode();
    const gameId = uuidv4();
    const now = Date.now(); // Use timestamp instead of ISO string

    // Create session object
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
      playerSelections: {}, // playerId -> { blanks: [cardIndices] }
      timeoutMinutes: this.timeoutMinutes
    };

    // Store session
    this.sessionMap.set(code, session);
    this.activeGameCodes.add(code);

    // Emit event
    this.emit('onSessionCreated', gameId, code);

    return session;
  }

  /**
   * Get a session by its code
   * @param {string} code - 6-character game code
   * @returns {Object|null} - GameSession or null if not found
   */
  getSessionByCode(code) {
    if (!code) return null;
    return this.sessionMap.get(code.toUpperCase()) || null;
  }

  /**
   * Get a session by its gameId
   * @param {string} gameId - UUID of the game
   * @returns {Object|null} - GameSession or null if not found
   */
  getSessionByGameId(gameId) {
    for (const session of this.sessionMap.values()) {
      if (session.gameId === gameId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Add a player to a session
   * @param {string} code - 6-character game code
   * @param {Object} player - Player object {playerId, name, avatar}
   * @returns {Object} - Updated GameSession
   */
  joinSession(code, player) {
    const session = this.getSessionByCode(code);
    
    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }

    if (session.status !== 'lobby') {
      throw new Error('Cannot join game that has already started');
    }

    if (session.players.length >= session.maxPlayers) {
      throw new Error('Session is full');
    }

    // Check if player already in session
    const existingPlayer = session.players.find(p => p.playerId === player.playerId);
    if (existingPlayer) {
      return session; // Already joined
    }

    // Add player
    const now = Date.now(); // Use timestamp
    session.players.push({
      playerId: player.playerId,
      name: player.name || 'Anonymous',
      avatar: player.avatar || '🎮',
      isHost: false,
      joinedAt: now
    });

    // Update activity
    session.lastActivityAt = now;

    // Emit event
    this.emit('onPlayerJoined', code, player.playerId, session.players.length);

    return session;
  }

  /**
   * Remove a player from a session
   * @param {string} code - 6-character game code
   * @param {string} playerId - UUID of player to remove
   * @returns {Object} - Updated GameSession
   */
  removePlayerFromSession(code, playerId) {
    const session = this.getSessionByCode(code);

    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }

    // Find and remove player
    const playerIndex = session.players.findIndex(p => p.playerId === playerId);
    if (playerIndex === -1) {
      throw new Error(`Player not found: ${playerId}`);
    }

    const isHost = session.players[playerIndex].isHost;
    session.players.splice(playerIndex, 1);

    // Update activity
    session.lastActivityAt = Date.now();

    // If host leaves, mark session for cleanup
    if (isHost) {
      this.emit('onHostDisconnected', code);
      // Optionally cleanup immediately
      // this.cleanupSession(code);
    }

    // Emit event
    this.emit('onPlayerLeft', code, playerId, session.players.length);

    return session;
  }

  /**
   * Update the phase of a session with validation
   * @param {string} code - 6-character game code
   * @param {string} newPhase - New phase name
   * @returns {Object} - Updated GameSession
   */
  updateSessionPhase(code, newPhase) {
    const session = this.getSessionByCode(code);

    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }

    const validPhases = ['lobby', 'round_intro', 'card_selection', 'judge_phase', 'results', 'completed'];
    if (!validPhases.includes(newPhase)) {
      throw new Error(`Invalid phase: ${newPhase}`);
    }

    // Validate phase transition
    const validTransitions = {
      lobby: ['round_intro'],
      round_intro: ['card_selection'],
      card_selection: ['judge_phase'],
      judge_phase: ['results'],
      results: ['round_intro', 'completed'],
      completed: []
    };

    const allowedTransitions = validTransitions[session.currentPhase] || [];
    if (!allowedTransitions.includes(newPhase)) {
      throw new Error(`Cannot transition from ${session.currentPhase} to ${newPhase}`);
    }

    const oldPhase = session.currentPhase;
    session.currentPhase = newPhase;
    session.lastActivityAt = new Date().toISOString();

    // Emit event
    this.emit('onPhaseChanged', code, oldPhase, newPhase);

    return session;
  }

  /**
   * Update the current round
   * @param {string} code - 6-character game code
   * @param {number} roundNumber - New round number
   * @returns {Object} - Updated GameSession
   */
  updateCurrentRound(code, roundNumber) {
    const session = this.getSessionByCode(code);

    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }

    if (roundNumber < 0 || roundNumber > session.maxRounds) {
      throw new Error(`Invalid round: ${roundNumber}`);
    }

    session.currentRound = roundNumber;
    session.lastActivityAt = new Date().toISOString();

    return session;
  }

  /**
   * Update sentence template and selected nouns
   * @param {string} code - 6-character game code
   * @param {string} sentence - Sentence template with blanks
   * @param {Array<string>} nouns - Selected nouns
   * @returns {Object} - Updated GameSession
   */
  updateRoundContent(code, sentence, nouns = []) {
    const session = this.getSessionByCode(code);

    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }

    session.sentenceTemplate = sentence;
    session.selectedNouns = nouns;
    session.lastActivityAt = new Date().toISOString();

    return session;
  }

  /**
   * Update last activity timestamp (called on any player action)
   * @param {string} code - 6-character game code
   */
  updateLastActivity(code) {
    const session = this.getSessionByCode(code);
    if (session) {
      session.lastActivityAt = new Date().toISOString();
    }
  }

  /**
   * Update session status
   * @param {string} code - 6-character game code
   * @param {string} status - New status (lobby|in_progress|completed|inactive)
   * @returns {Object} - Updated GameSession
   */
  updateSessionStatus(code, status) {
    const session = this.getSessionByCode(code);

    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }

    const validStatuses = ['lobby', 'in_progress', 'completed', 'inactive'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    session.status = status;
    session.lastActivityAt = new Date().toISOString();

    return session;
  }

  /**
   * End a session (mark as completed)
   * @param {string} code - 6-character game code
   * @returns {Object} - Updated GameSession
   */
  endSession(code) {
    const session = this.getSessionByCode(code);

    if (!session) {
      throw new Error(`Session not found: ${code}`);
    }

    session.status = 'completed';
    session.currentPhase = 'completed';
    session.lastActivityAt = new Date().toISOString();

    this.emit('onSessionEnded', code);

    return session;
  }

  /**
   * Get all active sessions
   * @returns {Array<Object>} - Array of active GameSession objects
   */
  getAllActiveSessions() {
    return Array.from(this.sessionMap.values());
  }

  /**
   * Check for sessions that have timed out
   * @returns {Array<string>} - Array of game codes that have timed out
   */
  checkTimeouts() {
    const timedOutCodes = [];
    const now = new Date();
    const timeoutMs = this.timeoutMinutes * 60 * 1000;

    for (const [code, session] of this.sessionMap.entries()) {
      const lastActivityTime = new Date(session.lastActivityAt);
      const timeSinceActivity = now - lastActivityTime;

      if (timeSinceActivity > timeoutMs) {
        timedOutCodes.push(code);
        this.emit('onSessionTimedOut', code);
      }
    }

    return timedOutCodes;
  }

  /**
   * Cleanup a session (remove from active registry)
   * Optionally archives the session data for history
   * @param {string} code - 6-character game code
   * @returns {Object|null} - Cleaned up GameSession object or null
   */
  cleanupSession(code) {
    const session = this.sessionMap.get(code);

    if (!session) {
      return null;
    }

    // Mark as inactive
    session.status = 'inactive';

    // Remove from active registry
    this.sessionMap.delete(code);
    this.activeGameCodes.delete(code);

    // Emit cleanup event (caller can archive if needed)
    this.emit('onSessionCleaned', code);

    return session;
  }

  /**
   * Cleanup all timed-out sessions
   * @returns {Array<string>} - Array of cleaned up game codes
   */
  cleanupTimedOutSessions() {
    const timedOutCodes = this.checkTimeouts();
    const cleanedCodes = [];

    for (const code of timedOutCodes) {
      this.cleanupSession(code);
      cleanedCodes.push(code);
    }

    return cleanedCodes;
  }

  /**
   * Start background timeout checker (runs periodically)
   * @private
   */
  startTimeoutChecker() {
    setInterval(() => {
      try {
        const cleanedCodes = this.cleanupTimedOutSessions();
        if (cleanedCodes.length > 0) {
          console.log(`[SessionManager] Cleaned up ${cleanedCodes.length} timed out sessions:`, cleanedCodes);
        }
      } catch (error) {
        console.error('[SessionManager] Error in timeout checker:', error);
      }
    }, this.checkIntervalSeconds * 1000);
  }

  /**
   * Start the game (transition from lobby to round 1)
   * @param {string} code - 6-character game code
   * @param {Array<string>} sentenceTemplates - Array of sentence templates to choose from
   * @returns {Object} - Updated GameSession with judge and sentence selected
   * @throws {Error} - If not enough players or session not found
   */
  startGame(code, sentenceTemplates = []) {
    const session = this.getSessionByCode(code);
    if (!session) {
      throw new Error('Session not found');
    }

    // Validate at least 2 players
    if (!session.players || session.players.length < 2) {
      throw new Error('Not enough players to start game');
    }

    // Cannot start if already started
    if (session.status !== 'lobby') {
      throw new Error('Game has already started');
    }

    // Select a random judge (first player for now, but can rotate)
    const judgeIndex = Math.floor(Math.random() * session.players.length);
    const judge = session.players[judgeIndex];

    // Select a random sentence template
    let sentenceTemplate = null;
    if (sentenceTemplates && sentenceTemplates.length > 0) {
      sentenceTemplate = sentenceTemplates[Math.floor(Math.random() * sentenceTemplates.length)];
    } else {
      // Fallback sentence if none provided
      sentenceTemplate = 'I SAW A _____ TRYING TO _____';
    }

    // Update session
    session.status = 'in_progress';
    session.currentPhase = 'round_1_selection';
    session.currentRound = 1;
    session.judgeId = judge.playerId;
    session.judgeIndex = judgeIndex;
    session.sentenceTemplate = sentenceTemplate;
    session.lastActivityAt = Date.now();
    session.gameStartedAt = Date.now();

    // Re-store updated session
    this.sessionMap.set(code, session);

    // Emit event
    this.emit('onGameStarted', session.gameId, code, judge, sentenceTemplate);

    return session;
  }

  /**
   * Record player's card selections for the current round
   * @param {string} code - 6-character game code
   * @param {string} playerId - UUID of the player
   * @param {Object} selections - Map of { blankIndex: cardIndex }
   * @returns {Object} - Updated session
   * @throws {Error} - If validation fails
   */
  recordPlayerSelection(code, playerId, selections) {
    const session = this.getSessionByCode(code);
    if (!session) {
      throw new Error('Session not found');
    }

    // Validate player is in game
    const player = session.players.find(p => p.playerId === playerId);
    if (!player) {
      throw new Error('Player not found in session');
    }

    // Validate judge can't submit selections
    if (session.judgeId === playerId) {
      throw new Error('Judge cannot submit card selections');
    }

    // Validate selections format
    if (!selections || typeof selections !== 'object') {
      throw new Error('Invalid selections format');
    }

    // Store selections
    session.playerSelections[playerId] = {
      selections: selections,
      submittedAt: Date.now()
    };

    session.lastActivityAt = Date.now();
    this.sessionMap.set(code, session);

    // Emit event
    this.emit('onPlayerSelectionSubmitted', session.gameId, playerId, selections);

    return session;
  }

  /**
   * Get all player selections for the current round
   * @param {string} code - 6-character game code
   * @returns {Object} - Map of { playerId: selections }
   */
  getPlayerSelections(code) {
    const session = this.getSessionByCode(code);
    if (!session) return null;
    return session.playerSelections;
  }

  /**
   * Get selection for a specific player
   * @param {string} code - 6-character game code
   * @param {string} playerId - UUID of the player
   * @returns {Object|null} - Player's selections or null
   */
  getPlayerSelection(code, playerId) {
    const session = this.getSessionByCode(code);
    if (!session) return null;
    return session.playerSelections[playerId] || null;
  }

  /**
   * Shutdown the session manager (cleanup resources)
   */
  shutdown() {
    // Could stop interval here if needed
    // For now, sessions are stored in memory
  }

  /**
   * Get session statistics
   * @returns {Object} - Statistics object
   */
  getStatistics() {
    const sessions = this.getAllActiveSessions();
    const lobbyCount = sessions.filter(s => s.status === 'lobby').length;
    const inProgressCount = sessions.filter(s => s.status === 'in_progress').length;
    const totalPlayers = sessions.reduce((sum, s) => sum + s.players.length, 0);

    return {
      totalActiveSessions: sessions.length,
      lobbyCount,
      inProgressCount,
      totalPlayers,
      activeCodes: Array.from(this.activeGameCodes)
    };
  }

  /**
   * Get session statistics
   * @returns {Object} - Statistics object
   */
  getStatistics() {
    const sessions = this.getAllActiveSessions();
    const lobbyCount = sessions.filter(s => s.status === 'lobby').length;
    const inProgressCount = sessions.filter(s => s.status === 'in_progress').length;
    const totalPlayers = sessions.reduce((sum, s) => sum + s.players.length, 0);

    return {
      totalActiveSessions: sessions.length,
      lobbyCount,
      inProgressCount,
      totalPlayers,
      activeCodes: Array.from(this.activeGameCodes)
    };
  }
}

module.exports = GameSessionManager;
