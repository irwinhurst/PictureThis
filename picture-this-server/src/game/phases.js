/**
 * ---
 * title: Game Phase Constants
 * purpose: Defines game phase states, valid transitions between phases, and timeout
 *          configurations. Provides helper functions for phase flow validation.
 * exports: PHASES - Enum of all game phases
 *          VALID_TRANSITIONS - Map of allowed phase transitions
 *          PHASE_TIMEOUTS - Duration for each phase
 *          isValidTransition, getPhaseTimeout, getNextPhase - Helper functions
 * dependencies: None (constants module)
 * ---
 */

// Phase enum
const PHASES = {
  LOBBY: 'LOBBY',
  ROUND_SETUP: 'ROUND_SETUP',
  SELECTION: 'SELECTION',
  SELECTION_COMPLETE: 'SELECTION_COMPLETE',
  IMAGE_GEN: 'IMAGE_GEN',
  IMAGE_GEN_COMPLETE: 'IMAGE_GEN_COMPLETE',
  JUDGING: 'JUDGING',
  JUDGING_COMPLETE: 'JUDGING_COMPLETE',
  RESULTS: 'RESULTS',
  GAME_END: 'GAME_END'
};

// Valid phase transitions map
const VALID_TRANSITIONS = {
  [PHASES.LOBBY]: [PHASES.ROUND_SETUP, PHASES.GAME_END],
  [PHASES.ROUND_SETUP]: [PHASES.SELECTION],
  [PHASES.SELECTION]: [PHASES.SELECTION_COMPLETE],
  [PHASES.SELECTION_COMPLETE]: [PHASES.IMAGE_GEN],
  [PHASES.IMAGE_GEN]: [PHASES.IMAGE_GEN_COMPLETE],
  [PHASES.IMAGE_GEN_COMPLETE]: [PHASES.JUDGING, PHASES.RESULTS], // Allow skip to RESULTS for single-player
  [PHASES.JUDGING]: [PHASES.JUDGING_COMPLETE],
  [PHASES.JUDGING_COMPLETE]: [PHASES.RESULTS],
  [PHASES.RESULTS]: [PHASES.ROUND_SETUP, PHASES.GAME_END],
  [PHASES.GAME_END]: []
};

// Phase timeout configuration (in milliseconds)
const PHASE_TIMEOUTS = {
  [PHASES.LOBBY]: 0, // No timeout - manual start
  [PHASES.ROUND_SETUP]: 2000, // 2 seconds to setup round
  [PHASES.SELECTION]: 45000, // 45 seconds for players to select cards
  [PHASES.SELECTION_COMPLETE]: 1000, // 1 second transition
  [PHASES.IMAGE_GEN]: 5000, // 5 seconds display + 60s API timeout (handled separately)
  [PHASES.IMAGE_GEN_COMPLETE]: 500, // 500ms transition (quick move to next phase)
  [PHASES.JUDGING]: 0, // No timeout - judge makes decision, but could add fallback
  [PHASES.JUDGING_COMPLETE]: 1000, // 1 second transition
  [PHASES.RESULTS]: 8000, // 8 seconds to display results before auto-advancing
  [PHASES.GAME_END]: 0 // No timeout - game over
};

/**
 * Validates if a phase transition is allowed
 * @param {string} fromPhase - Current phase
 * @param {string} toPhase - Target phase
 * @returns {boolean} True if transition is valid
 */
function isValidTransition(fromPhase, toPhase) {
  const validNextPhases = VALID_TRANSITIONS[fromPhase];
  return validNextPhases && validNextPhases.includes(toPhase);
}

/**
 * Gets the timeout duration for a phase
 * @param {string} phase - Phase name
 * @returns {number} Timeout in milliseconds
 */
function getPhaseTimeout(phase) {
  return PHASE_TIMEOUTS[phase] || 0;
}

/**
 * Gets the next phase in the standard flow
 * @param {string} currentPhase - Current phase
 * @param {number} currentRound - Current round number
 * @param {number} maxRounds - Maximum rounds in game
 * @returns {string|null} Next phase or null if no standard next phase
 */
function getNextPhase(currentPhase, currentRound, maxRounds) {
  switch (currentPhase) {
    case PHASES.LOBBY:
      return PHASES.ROUND_SETUP;
    case PHASES.ROUND_SETUP:
      return PHASES.SELECTION;
    case PHASES.SELECTION:
      return PHASES.SELECTION_COMPLETE;
    case PHASES.SELECTION_COMPLETE:
      return PHASES.IMAGE_GEN;
    case PHASES.IMAGE_GEN:
      return PHASES.IMAGE_GEN_COMPLETE;
    case PHASES.IMAGE_GEN_COMPLETE:
      return PHASES.JUDGING;
    case PHASES.JUDGING:
      return PHASES.JUDGING_COMPLETE;
    case PHASES.JUDGING_COMPLETE:
      return PHASES.RESULTS;
    case PHASES.RESULTS:
      // Check if we should go to next round or end game
      return currentRound >= maxRounds ? PHASES.GAME_END : PHASES.ROUND_SETUP;
    case PHASES.GAME_END:
      return null; // Game is over
    default:
      return null;
  }
}

module.exports = {
  PHASES,
  VALID_TRANSITIONS,
  PHASE_TIMEOUTS,
  isValidTransition,
  getPhaseTimeout,
  getNextPhase
};
