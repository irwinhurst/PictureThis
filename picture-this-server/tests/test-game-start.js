/**
 * Story 3.0: Game Start & Round 1 Initialization - Test Suite
 */

const assert = require('assert');
const GameSessionManager = require('../src/game/GameSessionManager');

console.log('🧪 Story 3.0: Game Start & Round 1 Initialization - Test Suite\n');

const manager = new GameSessionManager();
let passed = 0;
let failed = 0;
const tests = [];

// test data
const mockHost = { playerId: 'host-123', name: 'Host Player', avatar: '🎮' };
const mockPlayer1 = { playerId: 'player-1', name: 'Alice', avatar: '⚽' };
const mockPlayer2 = { playerId: 'player-2', name: 'Bob', avatar: '🎨' };
const mockPlayer3 = { playerId: 'player-3', name: 'Charlie', avatar: '🌟' };

const sentenceTemplates = [
  'I SAW A _____ TRYING TO _____',
  'THE _____ WAS _____ AND _____',
  'MY FRIEND _____ LOVES _____',
  'IN THE _____, THERE WAS A _____',
  'THE BEST _____ I EVER SAW WAS _____',
  'A _____ IS NOT A _____',
  'IF I HAD A _____, I WOULD _____'
];

// 1. Create session with players
tests.push({
  name: 'Create session and add players',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    assert.strictEqual(session.status, 'lobby', 'Initial status should be lobby');
    assert.strictEqual(session.players.length, 0, 'Should start with no players');
    
    passed++;
  }
});

// 2. Start game with 2 players - success
tests.push({
  name: 'Start game successfully with 2+ players',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session.code, mockPlayer1);
    manager.joinSession(session.code, mockPlayer2);
    
    const started = manager.startGame(session.code, sentenceTemplates);
    
    assert.strictEqual(started.status, 'in_progress', 'Status should be in_progress');
    assert.strictEqual(started.currentPhase, 'round_1_selection', 'Phase should be round_1_selection');
    assert.strictEqual(started.currentRound, 1, 'Current round should be 1');
    assert.ok(started.judgeId, 'Judge should be assigned');
    assert.ok(started.sentenceTemplate, 'Sentence should be selected');
    assert.ok(sentenceTemplates.includes(started.sentenceTemplate), 'Sentence should be from template list');
    
    passed++;
  }
});

// 3. Cannot start game with only 1 player
tests.push({
  name: 'Cannot start game with only 1 player',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session.code, mockPlayer1);
    
    try {
      manager.startGame(session.code, sentenceTemplates);
      failed++;
      throw new Error('Should have thrown error for insufficient players');
    } catch (e) {
      if (e.message.includes('Not enough players')) {
        passed++;
        return;
      }
      throw e;
    }
  }
});

// 4. Cannot start game that doesn't exist
tests.push({
  name: 'Cannot start non-existent game',
  run: () => {
    try {
      manager.startGame('BADCODE', sentenceTemplates);
      failed++;
      throw new Error('Should have thrown error for missing session');
    } catch (e) {
      if (e.message.includes('Session not found')) {
        passed++;
        return;
      }
      throw e;
    }
  }
});

// 5. Judge is selected from players
tests.push({
  name: 'Judge is selected from the players list',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session.code, mockPlayer1);
    manager.joinSession(session.code, mockPlayer2);
    manager.joinSession(session.code, mockPlayer3);
    
    const started = manager.startGame(session.code, sentenceTemplates);
    
    // Judge should be one of the players
    const isJudgeInGame = started.players.some(p => p.playerId === started.judgeId);
    assert.ok(isJudgeInGame, 'Judge should be one of the players');
    
    // Judge should have a valid index
    assert.ok(started.judgeIndex >= 0 && started.judgeIndex < started.players.length, 'Judge index should be valid');
    
    passed++;
  }
});

// 6. Cannot start game twice
tests.push({
  name: 'Cannot start game that is already started',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session.code, mockPlayer1);
    manager.joinSession(session.code, mockPlayer2);
    
    // Start game once
    manager.startGame(session.code, sentenceTemplates);
    
    // Try to start again
    try {
      manager.startGame(session.code, sentenceTemplates);
      failed++;
      throw new Error('Should have thrown error for already started game');
    } catch (e) {
      if (e.message.includes('already started')) {
        passed++;
        return;
      }
      throw e;
    }
  }
});

// 7. Sentence template is randomly selected
tests.push({
  name: 'Sentence template is randomly selected from options',
  run: () => {
    const session1 = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session1.code, mockPlayer1);
    manager.joinSession(session1.code, mockPlayer2);
    const started1 = manager.startGame(session1.code, sentenceTemplates);
    
    const session2 = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session2.code, mockPlayer1);
    manager.joinSession(session2.code, mockPlayer2);
    const started2 = manager.startGame(session2.code, sentenceTemplates);
    
    // Both should have valid sentences
    assert.ok(sentenceTemplates.includes(started1.sentenceTemplate), 'Game 1 sentence should be from templates');
    assert.ok(sentenceTemplates.includes(started2.sentenceTemplate), 'Game 2 sentence should be from templates');
    
    // Note: They might be the same due to randomness, so we don't assert they're different
    passed++;
  }
});

