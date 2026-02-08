/**
 * ---
 * title: Game Session Manager Unit Tests
 * purpose: Unit tests for GameSessionManager functionality including session
 *          creation, player management, phase transitions, and timeout handling.
 * exports: None (test script)
 * dependencies: GameSessionManager
 * ---
 */

const GameSessionManager = require('../src/game/GameSessionManager');

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test suite
const tests = [];
let passedTests = 0;
let failedTests = 0;

function describe(name, testFn) {
  try {
    testFn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    failedTests++;
  }
}

// Initialize manager with test config
const manager = new GameSessionManager({
  timeoutMinutes: 60,
  checkIntervalSeconds: 300
});

// Test 1: Create session with unique code
describe('Create session generates unique code', () => {
  const session1 = manager.createSession('host-1', 5, 8);
  const session2 = manager.createSession('host-2', 5, 8);
  
  assert(session1.code !== session2.code, 'Session codes should be different');
  assertEquals(session1.code.length, 6, 'Code should be 6 characters');
  assertEquals(session2.code.length, 6, 'Code should be 6 characters');
  assertTrue(/^[A-Z0-9]{6}$/.test(session1.code), 'Code should match pattern');
});

// Test 2: Retrieve session by code
describe('Get session by code returns correct session', () => {
  const session = manager.createSession('host-3', 5, 8);
  const retrieved = manager.getSessionByCode(session.code);
  
  assertEquals(retrieved.gameId, session.gameId, 'Retrieved session should match');
  assertEquals(retrieved.code, session.code, 'Codes should match');
  assertEquals(retrieved.hostId, 'host-3', 'Host ID should match');
});

// Test 3: Session lookup is case-insensitive
describe('Session lookup handles case insensitivity', () => {
  const session = manager.createSession('host-4', 5, 8);
  const retrieved1 = manager.getSessionByCode(session.code);
  const retrieved2 = manager.getSessionByCode(session.code.toLowerCase());
  
  assertEquals(retrieved1.gameId, retrieved2.gameId, 'Should find session regardless of case');
});

// Test 4: Join session adds player
describe('Join session adds player to player list', () => {
  const session = manager.createSession('host-5', 5, 8);
  const initialCount = session.players.length;
  
  manager.joinSession(session.code, {
    playerId: 'player-1',
    name: 'Alice',
    avatar: '🎨'
  });
  
  const updated = manager.getSessionByCode(session.code);
  assertEquals(updated.players.length, initialCount + 1, 'Player count should increase');
  assertEquals(updated.players[0].name, 'Alice', 'Player name should match');
});

// Test 5: Cannot join game after it starts
describe('Cannot join session after game has started', () => {
  const session = manager.createSession('host-6', 5, 8);
  manager.updateSessionStatus(session.code, 'in_progress');
  
  try {
    manager.joinSession(session.code, {
      playerId: 'player-2',
      name: 'Bob',
      avatar: '🎭'
    });
    throw new Error('Should have thrown error');
  } catch (error) {
    assert(error.message.includes('already started'), 'Should prevent join after start');
  }
});

// Test 6: Remove player from session
describe('Remove player from session', () => {
  const session = manager.createSession('host-7', 5, 8);
  const playerId = 'player-3';
  
  manager.joinSession(session.code, {
    playerId,
    name: 'Charlie',
    avatar: '🎪'
  });
  
  let updated = manager.getSessionByCode(session.code);
  assertEquals(updated.players.length, 1, 'Should have 1 player');
  
  manager.removePlayerFromSession(session.code, playerId);
  updated = manager.getSessionByCode(session.code);
  assertEquals(updated.players.length, 0, 'Should have 0 players');
});

// Test 7: Phase transitions are validated
describe('Phase transitions are validated', () => {
  const session = manager.createSession('host-8', 5, 8);
  
  // Valid transition: lobby -> round_intro
  manager.updateSessionPhase(session.code, 'round_intro');
  let updated = manager.getSessionByCode(session.code);
  assertEquals(updated.currentPhase, 'round_intro', 'Should transition to round_intro');
  
  // Invalid transition: round_intro -> lobby should fail
  try {
    manager.updateSessionPhase(session.code, 'lobby');
    throw new Error('Should have thrown error for invalid transition');
  } catch (error) {
    assert(error.message.includes('Cannot transition'), 'Should reject invalid transition');
  }
});

