/**
 * Test suite for Single-Player Mode
 * 
 * Validates that the game can be played with a single player:
 * - Creating/starting games with 1 player  
 * - No judge selection in single-player
 * - Auto-win for single player
 * - Auto-advance after image generation
 */

const assert = require('assert');
const GameSessionManager = require('../src/game/session/GameSessionManager');
const { createGameState, addPlayer } = require('../src/game/GameState');
const GameOrchestrator = require('../src/game/GameOrchestrator');
const { PHASES } = require('../src/game/phases');

// Mock logger
const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {}
};

// Mock timer manager
class MockTimerManager {
  schedulePhaseTimeout() {}
  cancelTimer() {}
  cancelAll() {}
}

let testsPassed = 0;
let testsFailed = 0;

async function runTest(testName, testFn) {
  try {
    console.log(`\n🧪 ${testName}`);
    await testFn();
    console.log('✓ PASSED');
    testsPassed++;
  } catch (error) {
    console.error('✗ FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    testsFailed++;
  }
}

console.log('=====================================');
console.log('Single-Player Mode Tests');
console.log('=====================================');

(async () => {

// Test 1: Create session with 1 player (single-player mode)
await runTest('Create session allowing 1 player', () => {
  const manager = new GameSessionManager();
  const hostId = 'host-123';
  
  // Should allow maxPlayers = 1
  const session = manager.createSession(hostId, 3, 1);
  
  assert(session, 'Session should be created');
  assert.equal(session.maxPlayers, 1, 'Max players should be 1');
  assert.equal(session.hostId, hostId, 'Host ID should match');
});

// Test 2: Start game with single player
await runTest('Start game with single player', () => {
  const manager = new GameSessionManager();
  const hostId = 'host-123';
  
  const session = manager.createSession(hostId, 3, 1);
  
  // Join as single player
  const player = {
    playerId: 'player-1',
    name: 'Solo Player',
    avatar: '🎮'
  };
  
  const updatedSession = manager.joinSession(session.code, player);
  
  assert.equal(updatedSession.players.length, 1, 'Should have 1 player');
  
  // Start game
  const startedSession = manager.startGame(session.code);
  
  assert.equal(startedSession.status, 'in_progress', 'Game should be in progress');
  assert.equal(startedSession.currentRound, 1, 'Should be round 1');
  assert.equal(startedSession.isSinglePlayer, true, 'Should be flagged as single player');
  assert.equal(startedSession.judgeId, null, 'Should have no judge in single player');
});

// Test 3: GameOrchestrator allows starting with 1 player
await runTest('GameOrchestrator startGame with 1 player', async () => {
  const orchestrator = new GameOrchestrator(
    mockLogger,
    new MockTimerManager(),
    () => {}
  );
  
  const state = createGameState({ maxRounds: 3 });
  const stateWithPlayer = addPlayer(state, {
    id: 'player-1',
    name: 'Solo',
    avatar: '🎮',
    socketId: 'socket-1'
  });
  
  const started = await orchestrator.startGame(stateWithPlayer);
  
  assert.equal(started.currentPhase, PHASES.ROUND_SETUP, 'Should advance to ROUND_SETUP');
  assert.equal(started.players.length, 1, 'Should have 1 player');
});

// Test 4: Setup round in single-player mode (no judge)
await runTest('Round setup with no judge in single-player', () => {
  const orchestrator = new GameOrchestrator(
    mockLogger,
    new MockTimerManager(),
    () => {}
  );
  
  let state = createGameState({ maxRounds: 3, currentRound: 0 });
  state = addPlayer(state, {
    id: 'player-1',
    name: 'Solo',
    avatar: '🎮',
    socketId: 'socket-1'
  });
  
  // Manually call _setupRound
  const roundState = orchestrator._setupRound(state);
  
  assert.equal(roundState.currentRound, 1, 'Should be round 1');
  assert.equal(roundState.judgeId, null, 'Should have no judge');
  assert.equal(roundState.isSinglePlayer, true, 'Should be single player');
  assert(roundState.sentenceTemplate, 'Should have sentence template');
});

// Test 5: Single player can submit cards
await runTest('Single player submits cards (no judge check)', async () => {
  const orchestrator = new GameOrchestrator(
    mockLogger,
    new MockTimerManager(),
    () => {}
  );
  
  // Create state with proper phase
  let state = createGameState({ maxRounds: 3 });
  
  state = addPlayer(state, {
    id: 'player-1',
    name: 'Solo',
    avatar: '🎮',
    socketId: 'socket-1',
    hand: ['cat', 'dog', 'pizza', 'robot', 'dragon', 'wizard', 'ninja', 'pirate']
  });
  
  // Set required properties
  state.currentPhase = PHASES.SELECTION;
  state.currentRound = 1;
  state.judgeId = null;
  state.isSinglePlayer = true;
  state.blankCount = 1;
  state.sentenceTemplate = 'A wild ___ appeared!';
  
  const submitted = await orchestrator.submitSelection(state, 'player-1', ['cat']);
  
  assert(submitted.playerSelections['player-1'], 'Player selection should be recorded');
  assert.equal(submitted.playerSelections['player-1'][0], 'cat', 'Should have selected card');
});

// Test 6: Validate single-player sessions can't have maxPlayers < 1
await runTest('Validate minimum 1 player required', () => {
  const manager = new GameSessionManager();
  const hostId = 'host-123';
  
  try {
    manager.createSession(hostId, 3, 0); // Try 0 players
    assert.fail('Should have thrown error for 0 players');
  } catch (error) {
    assert(error.message.includes('must be between 1 and 20'), 'Should require at least 1 player');
  }
});

// Test 7: Multi-player mode still requires 2+ players with judge
await runTest('Multi-player mode still has judge', () => {
  const manager = new GameSessionManager();
  const hostId = 'host-123';
  
  const session = manager.createSession(hostId, 3, 8);
  
  // Join 2 players
  manager.joinSession(session.code, { playerId: 'p1', name: 'Player 1', avatar: '👤' });
  manager.joinSession(session.code, { playerId: 'p2', name: 'Player 2', avatar: '👥' });
  
  const startedSession = manager.startGame(session.code);
  
  assert.equal(startedSession.isSinglePlayer, false, 'Should not be single player');
  assert(startedSession.judgeId, 'Should have a judge');
  assert(['p1', 'p2'].includes(startedSession.judgeId), 'Judge should be one of the players');
});

// Test 8: Single-player auto-win setup
await runTest('Single-player image gen complete sets auto-win', () => {
  const orchestrator = new GameOrchestrator(
    mockLogger,
    new MockTimerManager(),
    () => {}
  );
  
  let state = createGameState({ maxRounds: 3 });
  
  state = addPlayer(state, {
    id: 'player-1',
    name: 'Solo',
    avatar: '🎮',
    socketId: 'socket-1'
  });
  
  // Set required properties for IMAGE_GEN_COMPLETE phase
  state.currentPhase = PHASES.IMAGE_GEN_COMPLETE;
  state.currentRound = 1;
  state.isSinglePlayer = true;
  state.generatedImages = {  'player-1': { imageUrl: '/test.png', imagePath: '/test.png' } };
  
  const result = orchestrator._completeImageGen(state);
  
  assert(result.judgeSelection, 'Should have judge selection');
  assert.equal(result.judgeSelection.firstPlace, 'player-1', 'Single player should be first place');
  assert.equal(result.judgeSelection.secondPlace, null, 'No second place in single player');
});

// Print summary
console.log('\n=====================================');
console.log('Test Summary');
console.log('=====================================');
console.log(`✓ Passed: ${testsPassed}`);
console.log(`✗ Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log('=====================================\n');

process.exit(testsFailed > 0 ? 1 : 0);

})(); // End async IIFE
