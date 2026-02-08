/**
 * ---
 * title: Game Session Manager (Re-export)
 * purpose: Re-exports the modular GameSessionManager from src/game/session/ for backward
 *          compatibility. All existing imports will continue to work unchanged.
 * exports: GameSessionManager class (from session/GameSessionManager.js)
 * dependencies: session/GameSessionManager
 * ---
 */

// Re-export the refactored modular GameSessionManager
module.exports = require('./session/GameSessionManager');