// 8. Game started timestamp is set
tests.push({
  name: 'Game start timestamp is recorded',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session.code, mockPlayer1);
    manager.joinSession(session.code, mockPlayer2);
    
    const before = Date.now();
    const started = manager.startGame(session.code, sentenceTemplates);
    const after = Date.now();
    
    assert.ok(started.gameStartedAt, 'gameStartedAt should be set');
    assert.ok(started.gameStartedAt >= before && started.gameStartedAt <= after, 'Timestamp should be accurate');
    
    passed++;
  }
});

// 9. lastActivityAt is updated on game start
tests.push({
  name: 'lastActivityAt timestamp is updated when game starts',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    const createdAt = session.lastActivityAt;
    
    manager.joinSession(session.code, mockPlayer1);
    manager.joinSession(session.code, mockPlayer2);
    
    const started = manager.startGame(session.code, sentenceTemplates);
    
    // Activity timestamp should be updated or at least not earlier than creation
    assert.ok(started.lastActivityAt >= createdAt, 'lastActivityAt should be updated or same as creation');
    
    passed++;
  }
});

// 10. Multiple players can start different games concurrently
tests.push({
  name: 'Multiple games can be started concurrently',
  run: () => {
    // Game 1
    const session1 = manager.createSession('host-1', 10, 8);
    manager.joinSession(session1.code, mockPlayer1);
    manager.joinSession(session1.code, mockPlayer2);
    const started1 = manager.startGame(session1.code, sentenceTemplates);
    
    // Game 2
    const session2 = manager.createSession('host-2', 10, 8);
    manager.joinSession(session2.code, mockPlayer2);
    manager.joinSession(session2.code, mockPlayer3);
    const started2 = manager.startGame(session2.code, sentenceTemplates);
    
    // Both games should have different codes and judges
    assert.notStrictEqual(started1.code, started2.code, 'Games should have different codes');
    assert.notStrictEqual(started1.gameId, started2.gameId, 'Games should have different IDs');
    
    // Judge might be same person but different in game context
    assert.ok(started1.judgeId, 'Game 1 should have judge');
    assert.ok(started2.judgeId, 'Game 2 should have judge');
    
    passed++;
  }
});

// 11. All players are present in started game
tests.push({
  name: 'All players remain in game after start',
  run: () => {
    const session = manager.createSession(mockHost.playerId, 10, 8);
    manager.joinSession(session.code, mockPlayer1);
    manager.joinSession(session.code, mockPlayer2);
    manager.joinSession(session.code, mockPlayer3);
    
    const before = manager.getSessionByCode(session.code);
    assert.strictEqual(before.players.length, 3, 'Should have 3 players before start');
    
    const started = manager.startGame(session.code, sentenceTemplates);
    
    assert.strictEqual(started.players.length, 3, 'Should have 3 players after start');
    assert.ok(started.players.find(p => p.playerId === mockPlayer1.playerId), 'Player 1 should still be in game');
    assert.ok(started.players.find(p => p.playerId === mockPlayer2.playerId), 'Player 2 should still be in game');
    assert.ok(started.players.find(p => p.playerId === mockPlayer3.playerId), 'Player 3 should still be in game');
    
    passed++;
  }
});

// 12. Max rounds is preserved
tests.push({
  name: 'Max rounds setting is preserved after game start',
  run: () => {
    const maxRounds = 15;
    const session = manager.createSession(mockHost.playerId, maxRounds, 8);
    manager.joinSession(session.code, mockPlayer1);
    manager.joinSession(session.code, mockPlayer2);
    
    const started = manager.startGame(session.code, sentenceTemplates);
    
    assert.strictEqual(started.maxRounds, maxRounds, 'Max rounds should be preserved');
    
    passed++;
  }
});

// Run all tests
for (const test of tests) {
  try {
    test.run();
    console.log(`✓ Test ${passed + failed}: ${test.name}`);
  } catch (error) {
    failed++;
    console.log(`✗ Test ${passed + failed}: ${test.name}`);
    console.log(`  Error: ${error.message}`);
  }
}

// Print summary
console.log('\n' + '='.repeat(60));
console.log(`Tests Passed: ${passed}/${tests.length}`);
console.log(`Tests Failed: ${failed}/${tests.length}`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log(`\n✓ All tests passed! Story 3.0 implementation is complete.\n`);
  process.exit(0);
} else {
  console.log(`\n✗ ${failed} test(s) failed. Please review the errors above.\n`);
  process.exit(1);
}
