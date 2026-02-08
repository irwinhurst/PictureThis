/**
 * ---
 * title: Phase Operations
 * purpose: Handles game phase transitions and round management with validation.
 * exports: PhaseOperations - utility functions for phase/round management
 * dependencies: None
 * ---
 */

const VALID_PHASES = ['lobby', 'round_intro', 'card_selection', 'judge_phase', 'results', 'completed', 'round_1_selection'];
const VALID_STATUSES = ['lobby', 'in_progress', 'completed', 'inactive'];

const VALID_TRANSITIONS = {
  lobby: ['round_intro', 'round_1_selection'],
  round_intro: ['card_selection'],
  round_1_selection: ['judge_phase'],
  card_selection: ['judge_phase'],
  judge_phase: ['results'],
  results: ['round_intro', 'completed'],
  completed: []
};

/**
 * Update session phase with validation
 * @param {Object} session - GameSession object
 * @param {string} newPhase - New phase name
 * @param {function} emit - Event emitter function
 * @returns {Object} - Updated session
 * @throws {Error} - If transition is invalid
 */
function updatePhase(session, newPhase, emit) {
  if (!session) {
    throw new Error('Session not found');
  }

  if (!VALID_PHASES.includes(newPhase)) {
    throw new Error(`Invalid phase: ${newPhase}`);
  }

  const allowedTransitions = VALID_TRANSITIONS[session.currentPhase] || [];
  if (!allowedTransitions.includes(newPhase)) {
    throw new Error(`Cannot transition from ${session.currentPhase} to ${newPhase}`);
  }

  const oldPhase = session.currentPhase;
  session.currentPhase = newPhase;
  session.lastActivityAt = new Date().toISOString();

  if (emit) {
    emit('onPhaseChanged', session.code, oldPhase, newPhase);
  }

  return session;
}

/**
 * Update the current round number
 * @param {Object} session - GameSession object
 * @param {number} roundNumber - New round number
 * @returns {Object} - Updated session
 * @throws {Error} - If round is invalid
 */
function updateRound(session, roundNumber) {
  if (!session) {
    throw new Error('Session not found');
  }

  if (roundNumber < 0 || roundNumber > session.maxRounds) {
    throw new Error(`Invalid round: ${roundNumber}`);
  }

  session.currentRound = roundNumber;
  session.lastActivityAt = new Date().toISOString();

  return session;
}

/**
 * Update round content (sentence template and nouns)
 * @param {Object} session - GameSession object
 * @param {string} sentence - Sentence template with blanks
 * @param {Array<string>} nouns - Selected nouns
 * @returns {Object} - Updated session
 */
function updateRoundContent(session, sentence, nouns = []) {
  if (!session) {
    throw new Error('Session not found');
  }

  session.sentenceTemplate = sentence;
  session.selectedNouns = nouns;
  session.lastActivityAt = new Date().toISOString();

  return session;
}

/**
 * Update session status
 * @param {Object} session - GameSession object
 * @param {string} status - New status
 * @returns {Object} - Updated session
 * @throws {Error} - If status is invalid
 */
function updateStatus(session, status) {
  if (!session) {
    throw new Error('Session not found');
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  session.status = status;
  session.lastActivityAt = new Date().toISOString();

  return session;
}

/**
 * End a session (mark as completed)
 * @param {Object} session - GameSession object
 * @param {function} emit - Event emitter function
 * @returns {Object} - Updated session
 */
function endSession(session, emit) {
  if (!session) {
    throw new Error('Session not found');
  }

  session.status = 'completed';
  session.currentPhase = 'completed';
  session.lastActivityAt = new Date().toISOString();

  if (emit) {
    emit('onSessionEnded', session.code);
  }

  return session;
}

module.exports = {
  VALID_PHASES,
  VALID_STATUSES,
  VALID_TRANSITIONS,
  updatePhase,
  updateRound,
  updateRoundContent,
  updateStatus,
  endSession
};
