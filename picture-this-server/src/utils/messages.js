/**
 * ---
 * title: Message Utilities
 * purpose: Defines WebSocket message type constants and helper functions
 *          for creating structured messages. Ensures consistent message
 *          format across all WebSocket communications.
 * exports: MESSAGE_TYPES - Constants for message type identifiers
 *          createMessage - Helper to create standardized message objects
 * ---
 */

// Message type constants
const MESSAGE_TYPES = {
  STATE_UPDATE: 'state_update',
  PHASE_CHANGE: 'phase_change',
  ERROR: 'error',
  CONNECTED: 'connected',
  PLAYER_JOINED: 'player-joined'
};

/**
 * Creates a structured message object with consistent format
 * @param {string} type - The message type (from MESSAGE_TYPES)
 * @param {object} data - The message payload
 * @returns {object} Formatted message with type, data, timestamp, and version
 */
function createMessage(type, data) {
  return {
    type,
    data,
    timestamp: Date.now(),
    version: '1.0'
  };
}

module.exports = {
  MESSAGE_TYPES,
  createMessage
};
