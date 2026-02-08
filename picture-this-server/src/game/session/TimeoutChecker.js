/**
 * ---
 * title: Timeout Checker
 * purpose: Handles session timeout detection and automatic cleanup of inactive sessions.
 * exports: TimeoutChecker class
 * dependencies: None
 * ---
 */

class TimeoutChecker {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.timeoutMinutes - Minutes before session times out (default: 60)
   * @param {number} options.checkIntervalSeconds - Interval between checks (default: 300)
   * @param {function} options.getSessionsCallback - Function to get all sessions
   * @param {function} options.cleanupCallback - Function to cleanup a session
   * @param {function} options.emitCallback - Function to emit events
   */
  constructor(options = {}) {
    this.timeoutMinutes = options.timeoutMinutes || 60;
    this.checkIntervalSeconds = options.checkIntervalSeconds || 300;
    this.getSessions = options.getSessionsCallback || (() => []);
    this.cleanupSession = options.cleanupCallback || (() => {});
    this.emit = options.emitCallback || (() => {});
    this.intervalId = null;
  }

  /**
   * Start the background timeout checker
   */
  start() {
    if (this.intervalId) {
      return; // Already running
    }

    this.intervalId = setInterval(() => {
      this.checkAndCleanup();
    }, this.checkIntervalSeconds * 1000);
  }

  /**
   * Stop the background timeout checker
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for timed out sessions (without cleanup)
   * @returns {Array<string>} - Array of timed out game codes
   */
  checkTimeouts() {
    const timedOutCodes = [];
    const now = Date.now();
    const timeoutMs = this.timeoutMinutes * 60 * 1000;

    const sessions = this.getSessions();
    for (const session of sessions) {
      const lastActivityTime = typeof session.lastActivityAt === 'string' 
        ? new Date(session.lastActivityAt).getTime()
        : session.lastActivityAt;
      
      const timeSinceActivity = now - lastActivityTime;

      if (timeSinceActivity > timeoutMs) {
        timedOutCodes.push(session.code);
        this.emit('onSessionTimedOut', session.code);
      }
    }

    return timedOutCodes;
  }

  /**
   * Check and cleanup timed out sessions
   * @returns {Array<string>} - Array of cleaned up game codes
   */
  checkAndCleanup() {
    try {
      const timedOutCodes = this.checkTimeouts();
      const cleanedCodes = [];

      for (const code of timedOutCodes) {
        this.cleanupSession(code);
        cleanedCodes.push(code);
      }

      if (cleanedCodes.length > 0) {
        console.log(`[TimeoutChecker] Cleaned up ${cleanedCodes.length} timed out sessions:`, cleanedCodes);
      }

      return cleanedCodes;
    } catch (error) {
      console.error('[TimeoutChecker] Error in timeout check:', error);
      return [];
    }
  }
}

module.exports = TimeoutChecker;
