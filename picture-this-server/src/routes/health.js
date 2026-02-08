/**
 * ---
 * title: Health Check Routes
 * purpose: Provides endpoints for monitoring server health and debugging.
 *          Includes health check for load balancers and debug endpoints
 *          for inspecting game/session state during development.
 * exports: function(app, deps) - Route registration function
 * dependencies: gameManager, sessionManager, logger
 * ---
 */

module.exports = function(app, { gameManager, sessionManager, logger }) {
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    logger.info('Health check requested');
    res.json({
      status: 'ok',
      timestamp: Date.now(),
      activeGames: gameManager.getGameCount(),
      activeSessions: sessionManager.getAllActiveSessions().length
    });
  });

  // Keep-alive endpoint
  app.post('/api/keep-alive', (req, res) => {
    logger.debug('Keep-alive ping received');
    res.json({
      status: 'ok',
      timestamp: Date.now()
    });
  });

  // Debug endpoint for session state
  app.get('/api/debug/session/:code', (req, res) => {
    const { code } = req.params;
    const session = sessionManager.getSessionByCode(code);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code
      });
    }
    
    res.json({
      session,
      timestamp: Date.now()
    });
  });

  // Debug endpoint for game state
  app.get('/api/debug/game/:gameId', (req, res) => {
    const { gameId } = req.params;
    const state = gameManager.exportGameState(gameId);
    
    if (!state) {
      return res.status(404).json({
        error: 'Game not found',
        gameId
      });
    }
    
    res.json({
      gameState: state,
      timerInfo: gameManager.timerManager.getTimerInfo(gameId),
      timestamp: Date.now()
    });
  });
};
