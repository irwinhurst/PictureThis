/**
 * ---
 * title: Session Module Index
 * purpose: Re-exports GameSessionManager and all session submodules for easy importing.
 * exports: GameSessionManager (default), SessionStore, PlayerOperations, PhaseOperations, SelectionOperations, TimeoutChecker
 * dependencies: All session submodules
 * ---
 */

const GameSessionManager = require('./GameSessionManager');
const SessionStore = require('./SessionStore');
const PlayerOperations = require('./PlayerOperations');
const PhaseOperations = require('./PhaseOperations');
const SelectionOperations = require('./SelectionOperations');
const TimeoutChecker = require('./TimeoutChecker');

module.exports = {
  GameSessionManager,
  SessionStore,
  PlayerOperations,
  PhaseOperations,
  SelectionOperations,
  TimeoutChecker,
  default: GameSessionManager
};
