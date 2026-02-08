/**
 * Game State Management
 * Story 1.2: Game State Management & Round Orchestration
 * 
 * Manages the complete game state with immutable updates
 */

const { PHASES } = require('./phases');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates a new player object
 * @param {Object} options - Player options
 * @returns {Object} Player object
 */
function createPlayer(options = {}) {
  return {
    id: options.id || uuidv4(),
    socketId: options.socketId || null,
    name: options.name || 'Anonymous',
    avatar: options.avatar || '🎮',
    score: 0,
    hand: options.hand || [],
    isJudge: false,
    judgeCount: 0,
    isHost: options.isHost || false,
    connectedAt: Date.now()
  };
}

/**
 * Creates initial game state
 * @param {Object} options - Game configuration
 * @returns {Object} Game state object
 */
function createGameState(options = {}) {
  return {
    // Game metadata
    gameId: options.gameId || uuidv4(),
    code: options.code || generateGameCode(),
    hostId: options.hostId || null,
    status: 'lobby', // lobby|in_progress|completed
    
    // Configuration
    maxRounds: options.maxRounds || 5,
    maxPlayers: options.maxPlayers || 8,
    currentRound: 0,
    
    // Participants
    players: options.players || [],
    
    // Current round state
    currentPhase: PHASES.LOBBY,
    judgeId: null,
    sentenceTemplate: null,
    blankCount: 0,
    
    // Player selections for current round
    playerSelections: {}, // { playerId: [card1, card2, ...] }
    
    // Judging results
    judgeSelection: null, // { firstPlace: playerId, secondPlace: playerId }
    audienceVotes: {}, // { playerId: votedPlayerId }
    
    // Timers
    phaseStartTime: Date.now(),
    phaseTimeoutMs: 0,
    
    // Results from last round
    lastRoundResults: null,
    
    // Metadata
    createdAt: Date.now(),
    updatedAt: Date.now(),
    
    // Transition history for debugging
    transitionHistory: []
  };
}

/**
 * Generates a random 4-character game code
 * @returns {string} Game code
 */
function generateGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Updates game state immutably
 * @param {Object} state - Current state
 * @param {Object} updates - Updates to apply
 * @returns {Object} New state object
 */
function updateState(state, updates) {
  return {
    ...state,
    ...updates,
    updatedAt: Date.now()
  };
}

/**
 * Adds a player to the game
 * @param {Object} state - Current state
 * @param {Object} playerOptions - Player options
 * @returns {Object} New state with player added
 */
function addPlayer(state, playerOptions) {
  const player = createPlayer(playerOptions);
  
  // Check if player limit reached
  if (state.players.length >= state.maxPlayers) {
    throw new Error('Game is full');
  }
  
  // Check if already in game (by socketId)
  if (playerOptions.socketId && state.players.some(p => p.socketId === playerOptions.socketId)) {
    throw new Error('Player already in game');
  }
  
  return updateState(state, {
    players: [...state.players, player]
  });
}

/**
 * Removes a player from the game
 * @param {Object} state - Current state
 * @param {string} playerId - Player ID to remove
 * @returns {Object} New state with player removed
 */
function removePlayer(state, playerId) {
  return updateState(state, {
    players: state.players.filter(p => p.id !== playerId)
  });
}

/**
 * Updates a player in the game
 * @param {Object} state - Current state
 * @param {string} playerId - Player ID
 * @param {Object} updates - Updates to apply to player
 * @returns {Object} New state with player updated
 */
function updatePlayer(state, playerId, updates) {
  return updateState(state, {
    players: state.players.map(p => 
      p.id === playerId ? { ...p, ...updates } : p
    )
  });
}

/**
 * Gets a player by ID
 * @param {Object} state - Current state
 * @param {string} playerId - Player ID
 * @returns {Object|null} Player object or null
 */
function getPlayer(state, playerId) {
  return state.players.find(p => p.id === playerId) || null;
}

/**
 * Gets a player by socket ID
 * @param {Object} state - Current state
 * @param {string} socketId - Socket ID
 * @returns {Object|null} Player object or null
 */
function getPlayerBySocketId(state, socketId) {
  return state.players.find(p => p.socketId === socketId) || null;
}

/**
 * Selects the next judge (round-robin)
 * @param {Object} state - Current state
 * @returns {string|null} Next judge player ID
 */
function selectNextJudge(state) {
  if (state.players.length === 0) {
    return null;
  }
  
  // Find current judge index
  let currentIndex = -1;
  if (state.judgeId) {
    currentIndex = state.players.findIndex(p => p.id === state.judgeId);
  }
  
  // Get next judge (round-robin)
  const nextIndex = (currentIndex + 1) % state.players.length;
  return state.players[nextIndex].id;
}

/**
 * Records a phase transition in history
 * @param {Object} state - Current state
 * @param {string} toPhase - Target phase
 * @param {string} reason - Reason for transition
 * @returns {Object} New state with transition recorded
 */
function recordTransition(state, toPhase, reason = '') {
  const transition = {
    timestamp: Date.now(),
    fromPhase: state.currentPhase,
    toPhase,
    reason,
    round: state.currentRound
  };
  
  // Keep only last 20 transitions
  const history = [...state.transitionHistory, transition].slice(-20);
  
  return {
    ...state,
    transitionHistory: history
  };
}

/**
 * Resets game state for a new game
 * @param {Object} state - Current state
 * @param {Object} options - Optional configuration updates
 * @returns {Object} Reset state
 */
function resetGame(state, options = {}) {
  return {
    ...createGameState({
      gameId: state.gameId,
      code: state.code,
      hostId: state.hostId,
      maxRounds: options.maxRounds || state.maxRounds,
      maxPlayers: options.maxPlayers || state.maxPlayers,
      players: state.players.map(p => ({
        ...p,
        score: 0,
        hand: [],
        isJudge: false,
        judgeCount: 0
      }))
    }),
    createdAt: state.createdAt // Preserve original creation time
  };
}

/**
 * Exports game state for debugging
 * @param {Object} state - Current state
 * @returns {Object} Serializable state snapshot
 */
function exportState(state) {
  return {
    ...state,
    // Add any computed properties
    playerCount: state.players.length,
    submissionCount: Object.keys(state.playerSelections).length,
    isRoundActive: state.status === 'in_progress',
    currentJudgeName: state.judgeId ? getPlayer(state, state.judgeId)?.name : null
  };
}

module.exports = {
  createGameState,
  createPlayer,
  updateState,
  addPlayer,
  removePlayer,
  updatePlayer,
  getPlayer,
  getPlayerBySocketId,
  selectNextJudge,
  recordTransition,
  resetGame,
  exportState,
  generateGameCode
};
