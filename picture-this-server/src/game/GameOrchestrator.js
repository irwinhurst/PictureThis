/**
 * ---
 * title: Game Orchestrator
 * purpose: Handles phase transitions and game flow orchestration. Executes phase-specific
 *          logic, manages round setup, card selections, judging, and scoring.
 * exports: GameOrchestrator - Class for orchestrating game flow
 * dependencies: phases.js, GameState.js, CardDeck.js, TimerManager
 * ---
 */

const { PHASES, isValidTransition, getPhaseTimeout, getNextPhase } = require('./phases');
const { 
  updateState, 
  selectNextJudge, 
  recordTransition,
  updatePlayer 
} = require('./GameState');
const CardDeck = require('./CardDeck');
const ImageGeneratorService = require('../services/ImageGeneratorService');

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
    
    // Initialize image generator service
    try {
      this.imageGenerator = new ImageGeneratorService({
        apiKey: process.env.OPENAI_API_KEY,
        serviceType: process.env.IMAGE_GENERATION_SERVICE || 'dalle3',
        timeout: parseInt(process.env.IMAGE_GENERATION_TIMEOUT || '60000', 10),
        maxConcurrent: parseInt(process.env.IMAGE_GENERATION_MAX_CONCURRENT || '2', 10)
      });
      logger.info('ImageGeneratorService initialized');
    } catch (error) {
      logger.warn('ImageGeneratorService initialization failed - image generation disabled', {
        error: error.message
      });
      this.imageGenerator = null;
    }
    
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
   * @returns {Promise<Object>} New state after advancement
   */
  async advancePhase(state, targetPhase = null, reason = '') {
    try {
      // Determine next phase
      let nextPhase = targetPhase;
      if (!nextPhase) {
        nextPhase = getNextPhase(state.currentPhase, state.currentRound, state.maxRounds);
        
        // In single-player mode, skip judging phase
        if (state.isSinglePlayer && nextPhase === PHASES.JUDGING) {
          nextPhase = PHASES.RESULTS;
          this.logger.info('Single-player mode: skipping JUDGING, going to RESULTS', { gameId: state.gameId });
        }
      }
      
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
      
      // Execute phase-specific logic (may be async for IMAGE_GEN phase)
      newState = await this._executePhaseLogic(newState, nextPhase);
      
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
   * @returns {Promise<Object>} Updated state
   * @private
   */
  async _executePhaseLogic(state, phase) {
    switch (phase) {
      case PHASES.ROUND_SETUP:
        return this._setupRound(state);
      
      case PHASES.SELECTION:
        return this._startSelection(state);
      
      case PHASES.SELECTION_COMPLETE:
        return this._completeSelection(state);
      
      case PHASES.IMAGE_GEN:
        return await this._startImageGen(state);
      
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
    
    // Check if single-player mode
    const isSinglePlayer = state.players.length === 1;
    
    // Select next judge (skip if single player)
    const nextJudgeId = isSinglePlayer ? null : selectNextJudge(state);
    
    // Update all players' judge status
    let newState = updateState(state, {
      currentRound: newRound,
      judgeId: nextJudgeId,
      playerSelections: {},
      judgeSelection: null,
      audienceVotes: {},
      status: 'in_progress',
      isSinglePlayer: isSinglePlayer
    });
    
    // Mark the judge (skip if single player)
    if (!isSinglePlayer) {
      newState = {
        ...newState,
        players: newState.players.map(p => ({
          ...p,
          isJudge: p.id === nextJudgeId,
          judgeCount: p.id === nextJudgeId ? p.judgeCount + 1 : p.judgeCount
        }))
      };
    }
    
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
      template: template.template,
      isSinglePlayer: isSinglePlayer
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
   * @returns {Promise<Object>} Updated state
   * @private
   */
  async _startImageGen(state) {
    const startTime = Date.now();
    const selectionCount = Object.keys(state.playerSelections).length;
    
    this.logger.info('Image generation started', {
      gameId: state.gameId,
      code: state.code,
      round: state.currentRound,
      selectionsCount: selectionCount,
      sentenceTemplate: state.sentenceTemplate,
      isSinglePlayer: state.isSinglePlayer,
      startTime
    });
    
    // If image generator not available, skip to next phase
    if (!this.imageGenerator) {
      this.logger.warn('Image generator not available, skipping image generation', {
        gameId: state.gameId,
        code: state.code
      });
      return updateState(state, {
        generatedImages: {}
      });
    }
    
    try {
      // Broadcast "generating images" status to all clients
      if (this.broadcastCallback) {
        this.broadcastCallback('image_generation_started', {
          gameId: state.gameId,
          code: state.code,
          totalPlayers: selectionCount,
          round: state.currentRound
        });
      }
      
      this.logger.debug('Calling imageGenerator.generateImagesForRound', {
        gameId: state.gameId,
        code: state.code,
        playerCount: selectionCount
      });
      
      // Generate images for all players
      const generatedImages = await this.imageGenerator.generateImagesForRound(state);
      
      const elapsedMs = Date.now() - startTime;
      const placeholderCount = generatedImages.filter(i => i.isPlaceholder).length;
      const successCount = generatedImages.length - placeholderCount;
      
      // Convert array to object keyed by playerId
      const imagesMap = {};
      generatedImages.forEach((img, index) => {
        this.logger.debug('Processing generated image result', {
          gameId: state.gameId,
          playerId: img.playerId,
          index: index + 1,
          total: generatedImages.length,
          isPlaceholder: img.isPlaceholder,
          imagePath: img.imagePath,
          error: img.error
        });
        
        imagesMap[img.playerId] = {
          imageUrl: img.imageUrl,
          imagePath: img.imagePath,
          completedSentence: img.completedSentence,
          artStyle: img.artStyle,
          generatedAt: img.generatedAt,
          isPlaceholder: img.isPlaceholder || false
        };
      });
      
      this.logger.info('Image generation complete', {
        gameId: state.gameId,
        code: state.code,
        round: state.currentRound,
        totalGenerated: generatedImages.length,
        successCount,
        placeholders: placeholderCount,
        elapsedMs,
        averageTimePerImage: Math.round(elapsedMs / generatedImages.length) + 'ms'
      });
      
      // Warn if there were any placeholders
      if (placeholderCount > 0) {
        this.logger.warn('Some images generated as placeholders', {
          gameId: state.gameId,
          code: state.code,
          placeholderCount,
          successCount,
          details: generatedImages.map(img => ({
            playerId: img.playerId,
            isPlaceholder: img.isPlaceholder,
            error: img.error
          }))
        });
      }
      
      // Update state with generated images
      return updateState(state, {
        generatedImages: imagesMap
      });
      
    } catch (error) {
      const elapsedMs = Date.now() - startTime;
      
      this.logger.error('Image generation failed with exception', {
        gameId: state.gameId,
        code: state.code,
        round: state.currentRound,
        error: error.message,
        stack: error.stack,
        elapsedMs
      });
      
      // Return state with empty images on error
      return updateState(state, {
        generatedImages: {},
        imageGenerationError: error.message
      });
    }
  }

  /**
   * Completes image generation phase
   * @param {Object} state - Current state
   * @returns {Object} Updated state
   * @private
   */
  _completeImageGen(state) {
    this.logger.info('Image generation complete', {
      gameId: state.gameId,
      imagesGenerated: Object.keys(state.generatedImages || {}).length,
      isSinglePlayer: state.isSinglePlayer
    });
    
    // In single-player mode, auto-select the player as winner
    let newState = state;
    if (state.isSinglePlayer && state.players.length === 1) {
      const singlePlayerId = state.players[0].id;
      
      this.logger.info('Single-player mode: auto-assigning first place', {
        gameId: state.gameId,
        winnerId: singlePlayerId
      });
      
      newState = updateState(state, {
        judgeSelection: {
          firstPlace: singlePlayerId,
          secondPlace: null
        }
      });
    }
    
    // Broadcast generated images to all clients (judge and display)
    if (this.broadcastCallback) {
      this.broadcastCallback('images_ready', {
        gameId: newState.gameId,
        code: newState.code,
        images: newState.generatedImages,
        round: newState.currentRound,
        isSinglePlayer: newState.isSinglePlayer,
        judgeSelection: newState.judgeSelection
      });
    }
    
    return newState;
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
          timestamp: Date.now(),
          isSinglePlayer: state.isSinglePlayer
        }
      });
    }
    
    this.logger.info('Results displayed', {
      gameId: state.gameId,
      round: state.currentRound,
      isSinglePlayer: state.isSinglePlayer,
      winners: state.judgeSelection
    });
    
    // Broadcast results to all clients
    if (this.broadcastCallback) {
      this.broadcastCallback('results_ready', {
        gameId: newState.gameId,
        code: newState.code,
        round: newState.currentRound,
        isSinglePlayer: newState.isSinglePlayer,
        results: newState.lastRoundResults,
        images: newState.generatedImages,
        players: newState.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score
        }))
      });
    }
    
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
    
    if (state.players.length < 1) {
      throw new Error('Need at least 1 player to start game');
    }
    
    this.logger.info('Starting game', {
      gameId: state.gameId,
      playerCount: state.players.length,
      isSinglePlayer: state.players.length === 1
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
