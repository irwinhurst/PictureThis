#!/usr/bin/env node

/**
 * Story 3.2: Player Card Hand Display & Selection - Test Suite
 * Tests player card selection, submission, and phase transitions
 */

const assert = require('assert');
const GameSessionManager = require('../src/game/GameSessionManager');

console.log('🧪 Story 3.2: Player Card Hand Display & Selection - Test Suite\n');

const manager = new GameSessionManager();
let testsPassed = 0;
let testsFailed = 0;

// Helper: Create test session with players and start game
function setupGame() {
  const hostId = 'host-user-123';
  const session = manager.createSession(hostId, 5, 8);
  
  // Add 3 players
  const players = [
    { playerId: 'player-1', name: 'Alice', avatar: '👩' },
    { playerId: 'player-2', name: 'Bob', avatar: '👨' },
    { playerId: 'player-3', name: 'Charlie', avatar: '🧑' }
  ];
  
  players.forEach(p => manager.joinSession(session.code, p));
  
  // Start game
  const sentences = [
    'I SAW A _____ TRYING TO _____',
    'THE _____ WAS _____ AND _____'
  ];
  const gameSession = manager.startGame(session.code, sentences);
  
  return { code: session.code, session: gameSession, players };
}

// Test 1: Submit selection with valid data
function test1() {
  try {
    const { code, session, players } = setupGame();
    
    // Non-judge player submits selection
    const selections = { 0: 2, 1: 5 }; // Fill blank 0 with card 2, blank 1 with card 5
    const result = manager.recordPlayerSelection(code, players[0].playerId, selections);
    
    assert(result.playerSelections[players[0].playerId], 'Selection not recorded');
    assert.deepEqual(result.playerSelections[players[0].playerId].selections, selections, 'Selections mismatch');
    assert(result.playerSelections[players[0].playerId].submittedAt, 'Submission timestamp missing');
    
    console.log('✓ Test 1: Submit selection with valid data');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 1: Submit selection with valid data -', error.message);
    testsFailed++;
  }
}

// Test 2: Judge cannot submit selections
function test2() {
  try {
    const { code, session, players } = setupGame();
    const judgeId = session.judgeId;
    
    try {
      manager.recordPlayerSelection(code, judgeId, { 0: 1, 1: 2 });
      throw new Error('Judge was allowed to submit - should have failed');
    } catch (err) {
      if (err.message.includes('Judge cannot submit')) {
        console.log('✓ Test 2: Judge cannot submit selections');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 2: Judge cannot submit selections -', error.message);
    testsFailed++;
  }
}

// Test 3: Invalid selections format rejected
function test3() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    const testPlayer = nonJudgePlayers[0];
    
    try {
      manager.recordPlayerSelection(code, testPlayer.playerId, null);
      throw new Error('Null selections accepted - should have failed');
    } catch (err) {
      if (err.message.includes('Invalid selections format')) {
        console.log('✓ Test 3: Invalid selections format rejected');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 3: Invalid selections format rejected -', error.message);
    testsFailed++;
  }
}

// Test 4: Non-existent player cannot submit
function test4() {
  try {
    const { code, session, players } = setupGame();
    
    try {
      manager.recordPlayerSelection(code, 'fake-player-id', { 0: 1, 1: 2 });
      throw new Error('Fake player was allowed to submit - should have failed');
    } catch (err) {
      if (err.message.includes('Player not found')) {
        console.log('✓ Test 4: Non-existent player cannot submit');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 4: Non-existent player cannot submit -', error.message);
    testsFailed++;
  }
}

// Test 5: Get player selection retrieves correct data
function test5() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    const selections = { 0: 3, 1: 7 };
    
    manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, selections);
    const retrieved = manager.getPlayerSelection(code, nonJudgePlayers[0].playerId);
    
    assert(retrieved, 'Selection not found');
    assert.deepEqual(retrieved.selections, selections, 'Retrieved selections mismatch');
    
    console.log('✓ Test 5: Get player selection retrieves correct data');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 5: Get player selection retrieves correct data -', error.message);
    testsFailed++;
  }
}

// Test 6: Get all selections from session
function test6() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    // First non-judge player submits
    manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, { 0: 1, 1: 2 });
    
    // Second non-judge player submits
    if (nonJudgePlayers.length > 1) {
      manager.recordPlayerSelection(code, nonJudgePlayers[1].playerId, { 0: 4, 1: 5 });
    }
    
    const allSelections = manager.getPlayerSelections(code);
    
    assert(allSelections[nonJudgePlayers[0].playerId], 'Player 1 selection missing');
    if (nonJudgePlayers.length > 1) {
      assert(allSelections[nonJudgePlayers[1].playerId], 'Player 2 selection missing');
    }
    
    console.log('✓ Test 6: Get all selections from session');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 6: Get all selections from session -', error.message);
    testsFailed++;
  }
}

