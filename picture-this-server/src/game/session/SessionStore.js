/**
 * ---
 * title: Session Store
 * purpose: Core session storage with unique code generation and collision detection.
 *          Manages the Map-based storage of all game sessions.
 * exports: SessionStore class
 * dependencies: uuid (v4)
 * ---
 */

const { v4: uuidv4 } = require('uuid');

class SessionStore {
  constructor() {
    this.sessionMap = new Map(); // code -> GameSession
    this.activeGameCodes = new Set(); // For collision detection
  }

  /**
   * Generate a unique 6-character alphanumeric code with collision detection
   * @returns {string} - 6-character uppercase alphanumeric code
   * @throws {Error} - If unable to generate unique code after retries
   */
  generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const maxRetries = 10;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      if (!this.activeGameCodes.has(code)) {
        return code;
      }
    }
    
    throw new Error('Failed to generate unique code after ' + maxRetries + ' retries');
  }

  /**
   * Generate a new UUID for game ID
   * @returns {string} - UUID v4
   */
  generateGameId() {
    return uuidv4();
  }

  /**
   * Store a session
   * @param {string} code - 6-character game code
   * @param {Object} session - GameSession object
   */
  set(code, session) {
    this.sessionMap.set(code, session);
    this.activeGameCodes.add(code);
  }

  /**
   * Get a session by code (case-insensitive)
   * @param {string} code - 6-character game code
   * @returns {Object|null} - GameSession or null
   */
  get(code) {
    if (!code) return null;
    return this.sessionMap.get(code.toUpperCase()) || null;
  }

  /**
   * Get a session by gameId
   * @param {string} gameId - UUID of the game
   * @returns {Object|null} - GameSession or null
   */
  getByGameId(gameId) {
    for (const session of this.sessionMap.values()) {
      if (session.gameId === gameId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Delete a session
   * @param {string} code - 6-character game code
   * @returns {boolean} - True if deleted
   */
  delete(code) {
    this.activeGameCodes.delete(code);
    return this.sessionMap.delete(code);
  }

  /**
   * Check if code exists
   * @param {string} code - 6-character game code
   * @returns {boolean}
   */
  has(code) {
    return this.sessionMap.has(code);
  }

  /**
   * Get all sessions
   * @returns {Array<Object>} - Array of GameSession objects
   */
  getAll() {
    return Array.from(this.sessionMap.values());
  }

  /**
   * Get all active codes
   * @returns {Array<string>} - Array of active game codes
   */
  getActiveCodes() {
    return Array.from(this.activeGameCodes);
  }

  /**
   * Get session count
   * @returns {number}
   */
  get size() {
    return this.sessionMap.size;
  }

  /**
   * Iterate over sessions
   * @returns {Iterator}
   */
  entries() {
    return this.sessionMap.entries();
  }
}

module.exports = SessionStore;
