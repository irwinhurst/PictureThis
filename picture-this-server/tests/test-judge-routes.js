/**
 * ---
 * title: Judge Routes API Integration Tests
 * purpose: Integration tests for judge phase API endpoints including image
 *          retrieval, selection submission, status monitoring, and selection resumption.
 * exports: None (test script)
 * dependencies: express, GameSessionManager, judgeRoutes
 * ---
 */

const http = require('http');
const express = require('express');
const GameSessionManager = require('../src/game/GameSessionManager');
const createJudgeRoutes = require('../src/routes/judge');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;
let server = null;
let app = null;
let manager = null;

function describe(name, testFn) {
  return new Promise(async (resolve) => {
    try {
      await testFn();
      console.log(`✓ ${name}`);
      testsPassed++;
      resolve();
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(`  ${error.message}`);
      testsFailed++;
      resolve();
    }
  });
}

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

// HTTP helper function
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Setup
async function setupTests() {
  // Create manager
  manager = new GameSessionManager({
    timeoutMinutes: 60,
    checkIntervalSeconds: 300
  });

  // Create express app
  app = express();
  app.use(express.json());
  
  // Setup judge routes
  const setupJudgeRoutes = require('../src/routes/judge');
  setupJudgeRoutes(app, { sessionManager: manager });

  // Start server on a different port
  server = app.listen(3002, () => {
    console.log('Test server started on port 3002\n');
  });
}

// Teardown
async function teardownTests() {
  if (server) {
    server.close();
  }
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`${'='.repeat(50)}`);
}

