/**
 * Game Orchestrator
 * Story 1.2: Game State Management & Round Orchestration
 * 
 * Handles phase transitions and game flow orchestration
 */

const { PHASES, isValidTransition, getPhaseTimeout, getNextPhase } = require('./phases');
const { 
  updateState, 
  selectNextJudge, 
  recordTransition,
  updatePlayer 
} = require('./GameState');
const CardDeck = require('./CardDeck');

class GameOrchestrator {
  /**
   * Creates a new game orchestrator
   * @param {Object} logger - Winston logger instance
   * @param {TimerManager} timerManager - Timer manager instance
   * @param {Function} broadcastCallback - Callback to broadcast state updates
   */
  constructor(logger, timerManager, broadcastCallback) {
    this.logger = logger;
    this.timerManager = timerManager;
    this.broadcastCallback = broadcastCallback;
    
    // Default noun cards for deck (will be loaded from DB in Story 2.3)
    this.defaultCards = [
      'unicorn', 'dragon', 'pizza', 'rocket', 'robot', 'dinosaur',
      'rainbow', 'ninja', 'pirate', 'wizard', 'zombie', 'vampire',
      'alien', 'ghost', 'monster', 'superhero', 'princess', 'knight',
      'astronaut', 'detective', 'cowboy', 'mermaid', 'fairy', 'witch',
      'banana', 'kitten', 'puppy', 'elephant', 'giraffe', 'penguin',
      'spaceship', 'castle', 'treasure', 'sword', 'crown', 'wand',
      'potion', 'crystal', 'portal', 'time machine', 'laser', 'jetpack',
      'volcano', 'beach', 'mountain', 'forest', 'desert', 'ocean',
      'thunder', 'lightning', 'tornado', 'earthquake', 'meteor', 'comet',
      'chocolate', 'cupcake', 'donut', 'ice cream', 'candy', 'cookie'
    ];
    
    // Sentence templates for rounds
    this.sentenceTemplates = [
      { template: 'A wild ___ appeared!', blanks: 1 },
      { template: '___ meets ___ in an epic battle!', blanks: 2 },
      { template: 'The legendary ___ of destiny.', blanks: 1 },
      { template: '___ discovers a secret ___ in the attic.', blanks: 2 },
      { template: 'Once upon a time, there was a ___.', blanks: 1 },
      { template: '___ and ___ go on an adventure.', blanks: 2 },
      { template: 'The mysterious case of the stolen ___.', blanks: 1 },
      { template: 'A ___ walks into a bar with a ___.', blanks: 2 },
      { template: 'The amazing ___ show!', blanks: 1 },
      { template: '___ vs ___ - the ultimate showdown!', blanks: 2 }
    ];
  }

