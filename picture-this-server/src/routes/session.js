/**
 * ---
 * title: Session Management Routes
 * purpose: Handles REST API endpoints for game session management.
 *          Includes session creation, retrieval, joining, and statistics.
 *          Sessions track players, game state, and configuration.
 * exports: function(app, deps) - Route registration function
 * dependencies: sessionManager, auth, logger
 * ---
 */

module.exports = function(app, { sessionManager, auth, logger }) {

  // Create a new game session
  app.post('/api/session/create', auth.requireAuth, (req, res) => {
    try {
      const { maxRounds, maxPlayers } = req.body;
      const hostId = req.user.id;
      
      const session = sessionManager.createSession(
        hostId,
        maxRounds || 5,
        maxPlayers || 8
      );
      
      logger.info('Session created via API', { 
        sessionCode: session.code, 
        hostId,
        gameId: session.gameId 
      });
      
      res.json({
        success: true,
        gameId: session.gameId,
        code: session.code,
        status: session.status
      });
    } catch (error) {
      logger.error('Error creating session', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get session info by code
  app.get('/api/session/:code', (req, res) => {
    try {
      const { code } = req.params;
      const session = sessionManager.getSessionByCode(code);
      
      if (!session) {
        return res.status(404).json({
          error: 'Session not found',
          code
        });
      }
      
      // Find the judge player info
      const judgePlayer = session.judgeId 
        ? session.players.find(p => p.playerId === session.judgeId) 
        : null;
      
      res.json({
        gameId: session.gameId,
        code: session.code,
        hostId: session.hostId,
        currentPhase: session.currentPhase,
        currentRound: session.currentRound,
        maxRounds: session.maxRounds,
        status: session.status,
        playerCount: session.players.length,
        maxPlayers: session.maxPlayers,
        players: session.players,
        sentenceTemplate: session.sentenceTemplate,
        judgeId: session.judgeId,
        judge: judgePlayer ? {
          id: judgePlayer.playerId,
          name: judgePlayer.name,
          avatar: judgePlayer.avatar
        } : null
      });
    } catch (error) {
      logger.error('Error getting session', { error: error.message });
      res.status(500).json({
        error: error.message
      });
    }
  });

  // Join a session
  app.post('/api/session/:code/join', (req, res) => {
    try {
      const { code } = req.params;
      const { playerId, name, avatar } = req.body;
      
      if (!playerId || !name) {
        return res.status(400).json({
          error: 'playerId and name are required'
        });
      }
      
      const session = sessionManager.joinSession(code, {
        playerId,
        name,
        avatar: avatar || '🎮'
      });
      
      logger.info('Player joined session', { 
        code, 
        playerId, 
        playerCount: session.players.length 
      });
      
      res.json({
        success: true,
        gameId: session.gameId,
        code: session.code,
        playerCount: session.players.length,
        maxPlayers: session.maxPlayers
      });
    } catch (error) {
      logger.error('Error joining session', { error: error.message });
      res.status(400).json({
        error: error.message
      });
    }
  });

  // Get session statistics
  app.get('/api/session/stats/all', (req, res) => {
    try {
      const stats = sessionManager.getStatistics();
      
      res.json({
        sessions: stats.totalActiveSessions,
        lobbyCount: stats.lobbyCount,
        inProgressCount: stats.inProgressCount,
        totalPlayers: stats.totalPlayers,
        activeCodes: stats.activeCodes
      });
    } catch (error) {
      logger.error('Error getting session stats', { error: error.message });
      res.status(500).json({
        error: error.message
      });
    }
  });
};
