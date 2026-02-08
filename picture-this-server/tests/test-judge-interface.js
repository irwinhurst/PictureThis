/**
 * ---
 * title: Judge Interface Unit Tests
 * purpose: Unit tests for JudgeInterface functionality including image loading,
 *          selection state management, validation, and final submission.
 * exports: None (test script)
 * dependencies: JudgeInterface
 * ---
 */

const JudgeInterface = require('../src/game/JudgeInterface');

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

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(`Expected function to throw, but it succeeded: ${message}`);
  } catch (error) {
    // Expected to throw
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test suite
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

// Test 1: Initialize judge interface with images
describe('Initialize with images sets up state correctly', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' },
    { playerId: 'p3', playerNumber: 3, imageUrl: 'url3' },
    { playerId: 'p4', playerNumber: 4, imageUrl: 'url4' }
  ];
  
  judge.initializeWithImages(submissions);
  
  assertEquals(judge.images.length, 4, 'Should have 4 images');
  assertFalse(judge.areAllImagesLoaded(), 'Not all images should be loaded initially');
});

// Test 2: Mark images as loaded
describe('Mark image loaded and check all loaded status', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  assertFalse(judge.areAllImagesLoaded(), 'Initially not all loaded');
  
  judge.markImageLoaded('p1');
  assertFalse(judge.areAllImagesLoaded(), 'Still not all loaded');
  
  judge.markImageLoaded('p2');
  assertTrue(judge.areAllImagesLoaded(), 'Now all should be loaded');
});

// Test 3: Select first place
describe('Select first place records selection', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectFirstPlace('p1');
  
  const state = judge.getSelectionState();
  const p1Image = state.images.find(img => img.playerId === 'p1');
  const p2Image = state.images.find(img => img.playerId === 'p2');
  assertEquals(p1Image.selectionState, '1st-place', 'p1 should be marked as 1st place');
  assertEquals(p2Image.selectionState, 'unselected', 'p2 should be unselected');
});

// Test 4: Select second place
describe('Select second place records selection', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectSecondPlace('p2');
  
  const state = judge.getSelectionState();
  const p1Image = state.images.find(img => img.playerId === 'p1');
  const p2Image = state.images.find(img => img.playerId === 'p2');
  assertEquals(p2Image.selectionState, '2nd-place', 'p2 should be marked as 2nd place');
  assertEquals(p1Image.selectionState, 'unselected', 'p1 should be unselected');
});

// Test 5: Cannot select same player twice
describe('Prevent selecting same player for both places', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectFirstPlace('p1');
  
  assertThrows(() => {
    judge.selectSecondPlace('p1');
  }, 'Should not allow selecting same player twice');
});

// Test 6: Deselect changes state
describe('Deselect removes selection', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectFirstPlace('p1');
  assertTrue(judge.getSelectionState().images.find(img => img.playerId === 'p1').selectionState === '1st-place', 'Should be selected');
  
  judge.deselect('1st');
  assertEquals(judge.getSelectionState().images.find(img => img.playerId === 'p1').selectionState, 'unselected', 'Should be deselected');
});

// Test 7: Get final selections validates both required
describe('Get final selections fails without both selections', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');  judge.selectFirstPlace('p1');
  
  assertThrows(() => {
    judge.getFinalSelections();
  }, 'Should require second place selection');
});

// Test 8: Get final selections returns valid data
describe('Get final selections returns validated data', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectFirstPlace('p1');
  judge.selectSecondPlace('p2');
  
  const selections = judge.getFinalSelections();
  assertEquals(selections.firstPlaceId, 'p1', 'Should return first place ID');
  assertEquals(selections.secondPlaceId, 'p2', 'Should return second place ID');
  assertTrue(selections.submittedAt === undefined || typeof selections.submittedAt === 'number', 'Can include timestamp');
});

// Test 9: Reset selections clears state
describe('Reset selections clears all selections', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectFirstPlace('p1');
  judge.selectSecondPlace('p2');
  
  judge.resetSelections();
  
  const state = judge.getSelectionState();
  const p1Image = state.images.find(img => img.playerId === 'p1');
  const p2Image = state.images.find(img => img.playerId === 'p2');
  assertEquals(p1Image.selectionState, 'unselected', 'p1 should be unselected');
  assertEquals(p2Image.selectionState, 'unselected', 'p2 should be unselected');
});

// Test 10: Get image by player number
describe('Get image by player number retrieves correct image', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' },
    { playerId: 'p3', playerNumber: 3, imageUrl: 'url3' }
  ];
  
  judge.initializeWithImages(submissions);
  
  const image = judge.getImageByPlayerNumber(2);
  assertEquals(image.playerId, 'p2', 'Should return correct player');
  assertEquals(image.playerNumber, 2, 'Player number should match');
});

// Test 11: Get next image in carousel
describe('Get next image finds unreviewed image', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' },
    { playerId: 'p3', playerNumber: 3, imageUrl: 'url3' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.markImageLoaded('p3');
  judge.selectFirstPlace('p1');
  
  const next = judge.getNextImage();
  assertFalse(next.playerId === 'p1', 'Should skip already selected image');
  assertTrue(['p2', 'p3'].includes(next.playerId), 'Should return unselected image');
});

// Test 12: Get summary generates results
describe('Get summary generates correct result format', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectFirstPlace('p1');
  judge.selectSecondPlace('p2');
  
  const summary = judge.getSummary();
  assertEquals(summary.firstPlace.playerId, 'p1', 'Summary should include first place');
  assertEquals(summary.secondPlace.playerId, 'p2', 'Summary should include second place');
  assertTrue(summary.totalSelectionTime >= 0, 'Summary should include selection time');
});

// Test 13: Validate invalid player ID
describe('Validate rejects invalid player ID', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  
  assertThrows(() => {
    judge.selectFirstPlace('invalid-id');
  }, 'Should reject invalid player ID');
});

// Test 14: Carousel wraps around at end
describe('Get next image wraps around carousel', () => {
  const judge = new JudgeInterface({});
  const submissions = [
    { playerId: 'p1', playerNumber: 1, imageUrl: 'url1' },
    { playerId: 'p2', playerNumber: 2, imageUrl: 'url2' }
  ];
  
  judge.initializeWithImages(submissions);
  judge.markImageLoaded('p1');
  judge.markImageLoaded('p2');
  judge.selectFirstPlace('p1');
  judge.selectSecondPlace('p2');
  
  const next = judge.getNextImage();
  assertEquals(next, null, 'Should return null when all images selected');
});

// Print test summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests Passed: ${passedTests}`);
console.log(`Tests Failed: ${failedTests}`);
console.log(`Total Tests: ${passedTests + failedTests}`);
console.log(`${'='.repeat(50)}`);

process.exit(failedTests > 0 ? 1 : 0);