// Run all tests
async function runTests() {
  await setupTests();

  // Test 1: Get images returns list with correct fields
  await describe('GET /api/judge/:code/images returns images list', async () => {
    const session = manager.createSession('host-1', 5, 8);
    manager.joinSession(session.code, { playerId: 'p1', name: 'Alice', avatar: '🎨' });
    manager.joinSession(session.code, { playerId: 'p2', name: 'Bob', avatar: '🎭' });
    
    const sentenceTemplates = ['Test _____'];
    manager.startGame(session.code, sentenceTemplates);
    
    // Add mock submissions
    const sess = manager.getSessionByCode(session.code);
    sess.currentPhase = 'judge_phase';
    sess.players[0].submission = 'image1.jpg';
    sess.players[1].submission = 'image2.jpg';
    manager.store.set(session.code, sess);
    
    const result = await makeRequest('GET', `/api/judge/${session.code}/images`);
    
    assertEquals(result.status, 200, 'Should return 200');
    assert(result.body.images, 'Should return images array');
    assert(result.body.totalImages > 0, 'Should have images');
  });

  // Test 2: Get images returns 404 for non-existent game
  await describe('GET /api/judge/:code/images returns 404 for invalid code', async () => {
    const result = await makeRequest('GET', '/api/judge/INVALID/images');
    assertEquals(result.status, 404, 'Should return 404 for non-existent game');
  });

  // Test 3: Submit selection with valid data
  await describe('POST /api/judge/:code/submit-selection stores selections', async () => {
    const session = manager.createSession('host-2', 5, 8);
    manager.joinSession(session.code, { playerId: 'p1', name: 'Alice', avatar: '🎨' });
    manager.joinSession(session.code, { playerId: 'p2', name: 'Bob', avatar: '🎭' });
    
    const sentenceTemplates = ['Test _____'];
    manager.startGame(session.code, sentenceTemplates);
    
    const sess = manager.getSessionByCode(session.code);
    sess.currentPhase = 'judge_phase';
    sess.players[0].submission = 'image1.jpg';
    sess.players[1].submission = 'image2.jpg';
    manager.store.set(session.code, sess);
    
    const result = await makeRequest('POST', `/api/judge/${session.code}/submit-selection`, {
      firstPlaceId: sess.players[0].playerId,
      secondPlaceId: sess.players[1].playerId
    });
    
    assertEquals(result.status, 200, 'Should return 200');
    assert(result.body.selections, 'Should return selections');
    assertEquals(result.body.selections.firstPlaceId, sess.players[0].playerId, 'First place should match');
  });

  // Test 4: Submit selection rejects missing fields
  await describe('POST /api/judge/:code/submit-selection rejects incomplete data', async () => {
    const session = manager.createSession('host-3', 5, 8);
    manager.joinSession(session.code, { playerId: 'p1', name: 'Alice', avatar: '🎨' });
    
    const sentenceTemplates = ['Test _____'];
    manager.startGame(session.code, sentenceTemplates);
    
    const result = await makeRequest('POST', `/api/judge/${session.code}/submit-selection`, {
      firstPlaceId: 'p1'
      // Missing secondPlaceId
    });
    
    assertEquals(result.status, 400, 'Should return 400 for missing fields');
  });

  // Test 5: Submit selection rejects same player twice
  await describe('POST /api/judge/:code/submit-selection rejects duplicate players', async () => {
    const session = manager.createSession('host-4', 5, 8);
    manager.joinSession(session.code, { playerId: 'p1', name: 'Alice', avatar: '🎨' });
    manager.joinSession(session.code, { playerId: 'p2', name: 'Bob', avatar: '🎭' });
    
    const sentenceTemplates = ['Test _____'];
    manager.startGame(session.code, sentenceTemplates);
    
    const sess = manager.getSessionByCode(session.code);
    sess.currentPhase = 'judge_phase';
    sess.players[0].submission = 'image1.jpg';
    sess.players[1].submission = 'image2.jpg';
    manager.store.set(session.code, sess);
    
    const result = await makeRequest('POST', `/api/judge/${session.code}/submit-selection`, {
      firstPlaceId: 'p1',
      secondPlaceId: 'p1'  // Same player
    });
    
    assertEquals(result.status, 400, 'Should return 400 for duplicate players');
  });

  // Test 6: Get judge phase status
  await describe('GET /api/judge/:code/status returns current status', async () => {
    const session = manager.createSession('host-5', 5, 8);
    manager.joinSession(session.code, { playerId: 'p1', name: 'Alice', avatar: '🎨' });
    
    const sentenceTemplates = ['Test _____'];
    manager.startGame(session.code, sentenceTemplates);
    
    const sess = manager.getSessionByCode(session.code);
    sess.currentPhase = 'judge_phase';
    manager.store.set(session.code, sess);
    
    const result = await makeRequest('GET', `/api/judge/${session.code}/status`);
    
    assertEquals(result.status, 200, 'Should return 200');
    assert(result.body.status, 'Should return status');
    assert(result.body.totalPlayers !== undefined, 'Should return player count');
  });

  // Test 7: Get existing selections returns saved data
  await describe('GET /api/judge/:code/selections returns saved selections', async () => {
    const session = manager.createSession('host-6', 5, 8);
    manager.joinSession(session.code, { playerId: 'p1', name: 'Alice', avatar: '🎨' });
    manager.joinSession(session.code, { playerId: 'p2', name: 'Bob', avatar: '🎭' });
    
    const sentenceTemplates = ['Test _____'];
    manager.startGame(session.code, sentenceTemplates);
    
    const sess = manager.getSessionByCode(session.code);
    sess.currentPhase = 'judge_phase';
    sess.players[0].submission = 'image1.jpg';
    sess.players[1].submission = 'image2.jpg';
    sess.judgeSelections = {
      firstPlaceId: sess.players[0].playerId,
      secondPlaceId: sess.players[1].playerId,
      submittedAt: Date.now()
    };
    manager.store.set(session.code, sess);
    
    const result = await makeRequest('GET', `/api/judge/${session.code}/selections`);
    
    assertEquals(result.status, 200, 'Should return 200');
    assert(result.body.firstPlaceId, 'Should return first place');
    assert(result.body.secondPlaceId, 'Should return second place');
  });

  // Test 8: Get selections returns 404 if not found
  await describe('GET /api/judge/:code/selections returns 404 for missing selections', async () => {
    const session = manager.createSession('host-7', 5, 8);
    manager.joinSession(session.code, { playerId: 'p1', name: 'Alice', avatar: '🎨' });
    
    const sentenceTemplates = ['Test _____'];
    manager.startGame(session.code, sentenceTemplates);
    
    const result = await makeRequest('GET', `/api/judge/${session.code}/selections`);
    
    assertEquals(result.status, 404, 'Should return 404 if no selections saved');
  });

  // Test 9: Submit selection with invalid game code
  await describe('POST /api/judge/:code/submit-selection returns 404 for invalid code', async () => {
    const result = await makeRequest('POST', '/api/judge/INVALID/submit-selection', {
      firstPlaceId: 'p1',
      secondPlaceId: 'p2'
    });
    
    assertEquals(result.status, 404, 'Should return 404 for invalid code');
  });

  // Test 10: Get status returns 404 for non-existent game
  await describe('GET /api/judge/:code/status returns 404 for invalid code', async () => {
    const result = await makeRequest('GET', '/api/judge/INVALID/status');
    assertEquals(result.status, 404, 'Should return 404 for invalid code');
  });

  await teardownTests();
}

// Run tests
runTests().catch(console.error);
