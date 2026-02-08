/**
 * ---
 * title: Selection Operations
 * purpose: Handles player card selection recording and retrieval for game rounds.
 * exports: SelectionOperations - utility functions for card selection management
 * dependencies: None
 * ---
 */

const PlayerOperations = require('./PlayerOperations');

/**
 * Record a player's card selections for the current round
 * @param {Object} session - GameSession object
 * @param {string} playerId - UUID of the player
 * @param {Object} selections - Map of { blankIndex: cardIndex }
 * @param {function} emit - Event emitter function
 * @returns {Object} - Updated session
 * @throws {Error} - If validation fails
 */
function recordSelection(session, playerId, selections, emit) {
  if (!session) {
    throw new Error('Session not found');
  }

  // Validate player is in game
  const player = PlayerOperations.findPlayer(session, playerId);
  if (!player) {
    throw new Error('Player not found in session');
  }

  // Validate judge can't submit selections
  if (PlayerOperations.isJudge(session, playerId)) {
    throw new Error('Judge cannot submit card selections');
  }

  // Validate selections format
  if (!selections || typeof selections !== 'object') {
    throw new Error('Invalid selections format');
  }

  // Ensure playerSelections object exists
  if (!session.playerSelections) {
    session.playerSelections = {};
  }

  // Store selections
  session.playerSelections[playerId] = {
    selections: selections,
    submittedAt: Date.now()
  };

  session.lastActivityAt = Date.now();

  // Emit event
  if (emit) {
    emit('onPlayerSelectionSubmitted', session.gameId, playerId, selections);
  }

  return session;
}

/**
 * Get all player selections for the current round
 * @param {Object} session - GameSession object
 * @returns {Object|null} - Map of { playerId: selections }
 */
function getAllSelections(session) {
  if (!session) return null;
  return session.playerSelections || {};
}

/**
 * Get selection for a specific player
 * @param {Object} session - GameSession object
 * @param {string} playerId - UUID of the player
 * @returns {Object|null} - Player's selections or null
 */
function getPlayerSelection(session, playerId) {
  if (!session || !session.playerSelections) return null;
  return session.playerSelections[playerId] || null;
}

/**
 * Check if player has submitted selections
 * @param {Object} session - GameSession object
 * @param {string} playerId - UUID of the player
 * @returns {boolean}
 */
function hasSubmitted(session, playerId) {
  return getPlayerSelection(session, playerId) !== null;
}

/**
 * Get count of players who have submitted
 * @param {Object} session - GameSession object
 * @returns {number}
 */
function getSubmissionCount(session) {
  if (!session || !session.playerSelections) return 0;
  return Object.keys(session.playerSelections).length;
}

/**
 * Clear all selections (for new round)
 * @param {Object} session - GameSession object
 * @returns {Object} - Updated session
 */
function clearSelections(session) {
  if (session) {
    session.playerSelections = {};
  }
  return session;
}

module.exports = {
  recordSelection,
  getAllSelections,
  getPlayerSelection,
  hasSubmitted,
  getSubmissionCount,
  clearSelections
};
