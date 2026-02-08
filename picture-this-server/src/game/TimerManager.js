/**
 * ---
 * title: Timer Manager
 * purpose: Manages phase timeouts and automatic phase advancement during gameplay.
 *          Provides scheduling, cancellation, and remaining time tracking for game phases.
 * exports: TimerManager - Class for managing game phase timers
 * dependencies: None (self-contained)
 * ---
 */

class TimerManager {
  constructor() {
    this.timers = new Map(); // gameId -> timer info
    this.intervals = new Map(); // gameId -> interval handle
  }

  /**
   * Schedules a phase timeout
   * @param {string} gameId - Game ID
   * @param {number} timeoutMs - Timeout duration in milliseconds
   * @param {Function} callback - Callback to execute on timeout
   * @returns {boolean} True if scheduled successfully
   */
  schedulePhaseTimeout(gameId, timeoutMs, callback) {
    // Clear any existing timer for this game
    this.cancelTimer(gameId);
    
    if (timeoutMs <= 0) {
      // No timeout needed
      return false;
    }
    
    const startTime = Date.now();
    const endTime = startTime + timeoutMs;
    
    // Use setInterval for 100ms granularity checking
    const intervalHandle = setInterval(() => {
      const now = Date.now();
      if (now >= endTime) {
        this.cancelTimer(gameId);
        try {
          callback();
        } catch (error) {
          console.error(`Timer callback error for game ${gameId}:`, error);
        }
      }
    }, 100);
    
    this.timers.set(gameId, {
      startTime,
      endTime,
      timeoutMs,
      callback
    });
    
    this.intervals.set(gameId, intervalHandle);
    
    return true;
  }

  /**
   * Cancels a timer for a game
   * @param {string} gameId - Game ID
   */
  cancelTimer(gameId) {
    const intervalHandle = this.intervals.get(gameId);
    if (intervalHandle) {
      clearInterval(intervalHandle);
      this.intervals.delete(gameId);
    }
    this.timers.delete(gameId);
  }

  /**
   * Gets remaining time for a game's current phase
   * @param {string} gameId - Game ID
   * @returns {number} Remaining milliseconds, or 0 if no timer
   */
  getRemainingTime(gameId) {
    const timer = this.timers.get(gameId);
    if (!timer) {
      return 0;
    }
    
    const now = Date.now();
    const remaining = timer.endTime - now;
    return Math.max(0, remaining);
  }

  /**
   * Checks if a timer exists for a game
   * @param {string} gameId - Game ID
   * @returns {boolean} True if timer exists
   */
  hasTimer(gameId) {
    return this.timers.has(gameId);
  }

  /**
   * Gets timer info for a game
   * @param {string} gameId - Game ID
   * @returns {Object|null} Timer info or null
   */
  getTimerInfo(gameId) {
    const timer = this.timers.get(gameId);
    if (!timer) {
      return null;
    }
    
    return {
      startTime: timer.startTime,
      endTime: timer.endTime,
      timeoutMs: timer.timeoutMs,
      remainingMs: this.getRemainingTime(gameId)
    };
  }

  /**
   * Cancels all timers (for cleanup)
   */
  cancelAll() {
    for (const gameId of this.intervals.keys()) {
      this.cancelTimer(gameId);
    }
  }

  /**
   * Gets count of active timers
   * @returns {number} Number of active timers
   */
  getActiveTimerCount() {
    return this.timers.size;
  }
}

module.exports = TimerManager;
