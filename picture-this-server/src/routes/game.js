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

module.exports = function(app, { gameManager, sessionManager, auth, io, logger }) {

  // Create game endpoint (Story 1.6: Host Create Game Session)
  app.post('/api/game/create-session', auth.requireAuth, (req, res) => {
    try {
      const { maxRounds, maxPlayers } = req.body;
      const hostId = req.user.id;
      
      // Validation
      const maxPlayersVal = parseInt(maxPlayers) || 8;
      const maxRoundsVal = parseInt(maxRounds) || 10;
      
      if (maxPlayersVal < 2 || maxPlayersVal > 20) {
        return res.status(400).json({
          success: false,
          error: 'Max players must be between 2 and 20'
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

      // Validate at least 2 players
      if (!session.players || session.players.length < 2) {
        return res.status(400).json({
          success: false,
          error: `Not enough players to start game (need 2, have ${session.players.length})`
        });
      }

      // Default sentence templates (Story 1.3 would load from database)
      const sentenceTemplates = [
        'I SAW A _____ TRYING TO _____',
        'THE _____ WAS _____ AND _____',
        'MY FRIEND _____ LOVES _____',
        'IN THE _____, THERE WAS A _____',
        'THE BEST _____ I EVER SAW WAS _____',
        'A _____ IS NOT A _____',
        'IF I HAD A _____, I WOULD _____'
      ];

      // Start the game
      const updatedSession = sessionManager.startGame(code, sentenceTemplates);

      // Find the judge player info
      const judge = updatedSession.players.find(p => p.playerId === updatedSession.judgeId);

      logger.info('Game started', {
        code,
        gameId: updatedSession.gameId,
        hostId,
        players: updatedSession.players.length,
        judge: judge?.name,
        sentence: updatedSession.sentenceTemplate
      });

      // Broadcast game-started event to all connected players via WebSocket using code-based room
      io.to(`game-${code}`).emit('game-started', {
        gameId: updatedSession.gameId,
        code: updatedSession.code,
        round: updatedSession.currentRound,
        judge: {
          id: judge.playerId,
          name: judge.name,
          avatar: judge.avatar
        },
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
        judge: {
          id: judge.playerId,
          name: judge.name,
          avatar: judge.avatar
        },
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
      const { playerId, selections } = req.body;

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

      // Record the player's selection
      const updatedSession = sessionManager.recordPlayerSelection(code, playerId, selections);

      // Validate session after recording selection
      if (!updatedSession || !updatedSession.players) {
        logger.error('Session data invalid after recording selection', { code, playerId });
        return res.status(500).json({
          success: false,
          error: 'Failed to record selection: Invalid session state'
        });
      }

      // Validate judge was assigned
      if (!updatedSession.judgeId) {
        logger.error('Judge not assigned before selection submission', { code, playerId });
        return res.status(500).json({
          success: false,
          error: 'Game state error: Judge not assigned'
        });
      }

      // Calculate how many players have submitted
      const totalPlayers = updatedSession.players.filter(p => p.playerId !== updatedSession.judgeId).length;
      const submittedCount = Object.keys(updatedSession.playerSelections || {}).length;

      logger.info('Player submitted card selection', {
        code,
        playerId,
        selections,
        submittedCount,
        totalPlayers
      });

      // Broadcast update to all players
      io.to(`game-${code}`).emit('selection-submitted', {
        playerId,
        submittedCount,
        totalPlayers
      });

      // Check if all non-judge players have submitted
      if (submittedCount === totalPlayers) {
        // All selections received, advance to next phase
        updatedSession.currentPhase = 'round_voting';
        updatedSession.lastActivityAt = Date.now();
        // Use the sessionManager's internal store to persist the updated session
        sessionManager.store.set(code, updatedSession);

        logger.info('All selections received, advancing to voting phase', {
          code,
          submittedCount
        });

        io.to(`game-${code}`).emit('selections-complete', {
          message: 'All players have submitted selections'
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
