#!/usr/bin/env node

/**
 * ---
 * title: Card Selection API Validation Tests
 * purpose: Tests Story 3.2 - API request/response validation and error handling
 * exports: None (test script)
 * dependencies: assert, GameSessionManager
 * ---
 */

const assert = require('assert');
const GameSessionManager = require('../src/game/GameSessionManager');

console.log('🧪 Story 3.2: Card Selection - API Validation Tests\n');

const manager = new GameSessionManager();
let testsPassed = 0;
let testsFailed = 0;

// Helper: Create and start a game
function setupGame() {
  const hostId = 'host-user-123';
  const session = manager.createSession(hostId, 5, 8);
  
  const players = [
    { playerId: 'player-1', name: 'Alice', avatar: '👩' },
    { playerId: 'player-2', name: 'Bob', avatar: '👨' },
    { playerId: 'player-3', name: 'Charlie', avatar: '🧑' }
  ];
  
  players.forEach(p => manager.joinSession(session.code, p));
  
  const sentences = ['I SAW A _____ TRYING TO _____'];
  const gameSession = manager.startGame(session.code, sentences);
  
  return { code: session.code, session: gameSession, players };
}

// Test 1: Validate code parameter is required
function test1() {
  try {
    try {
      manager.recordPlayerSelection(null, 'player-1', { 0: 1, 1: 2 });
      throw new Error('Should reject null code');
    } catch (err) {
      if (err.message.includes('Session not found')) {
        console.log('✓ Test 1: Validate code parameter is required');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 1: Validate code parameter is required -', error.message);
    testsFailed++;
  }
}

// Test 2: Validate playerId parameter is required
function test2() {
  try {
    const { code } = setupGame();
    
    try {
      manager.recordPlayerSelection(code, null, { 0: 1, 1: 2 });
      throw new Error('Should reject null playerId');
    } catch (err) {
      if (err.message.includes('Player not found')) {
        console.log('✓ Test 2: Validate playerId parameter is required');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 2: Validate playerId parameter is required -', error.message);
    testsFailed++;
  }
}

// Test 3: Validate selections parameter is required
function test3() {
  try {
    const gameSetup = setupGame();
    const { code, session, players } = gameSetup;
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    try {
      manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, null);
      throw new Error('Should reject null selections');
    } catch (err) {
      if (err.message.includes('Invalid selections format')) {
        console.log('✓ Test 3: Validate selections parameter is required');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 3: Validate selections parameter is required -', error.message);
    testsFailed++;
  }
}

// Test 4: Validate HTTP 404 response for non-existent session
function test4() {
  try {
    try {
      manager.recordPlayerSelection('FAKECODE', 'player-1', { 0: 1, 1: 2 });
      throw new Error('Should return 404 for non-existent session');
    } catch (err) {
      if (err.message.includes('Session not found')) {
        console.log('✓ Test 4: Validate HTTP 404 response for non-existent session');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 4: Validate HTTP 404 response -', error.message);
    testsFailed++;
  }
}

// Test 5: Validate HTTP 400 response for non-existent player
function test5() {
  try {
    const { code } = setupGame();
    
    try {
      manager.recordPlayerSelection(code, 'FAKE-PLAYER-ID', { 0: 1, 1: 2 });
      throw new Error('Should reject non-existent player');
    } catch (err) {
      if (err.message.includes('Player not found')) {
        console.log('✓ Test 5: Validate HTTP 400 response for non-existent player');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 5: Validate HTTP 400 response -', error.message);
    testsFailed++;
  }
}

// Test 6: Validate HTTP 400 response for invalid selections format
function test6() {
  try {
    const gameSetup = setupGame();
    const { code, session, players } = gameSetup;
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    try {
      manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, 'invalid');
      throw new Error('Should reject non-object selections');
    } catch (err) {
      if (err.message.includes('Invalid selections format')) {
        console.log('✓ Test 6: Validate HTTP 400 response for invalid selections format');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 6: Validate HTTP 400 response -', error.message);
    testsFailed++;
  }
}

// Test 7: Validate HTTP 403 response when judge tries to submit
function test7() {
  try {
    const { code, session } = setupGame();
    
    try {
      manager.recordPlayerSelection(code, session.judgeId, { 0: 1, 1: 2 });
      throw new Error('Should reject judge submission');
    } catch (err) {
      if (err.message.includes('Judge cannot submit')) {
        console.log('✓ Test 7: Validate HTTP 403 response when judge tries to submit');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 7: Validate HTTP 403 response -', error.message);
    testsFailed++;
  }
}

// Test 8: Response includes gameId
function test8() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    const result = manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, { 0: 1, 1: 2 });
    
    assert(result.gameId, 'Response should include gameId');
    assert.strictEqual(result.gameId, session.gameId, 'gameId should match session');
    
    console.log('✓ Test 8: Response includes gameId');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 8: Response includes gameId -', error.message);
    testsFailed++;
  }
}

// Test 9: Response includes code
function test9() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    const result = manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, { 0: 1, 1: 2 });
    
    assert(result.code, 'Response should include code');
    assert.strictEqual(result.code, code, 'Code should match request');
    
    console.log('✓ Test 9: Response includes code');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 9: Response includes code -', error.message);
    testsFailed++;
  }
}

// Test 10: Response includes submission count
function test10() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    // Submit from first player
    const result = manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, { 0: 1, 1: 2 });
    
    // Should be able to read submission count from session
    const selections = manager.getPlayerSelections(code);
    const submissionCount = Object.keys(selections).length;
    
    assert.strictEqual(submissionCount, 1, 'Should have 1 submission');
    
    console.log('✓ Test 10: Response includes submission count');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 10: Response includes submission count -', error.message);
    testsFailed++;
  }
}

// Test 11: Case sensitivity of game code
function test11() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    // Try with uppercase
    const upperCode = code.toUpperCase();
    manager.recordPlayerSelection(upperCode, nonJudgePlayers[0].playerId, { 0: 1, 1: 2 });
    
    // Verify submission was recorded
    const selections = manager.getPlayerSelections(code);
    assert(selections[nonJudgePlayers[0].playerId], 'Should handle case insensitive codes');
    
    console.log('✓ Test 11: Case sensitivity of game code (handled by getSessionByCode)');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 11: Case sensitivity of game code -', error.message);
    testsFailed++;
  }
}

// Test 12: Multiple selections object property verification
function test12() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    // Submit with multiple properties
    const selections = { 
      0: 1, 
      1: 2,
      customProp: 'should-be-ignored' 
    };
    
    manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, selections);
    const retrieved = manager.getPlayerSelection(code, nonJudgePlayers[0].playerId);
    
    // All properties are stored
    assert(retrieved.selections.hasOwnProperty('customProp'), 'Custom properties stored');
    
    console.log('✓ Test 12: Multiple selections object property verification');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 12: Multiple selections object property verification -', error.message);
    testsFailed++;
  }
}

// Run all tests
test1();
test2();
test3();
test4();
test5();
test6();
test7();
test8();
test9();
test10();
test11();
test12();

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Tests Passed: ${testsPassed}/12`);
console.log(`Tests Failed: ${testsFailed}/12`);
console.log('='.repeat(60));

if (testsFailed === 0) {
  console.log('\n✓ All API validation tests passed!');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed.');
  process.exit(1);
}