// Test 8: Update last activity prevents timeout
describe('Update last activity refreshes timestamp', () => {
  const session = manager.createSession('host-9', 5, 8);
  const initialActivity = session.lastActivityAt;
  
  // Wait a moment and update
  setTimeout(() => {
    manager.updateLastActivity(session.code);
    const updated = manager.getSessionByCode(session.code);
    assert(updated.lastActivityAt > initialActivity, 'Activity timestamp should be updated');
  }, 10);
});

// Test 9: Code uniqueness verification
describe('Code generation prevents collisions', () => {
  // Generate many codes to check for uniqueness
  const codes = new Set();
  for (let i = 0; i < 50; i++) {
    const session = manager.createSession(`host-${i}`, 5, 8);
    codes.add(session.code);
  }
  
  assertEquals(codes.size, 50, 'All 50 generated codes should be unique');
});

// Test 10: Get all active sessions
describe('Get all active sessions returns correct list', () => {
  const newManager = new GameSessionManager();
  assertEquals(newManager.getAllActiveSessions().length, 0, 'Should start with 0 sessions');
  
  newManager.createSession('host-10', 5, 8);
  newManager.createSession('host-11', 5, 8);
  
  assertEquals(newManager.getAllActiveSessions().length, 2, 'Should have 2 sessions');
});

// Test 11: Session timeout detection
describe('Timeout checker identifies inactive sessions', () => {
  const newManager = new GameSessionManager({
    timeoutMinutes: 0.016 // ~1 second for testing
  });
  
  const session = newManager.createSession('host-12', 5, 8);
  const code = session.code;
  
  // Manually set activity to past
  session.lastActivityAt = new Date(Date.now() - 2000).toISOString();
  
  const timedOut = newManager.checkTimeouts();
  assert(timedOut.includes(code), 'Should detect timed out session');
});

// Test 12: Session cleanup removes from registry
describe('Cleanup removes session from active registry', () => {
  const newManager = new GameSessionManager();
  const session = newManager.createSession('host-13', 5, 8);
  const code = session.code;
  
  let retrieved = newManager.getSessionByCode(code);
  assert(retrieved !== null, 'Session should exist before cleanup');
  
  newManager.cleanupSession(code);
  retrieved = newManager.getSessionByCode(code);
  assertEquals(retrieved, null, 'Session should not exist after cleanup');
});

// Test 13: Event listener registration
describe('Event listeners are called on session events', () => {
  const newManager = new GameSessionManager();
  let eventFired = false;
  
  newManager.on('onSessionCreated', (gameId, code) => {
    eventFired = true;
  });
  
  newManager.createSession('host-14', 5, 8);
  assert(eventFired, 'onSessionCreated event should fire');
});

// Test 14: Session statistics
describe('Get statistics returns correct counts', () => {
  const newManager = new GameSessionManager();
  
  const session1 = newManager.createSession('host-15', 5, 8);
  const session2 = newManager.createSession('host-16', 5, 8);
  
  newManager.joinSession(session1.code, {
    playerId: 'player-4',
    name: 'David',
    avatar: '🎬'
  });
  
  const stats = newManager.getStatistics();
  assertEquals(stats.totalActiveSessions, 2, 'Should have 2 active sessions');
  assertEquals(stats.totalPlayers, 1, 'Should have 1 total player (excluding hosts)');
});

// Test 15: Maximum players enforcement
describe('Session enforces maximum players limit', () => {
  const newManager = new GameSessionManager();
  const session = newManager.createSession('host-17', 5, 2); // max 2 players
  
  newManager.joinSession(session.code, {
    playerId: 'player-5',
    name: 'Eve',
    avatar: '⭐'
  });
  
  newManager.joinSession(session.code, {
    playerId: 'player-6',
    name: 'Frank',
    avatar: '🎯'
  });
  
  try {
    newManager.joinSession(session.code, {
      playerId: 'player-7',
      name: 'Grace',
      avatar: '🏆'
    });
    throw new Error('Should have thrown error for full session');
  } catch (error) {
    assert(error.message.includes('full'), 'Should reject join when full');
  }
});

// Print results
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${passedTests}`);
console.log(`Tests Failed: ${failedTests}`);
console.log('='.repeat(50) + '\n');

if (failedTests === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed');
  process.exit(1);
}