  /**
   * Advances game to next phase
   * @param {Object} state - Current game state
   * @param {string} targetPhase - Optional target phase (if not specified, uses automatic flow)
   * @param {string} reason - Reason for advancement
   * @returns {Object} New state after advancement
   */
  advancePhase(state, targetPhase = null, reason = '') {
    try {
      // Determine next phase
      const nextPhase = targetPhase || getNextPhase(state.currentPhase, state.currentRound, state.maxRounds);
      
      if (!nextPhase) {
        this.logger.warn('No next phase available', { 
          currentPhase: state.currentPhase, 
          round: state.currentRound 
        });
        return state;
      }
      
      // Validate transition
      if (!isValidTransition(state.currentPhase, nextPhase)) {
        this.logger.error('Invalid phase transition attempted', {
          from: state.currentPhase,
          to: nextPhase
        });
        throw new Error(`Invalid transition from ${state.currentPhase} to ${nextPhase}`);
      }
      
      // Check if already in target phase (prevent duplicate transitions)
      if (state.currentPhase === nextPhase) {
        this.logger.debug('Already in target phase, skipping transition', { phase: nextPhase });
        return state;
      }
      
      this.logger.info('Phase transition', {
        gameId: state.gameId,
        from: state.currentPhase,
        to: nextPhase,
        reason: reason || 'automatic'
      });
      
      // Record transition
      let newState = recordTransition(state, nextPhase, reason);
      
      // Execute phase-specific logic
      newState = this._executePhaseLogic(newState, nextPhase);
      
      // Update phase
      newState = updateState(newState, {
        currentPhase: nextPhase,
        phaseStartTime: Date.now(),
        phaseTimeoutMs: getPhaseTimeout(nextPhase)
      });
      
      // Schedule next automatic transition if timeout exists
      const timeout = getPhaseTimeout(nextPhase);
      if (timeout > 0) {
        this.timerManager.schedulePhaseTimeout(state.gameId, timeout, () => {
          this.logger.debug('Phase timeout triggered', { 
            gameId: state.gameId, 
            phase: nextPhase 
          });
          // Phase timeout callback will be handled by game manager
          if (this.broadcastCallback) {
            this.broadcastCallback('phase_timeout', { gameId: state.gameId });
          }
        });
      }
      
      // Broadcast state update
      if (this.broadcastCallback) {
        this.broadcastCallback('phase_change', newState);
      }
      
      return newState;
      
    } catch (error) {
      this.logger.error('Phase advancement error', {
        gameId: state.gameId,
        currentPhase: state.currentPhase,
        targetPhase,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Executes phase-specific logic
   * @param {Object} state - Current state
   * @param {string} phase - Phase to execute logic for
   * @returns {Object} Updated state
   * @private
   */
  _executePhaseLogic(state, phase) {
    switch (phase) {
      case PHASES.ROUND_SETUP:
        return this._setupRound(state);
      
      case PHASES.SELECTION:
        return this._startSelection(state);
      
      case PHASES.SELECTION_COMPLETE:
        return this._completeSelection(state);
      
      case PHASES.IMAGE_GEN:
        return this._startImageGen(state);
      
      case PHASES.IMAGE_GEN_COMPLETE:
        return this._completeImageGen(state);
      
      case PHASES.JUDGING:
        return this._startJudging(state);
      
      case PHASES.JUDGING_COMPLETE:
        return this._completeJudging(state);
      
      case PHASES.RESULTS:
        return this._showResults(state);
      
      case PHASES.GAME_END:
        return this._endGame(state);
      
      default:
        return state;
    }
  }

  /**
   * Sets up a new round
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _setupRound(state) {
    // Increment round
    const newRound = state.currentRound + 1;
    
    // Select next judge
    const nextJudgeId = selectNextJudge(state);
    
    // Update all players' judge status
    let newState = updateState(state, {
      currentRound: newRound,
      judgeId: nextJudgeId,
      playerSelections: {},
      judgeSelection: null,
      audienceVotes: {},
      status: 'in_progress'
    });
    
    // Mark the judge
    newState = {
      ...newState,
      players: newState.players.map(p => ({
        ...p,
        isJudge: p.id === nextJudgeId,
        judgeCount: p.id === nextJudgeId ? p.judgeCount + 1 : p.judgeCount
      }))
    };
    
    // Select random sentence template
    const template = this.sentenceTemplates[
      Math.floor(Math.random() * this.sentenceTemplates.length)
    ];
    
    newState = updateState(newState, {
      sentenceTemplate: template.template,
      blankCount: template.blanks
    });
    
    // Initialize card deck if first round
    if (newRound === 1) {
      const deck = new CardDeck(this.defaultCards);
      const hands = deck.deal(newState.players.length, 8);
      
      newState = {
        ...newState,
        players: newState.players.map((p, idx) => ({
          ...p,
          hand: hands[idx] || []
        })),
        _deck: deck // Store deck instance (not serialized in state export)
      };
    }
    
    this.logger.info('Round setup complete', {
      round: newRound,
      judgeId: nextJudgeId,
      template: template.template
    });
    
    return newState;
  }

  /**
   * Starts the selection phase
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _startSelection(state) {
    this.logger.info('Selection phase started', {
      gameId: state.gameId,
      round: state.currentRound,
      judgeId: state.judgeId
    });
    
    return state;
  }

  /**
   * Completes the selection phase
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _completeSelection(state) {
    this.logger.info('Selection phase complete', {
      gameId: state.gameId,
      submissionCount: Object.keys(state.playerSelections).length
    });
    
    return state;
  }

  /**
   * Starts image generation phase
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _startImageGen(state) {
    this.logger.info('Image generation started', {
      gameId: state.gameId,
      selectionsCount: Object.keys(state.playerSelections).length
    });
    
    // Image generation will be triggered here in future stories
    // For now, just a placeholder
    
    return state;
  }

  /**
   * Completes image generation phase
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _completeImageGen(state) {
    this.logger.info('Image generation complete', {
      gameId: state.gameId
    });
    
    return state;
  }

  /**
   * Starts judging phase
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _startJudging(state) {
    this.logger.info('Judging phase started', {
      gameId: state.gameId,
      judgeId: state.judgeId
    });
    
    return state;
  }

  /**
   * Completes judging phase
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _completeJudging(state) {
    this.logger.info('Judging complete', {
      gameId: state.gameId,
      judgeSelection: state.judgeSelection
    });
    
    return state;
  }

  /**
   * Shows round results
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _showResults(state) {
    // Calculate and award points based on judging
    let newState = state;
    
    if (state.judgeSelection) {
      const { firstPlace, secondPlace } = state.judgeSelection;
      
      // Award points: 3 for first, 1 for second
      if (firstPlace) {
        const player = state.players.find(p => p.id === firstPlace);
        if (player) {
          newState = updatePlayer(newState, firstPlace, {
            score: player.score + 3
          });
        }
      }
      
      if (secondPlace) {
        const player = state.players.find(p => p.id === secondPlace);
        if (player) {
          newState = updatePlayer(newState, secondPlace, {
            score: player.score + 1
          });
        }
      }
      
      // Store results
      newState = updateState(newState, {
        lastRoundResults: {
          round: state.currentRound,
          firstPlace,
          secondPlace,
          timestamp: Date.now()
        }
      });
    }
    
    this.logger.info('Results displayed', {
      gameId: state.gameId,
      round: state.currentRound
    });
    
    return newState;
  }

  /**
   * Ends the game
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _endGame(state) {
    this.logger.info('Game ended', {
      gameId: state.gameId,
      totalRounds: state.currentRound,
      playerCount: state.players.length
    });
    
    // Cancel any active timers
    this.timerManager.cancelTimer(state.gameId);
    
    // Sort players by score for final leaderboard
    const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
    
    return updateState(state, {
      status: 'completed',
      players: sortedPlayers
    });
  }

  /**
   * Starts the game (transitions from LOBBY to first round)
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   */
  startGame(state) {
    if (state.currentPhase !== PHASES.LOBBY) {
      throw new Error('Game can only be started from LOBBY phase');
    }
    
    if (state.players.length < 3) {
      throw new Error('Need at least 3 players to start game');
    }
    
    this.logger.info('Starting game', {
      gameId: state.gameId,
      playerCount: state.players.length
    });
    
    return this.advancePhase(state, PHASES.ROUND_SETUP, 'game_started');
  }

  /**
   * Handles player card selection
   * @param {Object} state - Current state
   * @param {string} playerId - Player ID
   * @param {Array<string>} cards - Selected cards
   * @returns {Object} Updated state
   */
  submitSelection(state, playerId, cards) {
    // Validate phase
    if (state.currentPhase !== PHASES.SELECTION) {
      throw new Error('Selections can only be submitted during SELECTION phase');
    }
    
    // Validate player exists
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    
    // Validate judge is not submitting
    if (playerId === state.judgeId) {
      throw new Error('Judge cannot submit selections');
    }
    
    // Validate card count matches blank count
    if (cards.length !== state.blankCount) {
      throw new Error(`Must select exactly ${state.blankCount} card(s)`);
    }
    
    // Validate no duplicate cards in selection
    const uniqueCards = new Set(cards);
    if (uniqueCards.size !== cards.length) {
      throw new Error('Cannot select duplicate cards');
    }
    
    // Validate all cards are in player's hand
    for (const card of cards) {
      if (!player.hand.includes(card)) {
        throw new Error(`Card "${card}" not in player's hand`);
      }
    }
    
    this.logger.info('Player submitted selection', {
      gameId: state.gameId,
      playerId,
      cardCount: cards.length
    });
    
    // Update selections
    const newState = updateState(state, {
      playerSelections: {
        ...state.playerSelections,
        [playerId]: cards
      }
    });
    
    // Check if all non-judge players have submitted
    const nonJudgePlayers = state.players.filter(p => p.id !== state.judgeId);
    const submissionCount = Object.keys(newState.playerSelections).length;
    
    if (submissionCount >= nonJudgePlayers.length) {
      // All players submitted - auto-advance
      this.logger.info('All players submitted, advancing to next phase');
      return this.advancePhase(newState, null, 'all_players_submitted');
    }
    
    return newState;
  }

  /**
   * Handles judge selection
   * @param {Object} state - Current state
   * @param {string} judgeId - Judge player ID
   * @param {Object} selection - { firstPlace, secondPlace }
   * @returns {Object} Updated state
   */
  submitJudgeSelection(state, judgeId, selection) {
    // Validate phase
    if (state.currentPhase !== PHASES.JUDGING) {
      throw new Error('Judge selection can only be submitted during JUDGING phase');
    }
    
    // Validate judge
    if (judgeId !== state.judgeId) {
      throw new Error('Only the current judge can submit selection');
    }
    
    // Validate selection format
    if (!selection.firstPlace || !selection.secondPlace) {
      throw new Error('Must select both first and second place');
    }
    
    if (selection.firstPlace === selection.secondPlace) {
      throw new Error('First and second place must be different');
    }
    
    this.logger.info('Judge submitted selection', {
      gameId: state.gameId,
      judgeId,
      firstPlace: selection.firstPlace,
      secondPlace: selection.secondPlace
    });
    
    // Update judge selection
    const newState = updateState(state, {
      judgeSelection: selection
    });
    
    // Auto-advance to results
    return this.advancePhase(newState, null, 'judge_selected');
  }
}

module.exports = GameOrchestrator;
