/**
 * ---
 * title: Judge Interface API Routes
 * purpose: REST API endpoints for judge interface - initializing judge phase, retrieving
 *          images, submitting judge selections, and tracking judge state.
 * exports: setupJudgeRoutes function
 * dependencies: express, GameSessionManager
 * ---
 */

/**
 * Setup judge interface routes
 * @param {Object} app - Express app instance
 * @param {Object} deps - Dependencies { sessionManager: GameSessionManager, gameManager: GameManager }
 */
function setupJudgeRoutes(app, deps) {
  if (!deps || !deps.sessionManager) {
    throw new Error('setupJudgeRoutes requires sessionManager in dependencies');
  }
  
  const { sessionManager: manager, gameManager } = deps;

  /**
   * GET /api/judge/:code/images
   * Get all submitted images for judge to review
   */
  app.get('/api/judge/:code/images', (req, res) => {
    try {
      const { code } = req.params;
      const session = manager.getSessionByCode(code);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Try to get images from GameManager first (WebSocket flow)
      let images = [];
      if (gameManager) {
        const game = gameManager.getGameByCode(code);
        if (game && game.generatedImages) {
          // Convert generatedImages map to array
          images = Object.entries(game.generatedImages).map(([playerId, imgData], index) => ({
            playerId,
            playerNumber: index + 1,
            imageUrl: imgData.imagePath || imgData.imageUrl,
            completedSentence: imgData.completedSentence,
            artStyle: imgData.artStyle,
            generatedAt: imgData.generatedAt,
            isPlaceholder: imgData.isPlaceholder || false
          }));
        }
      }

      // Fallback: check if images are stored in session
      if (images.length === 0 && session.generatedImages) {
        images = Object.entries(session.generatedImages).map(([playerId, imgData], index) => ({
          playerId,
          playerNumber: index + 1,
          imageUrl: imgData.imagePath || imgData.imageUrl,
          completedSentence: imgData.completedSentence,
          artStyle: imgData.artStyle,
          generatedAt: imgData.generatedAt,
          isPlaceholder: imgData.isPlaceholder || false
        }));
      }

      res.json({
        gameCode: code,
        images,
        totalImages: images.length,
        judgeId: session.judgeId,
        sentenceTemplate: session.sentenceTemplate
      });
    } catch (error) {
      console.error('Error fetching judge images:', error);
      res.status(500).json({ error: 'Failed to fetch images' });
    }
  });

  /**
   * POST /api/judge/:code/submit-selection
   * Submit judge's 1st and 2nd place selections
   * Body: { firstPlaceId, secondPlaceId }
   */
  app.post('/api/judge/:code/submit-selection', (req, res) => {
    try {
      const { code } = req.params;
      const { firstPlaceId, secondPlaceId } = req.body;

      const session = manager.getSessionByCode(code);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Validate judge is submitting (optional, can be enforced on client)
      // Validate both selections are provided
      if (!firstPlaceId || !secondPlaceId) {
        return res.status(400).json({ error: 'Both 1st and 2nd place selections required' });
      }

      // Validate selections are different
      if (firstPlaceId === secondPlaceId) {
        return res.status(400).json({ error: 'Cannot select same player for both positions' });
      }

      // Validate both players are in the session
      const firstPlace = session.players.find(p => p.playerId === firstPlaceId);
      const secondPlace = session.players.find(p => p.playerId === secondPlaceId);

      if (!firstPlace || !secondPlace) {
        return res.status(400).json({ error: 'Invalid player selection' });
      }

      // Store judge's selections in session
      session.judgeSelections = {
        firstPlaceId,
        secondPlaceId,
        submittedAt: Date.now()
      };

      manager.store.set(code, session);

      // Emit event for real-time updates
      manager.emit('onJudgeSelectionSubmitted', code, {
        firstPlaceId,
        secondPlaceId,
        firstPlaceName: firstPlace.name,
        secondPlaceName: secondPlace.name
      });

      res.json({
        success: true,
        message: 'Selections submitted',
        selections: {
          firstPlace: { playerId: firstPlaceId, name: firstPlace.name },
          secondPlace: { playerId: secondPlaceId, name: secondPlace.name }
        }
      });
    } catch (error) {
      console.error('Error submitting judge selection:', error);
      res.status(500).json({ error: 'Failed to submit selection' });
    }
  });

  /**
   * GET /api/judge/:code/status
   * Get current judge phase status
   */
  app.get('/api/judge/:code/status', (req, res) => {
    try {
      const { code } = req.params;
      const session = manager.getSessionByCode(code);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        gameCode: code,
        phase: session.currentPhase,
        judgeId: session.judgeId,
        hasSubmitted: !!session.judgeSelections,
        submissions: Object.keys(manager.getPlayerSelections(code) || {}).length,
        totalPlayers: session.players.length
      });
    } catch (error) {
      console.error('Error getting judge status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  /**
   * GET /api/judge/:code/selections
   * Get the judge's current selections (for resuming UI)
   */
  app.get('/api/judge/:code/selections', (req, res) => {
    try {
      const { code } = req.params;
      const session = manager.getSessionByCode(code);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const selections = session.judgeSelections || {};

      res.json({
        gameCode: code,
        firstPlaceId: selections.firstPlaceId || null,
        secondPlaceId: selections.secondPlaceId || null,
        submittedAt: selections.submittedAt || null
      });
    } catch (error) {
      console.error('Error getting judge selections:', error);
      res.status(500).json({ error: 'Failed to get selections' });
    }
  });
}

module.exports = setupJudgeRoutes;