// Test 7: Multiple players can submit independently
function test7() {
  try {
    const { code, session, players } = setupGame();
    const selectionsList = [
      { 0: 1, 1: 2 },
      { 0: 3, 1: 4 },
      { 0: 5, 1: 6 }
    ];
    
    // All non-judge players submit
    for (let i = 0; i < players.length; i++) {
      if (players[i].playerId !== session.judgeId) {
        manager.recordPlayerSelection(code, players[i].playerId, selectionsList[i]);
      }
    }
    
    const allSelections = manager.getPlayerSelections(code);
    const submissionCount = Object.keys(allSelections).length;
    
    // Should have 2 submissions (3 players - 1 judge)
    assert.strictEqual(submissionCount, 2, `Expected 2 submissions, got ${submissionCount}`);
    
    console.log('✓ Test 7: Multiple players can submit independently');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 7: Multiple players can submit independently -', error.message);
    testsFailed++;
  }
}

// Test 8: Selection overwrites previous submission from same player
function test8() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    const playerId = nonJudgePlayers[0].playerId;
    
    // First submission
    manager.recordPlayerSelection(code, playerId, { 0: 1, 1: 2 });
    let selection = manager.getPlayerSelection(code, playerId);
    assert.deepEqual(selection.selections, { 0: 1, 1: 2 }, 'First submission failed');
    
    const firstTime = selection.submittedAt;
    
    // Wait a moment then resubmit
    const secondSelections = { 0: 5, 1: 7 };
    manager.recordPlayerSelection(code, playerId, secondSelections);
    selection = manager.getPlayerSelection(code, playerId);
    
    assert.deepEqual(selection.selections, secondSelections, 'Second submission failed');
    assert(selection.submittedAt >= firstTime, 'Timestamp not updated');
    
    console.log('✓ Test 8: Selection overwrites previous submission from same player');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 8: Selection overwrites previous submission from same player -', error.message);
    testsFailed++;
  }
}

// Test 9: Selection submission updates activity timestamp
function test9() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    const originalActivity = session.lastActivityAt;
    
    // Wait a moment
    const now = Date.now();
    while (Date.now() === now) {
      // Spin to ensure time advances
    }
    
    manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, { 0: 1, 1: 2 });
    
    const updatedSession = manager.getSessionByCode(code);
    assert(updatedSession.lastActivityAt > originalActivity, 'Activity timestamp not updated');
    
    console.log('✓ Test 9: Selection submission updates activity timestamp');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 9: Selection submission updates activity timestamp -', error.message);
    testsFailed++;
  }
}

// Test 10: Sentence template count determines required selections
function test10() {
  try {
    const { code, session, players } = setupGame();
    const nonJudgePlayers = players.filter(p => p.playerId !== session.judgeId);
    
    // Sentence: "I SAW A _____ TRYING TO _____" has 2 blanks
    const template = session.sentenceTemplate;
    const blankCount = (template.match(/_+/g) || []).length;
    
    assert(blankCount >= 1, 'No blanks found in sentence template');
    
    // Submit correct number of selections
    const selections = {};
    for (let i = 0; i < blankCount; i++) {
      selections[i] = i + 1; // Card indices
    }
    
    manager.recordPlayerSelection(code, nonJudgePlayers[0].playerId, selections);
    const retrieved = manager.getPlayerSelection(code, nonJudgePlayers[0].playerId);
    
    assert.strictEqual(Object.keys(retrieved.selections).length, blankCount, 'Selection count mismatch');
    
    console.log('✓ Test 10: Sentence template count determines required selections');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 10: Sentence template count determines required selections -', error.message);
    testsFailed++;
  }
}

// Test 11: Selection from non-existent session fails
function test11() {
  try {
    try {
      manager.recordPlayerSelection('FAKECODE', 'some-player', { 0: 1, 1: 2 });
      throw new Error('Non-existent session accepted - should have failed');
    } catch (err) {
      if (err.message.includes('Session not found')) {
        console.log('✓ Test 11: Selection from non-existent session fails');
        testsPassed++;
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('✗ Test 11: Selection from non-existent session fails -', error.message);
    testsFailed++;
  }
}

// Test 12: Get selections from non-existent session returns null
function test12() {
  try {
    const result = manager.getPlayerSelections('FAKECODE');
    assert.strictEqual(result, null, 'Expected null for non-existent session');
    
    console.log('✓ Test 12: Get selections from non-existent session returns null');
    testsPassed++;
  } catch (error) {
    console.log('✗ Test 12: Get selections from non-existent session returns null -', error.message);
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
  console.log('\n✓ All tests passed! Story 3.2 implementation is complete.');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed. Review implementation.');
  process.exit(1);
}
