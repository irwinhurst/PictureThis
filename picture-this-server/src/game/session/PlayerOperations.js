/**
 * ---
 * title: Player Operations
 * purpose: Handles player join, leave, and management operations for game sessions.
 * exports: PlayerOperations - utility functions for player management
 * dependencies: None
 * ---
 */

/**
 * Add a player to a session
 * @param {Object} session - GameSession object
 * @param {Object} player - Player data {playerId, name, avatar}
 * @param {function} emit - Event emitter function
 * @returns {Object} - Updated session
 * @throws {Error} - If validation fails
 */
function joinSession(session, player, emit) {
  if (!session) {
    throw new Error('Session not found');
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
  const now = Date.now();
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
  if (emit) {
    emit('onPlayerJoined', session.code, player.playerId, session.players.length);
  }

  return session;
}

/**
 * Remove a player from a session
 * @param {Object} session - GameSession object
 * @param {string} playerId - UUID of player to remove
 * @param {function} emit - Event emitter function
 * @returns {Object} - Updated session
 * @throws {Error} - If player not found
 */
function removePlayer(session, playerId, emit) {
  if (!session) {
    throw new Error('Session not found');
  }

  const playerIndex = session.players.findIndex(p => p.playerId === playerId);
  if (playerIndex === -1) {
    throw new Error(`Player not found: ${playerId}`);
  }

  const isHost = session.players[playerIndex].isHost;
  session.players.splice(playerIndex, 1);

  // Update activity
  session.lastActivityAt = Date.now();

  // If host leaves, emit event
  if (isHost && emit) {
    emit('onHostDisconnected', session.code);
  }

  // Emit player left event
  if (emit) {
    emit('onPlayerLeft', session.code, playerId, session.players.length);
  }

  return session;
}

/**
 * Find a player in a session
 * @param {Object} session - GameSession object
 * @param {string} playerId - UUID of player
 * @returns {Object|null} - Player object or null
 */
function findPlayer(session, playerId) {
  if (!session || !session.players) return null;
  return session.players.find(p => p.playerId === playerId) || null;
}

/**
 * Check if player is the judge
 * @param {Object} session - GameSession object
 * @param {string} playerId - UUID of player
 * @returns {boolean}
 */
function isJudge(session, playerId) {
  return session && session.judgeId === playerId;
}

/**
 * Get player count
 * @param {Object} session - GameSession object
 * @returns {number}
 */
function getPlayerCount(session) {
  return session?.players?.length || 0;
}

module.exports = {
  joinSession,
  removePlayer,
  findPlayer,
  isJudge,
  getPlayerCount
};
