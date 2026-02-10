/**
 * ---
 * title: Game API Routes
 * purpose: Handles REST API endpoints for game operations including
 *          game creation, starting games, and submitting card selections.
 *          Manages game flow from lobby through gameplay phases.
 * exports: function(app, deps) - Route registration function
 * dependencies: gameManager, sessionManager, auth, io, logger
 * ---
 */

const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const auth = require('../../auth');
const ImageGeneratorService = require('../services/ImageGeneratorService');
const PromptFormatter = require('../utils/promptFormatter');

module.exports = function(app, { gameManager, sessionManager, auth, io, logger }) {

  // Create game endpoint (Story 1.6: Host Create Game Session)
  app.post('/api/game/create-session', auth.requireAuth, (req, res) => {
    try {
      const { maxRounds, maxPlayers } = req.body;
      const hostId = req.user.id;
      
      // Validation
      const maxPlayersVal = parseInt(maxPlayers) || 8;
      const maxRoundsVal = parseInt(maxRounds) || 10;
      
      if (maxPlayersVal < 1 || maxPlayersVal > 20) {
        return res.status(400).json({
          success: false,
          error: 'Max players must be between 1 and 20'
        });
      }
      
      if (maxRoundsVal < 1 || maxRoundsVal > 20) {
        return res.status(400).json({
          success: false,
          error: 'Max rounds must be between 1 and 20'
        });
      }
      
      // Create session with GameSessionManager
      const session = sessionManager.createSession(hostId, maxRoundsVal, maxPlayersVal);
      
      logger.info('Game session created', { 
        code: session.code,
        gameId: session.gameId,
        hostId,
        maxPlayers: maxPlayersVal,
        maxRounds: maxRoundsVal
      });
      
      res.json({
        success: true,
        gameId: session.gameId,
        code: session.code,
        hostId: session.hostId,
        maxPlayers: maxPlayersVal,
        maxRounds: maxRoundsVal,
        status: session.status,
        createdAt: session.createdAt,
        settings: {
          maxPlayers: maxPlayersVal,
          maxRounds: maxRoundsVal
        }
      });
    } catch (error) {
      logger.error('Error creating game session', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Story 3.0: Start Game - transition from lobby to round 1
  app.post('/api/game/:code/start', auth.requireAuth, (req, res) => {
    try {
      const { code } = req.params;
      const hostId = req.user.id;

      // Get the session
      const session = sessionManager.getSessionByCode(code);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Game session not found'
        });
      }

      // Verify the requester is the host
      if (session.hostId !== hostId) {
        return res.status(403).json({
          success: false,
          error: 'Only the host can start the game'
        });
      }

      // Validate at least 1 player (single-player mode supported)
      if (!session.players || session.players.length < 1) {
        return res.status(400).json({
          success: false,
          error: `Not enough players to start game (need at least 1, have ${session.players.length})`
        });
      }

      // Default sentence templates (Story 1.3 would load from database)
      let sentenceTemplates = [];
      try {
        const sentenceDataPath = path.join(__dirname, '../..', 'data', 'sentence-cards.json');
        const sentenceData = JSON.parse(fs.readFileSync(sentenceDataPath, 'utf8'));
        if (sentenceData && sentenceData.cards && sentenceData.cards.length > 0) {
          sentenceTemplates = sentenceData.cards.map(card => card.text);
          logger.info('Loaded sentence templates from JSON', { count: sentenceTemplates.length });
        }
      } catch (error) {
        logger.warn('Failed to load sentence templates from JSON, using defaults', { error: error.message });
        // Fallback to hardcoded templates
        sentenceTemplates = [
          'I SAW A _____ TRYING TO _____',
          'THE _____ WAS _____ AND _____',
          'MY FRIEND _____ LOVES _____',
          'IN THE _____, THERE WAS A _____',
          'THE BEST _____ I EVER SAW WAS _____',
          'A _____ IS NOT A _____',
          'IF I HAD A _____, I WOULD _____'
        ];
      }

      // Start the game
      const updatedSession = sessionManager.startGame(code, sentenceTemplates);

      // Find the judge player info (may be null in single-player mode)
      const judge = updatedSession.judgeId 
        ? updatedSession.players.find(p => p.playerId === updatedSession.judgeId)
        : null;

      logger.info('Game started', {
        code,
        gameId: updatedSession.gameId,
        hostId,
        players: updatedSession.players.length,
        judge: judge?.name,
        isSinglePlayer: updatedSession.isSinglePlayer,
        sentence: updatedSession.sentenceTemplate
      });

      // Prepare judge info (null for single-player mode)
      const judgeInfo = judge ? {
        id: judge.playerId,
        name: judge.name,
        avatar: judge.avatar
      } : null;

      // Broadcast game-started event to all connected players via WebSocket using code-based room
      io.to(`game-${code}`).emit('game-started', {
        gameId: updatedSession.gameId,
        code: updatedSession.code,
        round: updatedSession.currentRound,
        judge: judgeInfo,
        isSinglePlayer: updatedSession.isSinglePlayer,
        sentence: updatedSession.sentenceTemplate,
        time_remaining: 45,
        max_rounds: updatedSession.maxRounds,
        status: 'round_1_selection'
      });

      // Start countdown timer (emit every second)
      let timeRemaining = 45;
      const countdownInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining <= 0) {
          clearInterval(countdownInterval);
          // Would auto-submit here in full implementation
        } else {
          io.to(`game-${code}`).emit('timer-update', {
            time_remaining: timeRemaining
          });
        }
      }, 1000);

      // Return response to host
      res.json({
        success: true,
        gameId: updatedSession.gameId,
        code: updatedSession.code,
        round: updatedSession.currentRound,
        judge: judgeInfo,
        isSinglePlayer: updatedSession.isSinglePlayer,
        sentence: updatedSession.sentenceTemplate,
        time_remaining: timeRemaining,
        max_rounds: updatedSession.maxRounds,
        status: 'round_1_selection'
      });
    } catch (error) {
      logger.error('Error starting game', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Story 3.2: Submit card selections - player selects cards for sentence blanks
  app.post('/api/game/:code/submit-selection', (req, res) => {
    try {
      const { code } = req.params;
      const { playerId, selections, selectedCards, artStyle } = req.body;

      // Validate required fields
      if (!playerId || !selections || typeof selections !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid playerId or selections'
        });
      }

      // Get the session
      const session = sessionManager.getSessionByCode(code);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Game session not found'
        });
      }

      // Validate game is in selection phase
      if (session.currentPhase !== 'round_1_selection' && session.currentPhase !== 'round_voting') {
        return res.status(400).json({
          success: false,
          error: `Game is not in selection phase (current: ${session.currentPhase})`
        });
      }

      // Record the player's selection (including selectedCards and artStyle for image gen)
      const selectionData = {
        selections,
        selectedCards,
        artStyle
      };
      const updatedSession = sessionManager.recordPlayerSelection(code, playerId, selectionData);

      // Validate session after recording selection
      if (!updatedSession || !updatedSession.players) {
        logger.error('Session data invalid after recording selection', { code, playerId });
        return res.status(500).json({
          success: false,
          error: 'Failed to record selection: Invalid session state'
        });
      }

      // Validate judge was assigned (except in single-player mode)
      if (!updatedSession.isSinglePlayer && !updatedSession.judgeId) {
        logger.error('Judge not assigned before selection submission', { code, playerId });
        return res.status(500).json({
          success: false,
          error: 'Game state error: Judge not assigned'
        });
      }

      // Calculate how many players have submitted
      // In single-player mode, count all players; in multiplayer, exclude the judge
      const totalPlayers = updatedSession.isSinglePlayer
        ? updatedSession.players.length
        : updatedSession.players.filter(p => p.playerId !== updatedSession.judgeId).length;
      const submittedCount = Object.keys(updatedSession.playerSelections || {}).length;

      logger.info('Player submitted card selection', {
        code,
        playerId,
        selections,
        submittedCount,
        totalPlayers,
        isSinglePlayer: updatedSession.isSinglePlayer
      });

      // Broadcast update to all players
      io.to(`game-${code}`).emit('selection-submitted', {
        playerId,
        submittedCount,
        totalPlayers
      });

      // START IMAGE GENERATION IMMEDIATELY for this player (don't wait for all selections)
      logger.info('Starting image generation for player', {
        code,
        gameId: updatedSession.gameId,
        playerId,
        round: updatedSession.currentRound
      });

      generateImageForPlayer(
        code,
        updatedSession,
        playerId,
        updatedSession.playerSelections[playerId],
        updatedSession.sentenceTemplate,
        sessionManager,
        io,
        logger
      ).catch(error => {
        logger.error('Image generation failed for player', {
          code,
          playerId,
          error: error.message
        });
        // Broadcast error for this player
        io.to(`game-${code}`).emit('image-generation-error', {
          playerId,
          error: error.message
        });
      });

      // Check if all non-judge players have submitted
      if (submittedCount === totalPlayers) {
        logger.info('All selections received', {
          code,
          submittedCount,
          totalPlayers,
          message: 'Images are being generated in parallel'
        });
      }

      res.json({
        success: true,
        gameId: updatedSession.gameId,
        code: updatedSession.code,
        playerId,
        submittedCount,
        totalPlayers,
        allSubmitted: submittedCount === totalPlayers
      });
    } catch (error) {
      logger.error('Error submitting player selection', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Legacy create game endpoint
  app.post('/api/game/create', (req, res) => {
    try {
      const { maxRounds, maxPlayers, hostId } = req.body;
      const game = gameManager.createGame({
        maxRounds: maxRounds || 5,
        maxPlayers: maxPlayers || 8,
        hostId
      });
      
      logger.info('Game created via API', { gameId: game.gameId, code: game.code });
      
      res.json({
        success: true,
        gameId: game.gameId,
        code: game.code
      });
    } catch (error) {
      logger.error('Error creating game', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Protected game endpoints (placeholders for Story 1.6)

  // Create game (requires authentication)
  app.post('/api/games', auth.requireAuth, (req, res) => {
    logger.info('Create game requested', { userId: req.user.id });
    
    // Placeholder response - full implementation in Story 1.6
    res.status(501).json({
      message: 'Game creation endpoint - to be fully implemented in Story 1.6',
      user: req.user.name
    });
  });

  // Start game (requires authentication)
  app.post('/api/games/:id/start', auth.requireAuth, (req, res) => {
    const gameId = req.params.id;
    logger.info('Start game requested', { userId: req.user.id, gameId });
    
    // Placeholder response - full implementation in Story 1.6
    res.status(501).json({
      message: 'Start game endpoint - to be fully implemented in Story 1.6',
      gameId,
      host: req.user.name
    });
  });
};

/**
 * Helper function to generate image for a single player
 * @param {string} code - Game code
 * @param {Object} session - Game session object
 * @param {string} playerId - Player ID
 * @param {Object} selection - Player's card selections
 * @param {string} sentenceTemplate - Sentence template
 * @param {Object} sessionManager - SessionManager instance
 * @param {Object} io - Socket.io instance
 * @param {Object} logger - Logger instance
 */
async function generateImageForPlayer(code, session, playerId, selection, sentenceTemplate, sessionManager, io, logger) {
  try {
    const startTime = Date.now();
    
    logger.info('Starting image generation for player (individual)', {
      code,
      gameId: session.gameId,
      playerId,
      round: session.currentRound || 1
    });

    // Initialize image generator
    const imageGenerator = new ImageGeneratorService({
      apiKey: process.env.OPENAI_API_KEY,
      serviceType: process.env.IMAGE_GENERATION_SERVICE || 'dalle3',
      timeout: parseInt(process.env.IMAGE_GENERATION_TIMEOUT || '60000', 10),
      maxConcurrent: parseInt(process.env.IMAGE_GENERATION_MAX_CONCURRENT || '2', 10)
    });

    try {
      // Get selected cards from selection object
      // selection.selectedCards should contain the actual card objects sent from client
      const selectedCards = selection.selectedCards;
      
      if (!selectedCards || !Array.isArray(selectedCards) || selectedCards.length === 0) {
        throw new Error(`No selected cards provided for player ${playerId}`);
      }
      
      logger.debug('Using selected cards for prompt', {
        code,
        playerId,
        selectedCards,
        cardCount: selectedCards.length
      });

      // Format the prompt
      const { prompt, completedSentence, artStyle } = PromptFormatter.formatImagePrompt(
        sentenceTemplate,
        selectedCards,
        selection.artStyle
      );

      logger.debug('Generating image for player', {
        code,
        playerId,
        artStyle,
        sentenceTemplate: sentenceTemplate.substring(0, 50) + '...'
      });

      // Generate image
      const result = await imageGenerator.generateImage(
        prompt,
        code,
        session.currentRound || 1,
        playerId,
        artStyle,
        completedSentence
      );

      const elapsedMs = Date.now() - startTime;

      const imageData = {
        imageUrl: result.imageUrl,
        imagePath: result.imagePath,
        completedSentence: result.completedSentence,
        artStyle: result.artStyle,
        generatedAt: result.generatedAt,
        isPlaceholder: result.isPlaceholder || false
      };

      // Store generated image in session
      if (!session.generatedImages) {
        session.generatedImages = {};
      }
      session.generatedImages[playerId] = imageData;
      session.lastActivityAt = Date.now();
      sessionManager.store.set(code, session);

      logger.info('Image generated for player (individual)', {
        code,
        playerId,
        isPlaceholder: result.isPlaceholder,
        imagePath: result.imagePath,
        elapsedMs
      });

      // Broadcast the generated image to all players
      io.to(`game-${code}`).emit('image-ready', {
        gameId: session.gameId,
        code: session.code,
        playerId,
        imageUrl: imageData.imageUrl,
        imagePath: imageData.imagePath,
        completedSentence: imageData.completedSentence,
        artStyle: imageData.artStyle,
        generatedAt: imageData.generatedAt,
        isPlaceholder: imageData.isPlaceholder,
        elapsedMs
      });

      // Check if all images have been generated
      const totalPlayersExpected = session.isSinglePlayer
        ? session.players.length
        : session.players.filter(p => p.playerId !== session.judgeId).length;
      const generatedCount = Object.keys(session.generatedImages || {}).length;

      logger.debug('Image generation progress', {
        code,
        generatedCount,
        totalExpected: totalPlayersExpected,
        complete: generatedCount === totalPlayersExpected
      });

      // If all images are ready, broadcast completion and auto-award in single-player
      if (generatedCount === totalPlayersExpected) {
        logger.info('All images generated', {
          code,
          totalGenerated: generatedCount,
          isSinglePlayer: session.isSinglePlayer
        });

        // In single-player mode, auto-award winner
        if (session.isSinglePlayer) {
          const singlePlayerId = Object.keys(session.playerSelections)[0];
          session.judgeSelection = {
            firstPlace: singlePlayerId,
            secondPlace: null
          };

          logger.info('Single-player mode: auto-assigned winner', {
            code,
            winnerId: singlePlayerId
          });

          // Broadcast results
          io.to(`game-${code}`).emit('results_ready', {
            gameId: session.gameId,
            code: session.code,
            round: session.currentRound,
            isSinglePlayer: true,
            results: {
              round: session.currentRound,
              firstPlace: singlePlayerId,
              secondPlace: null,
              timestamp: Date.now(),
              isSinglePlayer: true
            },
            images: session.generatedImages,
            players: session.players.map(p => ({
              id: p.playerId,
              name: p.name,
              avatar: p.avatar,
              score: p.score || 0
            })),
            timestamp: Date.now()
          });
        }
      }

    } catch (error) {
      logger.error('Failed to generate image for player', {
        code,
        playerId,
        error: error.message
      });

      // Use placeholder on error
      const imageData = {
        imageUrl: '/images/placeholder-image-error.png',
        imagePath: '/images/placeholder-image-error.png',
        completedSentence: 'Error generating image',
        artStyle: 'Error',
        generatedAt: new Date().toISOString(),
        isPlaceholder: true,
        error: error.message
      };

      // Store placeholder in session
      if (!session.generatedImages) {
        session.generatedImages = {};
      }
      session.generatedImages[playerId] = imageData;
      sessionManager.store.set(code, session);

      // Broadcast the error/placeholder
      io.to(`game-${code}`).emit('image-ready', {
        gameId: session.gameId,
        code: session.code,
        playerId,
        imageUrl: imageData.imageUrl,
        imagePath: imageData.imagePath,
        completedSentence: imageData.completedSentence,
        artStyle: imageData.artStyle,
        generatedAt: imageData.generatedAt,
        isPlaceholder: true,
        error: error.message
      });

      throw error;
    }

  } catch (error) {
    logger.error('Image generation failed with exception for player', {
      code,
      playerId,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}
