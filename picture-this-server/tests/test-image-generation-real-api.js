/**
 * Test suite for ImageGeneratorService - Real DALL-E 3 API Testing
 * 
 * ⚠️  WARNING: This test makes REAL API calls to DALL-E 3!
 * Cost: ~$0.04 per image
 * This test generates 2 images = ~$0.08 per run
 * 
 * Requirements:
 * - OPENAI_API_KEY environment variable or in .env file
 * - Valid OpenAI API key with available credits (minimum $0.10)
 * - Internet connection required
 * - Account must have DALL-E billing enabled
 * 
 * Setup Instructions:
 * 1. Get API key: https://platform.openai.com/api-keys
 * 2. Set billing: https://platform.openai.com/account/billing/overview
 * 3. Ensure sufficient credits for test ($0.10+)
 * 4. Run test:
 *    OPENAI_API_KEY=sk-... node tests/test-image-generation-real-api.js
 * 
 * Common Issues:
 * - "billing_hard_limit_reached": Account has $0 balance. Add payment method.
 * - "invalid_request_error": Check API key format and DALLE-3 availability
 * - "timeout": DALL-E API is slow. Wait 30-120 seconds per image.
 * 
 * For development/testing with mocks, use:
 *   node tests/test-image-generation-file-save.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// SAFETY CHECK: API Key validation
// ============================================================================

if (!process.env.OPENAI_API_KEY) {
  console.error('\n❌ ERROR: OPENAI_API_KEY environment variable not set\n');
  console.error('This test requires a valid OpenAI API key to make real DALL-E 3 calls\n');
  console.error('Usage:');
  console.error('  OPENAI_API_KEY=sk-... node tests/test-image-generation-real-api.js\n');
  process.exit(1);
}

// ============================================================================
// Setup and Configuration
// ============================================================================

const TEST_GAME_CODE = 'REALAPITEST';
const TEST_ROUND = 1;
const TEST_PLAYER_IDS = ['player-real-1', 'player-real-2'];
const TEST_BASE_DIR = path.join(__dirname, '../public/generated-images');
const TEST_GAME_DIR = path.join(TEST_BASE_DIR, TEST_GAME_CODE);

// Mock logger with visible output
const mockLogger = {
  info: (msg, data) => console.log(`   [INFO] ${msg}`, data ? JSON.stringify(data, null, 0) : ''),
  debug: () => {},
  warn: (msg, data) => console.log(`   [WARN] ${msg}`),
  error: (msg, data) => console.error(`   [ERROR] ${msg}`, data ? JSON.stringify(data, null, 0) : '')
};

// Replace logger before requiring service
const logger = require('../src/config/logger');
Object.assign(logger, mockLogger);

// Load service modules
const ImageGeneratorService = require('../src/services/ImageGeneratorService');
const PromptFormatter = require('../src/utils/promptFormatter');

// Test counters
let passed = 0;
let failed = 0;
let testNumber = 0;

// ============================================================================
// Test Framework
// ============================================================================

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) throw new Error(message || 'Expected true');
}

function assertFileExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message || `File does not exist: ${filePath}`);
  }
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (e) {
    return 0;
  }
}

function cleanupTestDirectory() {
  if (fs.existsSync(TEST_GAME_DIR)) {
    fs.rmSync(TEST_GAME_DIR, { recursive: true, force: true });
  }
}

async function runTest(name, testFn) {
  testNumber++;
  try {
    console.log(`\n📝 Test ${testNumber}: ${name}`);
    await testFn();
    console.log(`   ✅ PASSED`);
    passed++;
  } catch (error) {
    console.error(`   ❌ FAILED: ${error.message}`);
    console.error(`   ${error.stack.split('\n')[1]}`);
    failed++;
  }
}

// ============================================================================
// REAL API TESTS - Using actual DALL-E 3
// ============================================================================

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   DALL-E 3 REAL API IMAGE GENERATION TEST SUITE   ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log('║ ⚠️  Making REAL API calls to DALL-E 3            ║');
  console.log('║ 💰 Cost: ~$0.08 for this test run               ║');
  console.log('║ 🌐 Requires: Active internet connection          ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  cleanupTestDirectory();

  // Test 1: Generate single image and verify it saves
  await runTest('Generate single image via real DALL-E 3 API', async () => {
    const service = new ImageGeneratorService({
      apiKey: process.env.OPENAI_API_KEY,
      serviceType: 'dalle3',
      timeout: 120000 // 2 minute timeout for API
    });

    const playerId = TEST_PLAYER_IDS[0];
    console.log(`   Calling DALL-E 3 API for player ${playerId}...`);
    
    const result = await service.generateImage(
      'A majestic golden retriever wearing sunglasses at a beach',
      TEST_GAME_CODE,
      TEST_ROUND,
      playerId,
      'realistic',
      'I saw a golden retriever wearing sunglasses at a beach'
    );

    console.log(`   ✓ DALL-E API returned image URL`);
    
    // Verify result structure
    assertTrue(result.imagePath, 'Should have imagePath');
    assertTrue(result.imageUrl, 'Should have imageUrl');
    assertEqual(result.artStyle, 'realistic', 'Should preserve art style');
    
    // Verify file was saved
    const filePath = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`, `${playerId}.png`);
    assertFileExists(filePath, 'Image file should exist on disk');
    
    // Verify file has content
    const fileSize = getFileSize(filePath);
    assertTrue(fileSize > 10000, `File should be substantial (${fileSize} bytes)`);
    
    console.log(`   ✓ Image saved to: ${filePath}`);
    console.log(`   ✓ File size: ${(fileSize / 1024).toFixed(2)} KB`);
  });

  // Test 2: Generate multiple images for different players
  await runTest('Generate multiple images in same round', async () => {
    // Test 1 already created player-real-1, now add player-real-2
    const service = new ImageGeneratorService({
      apiKey: process.env.OPENAI_API_KEY,
      serviceType: 'dalle3',
      timeout: 120000
    });

    const playerId = TEST_PLAYER_IDS[1];
    console.log(`   Calling DALL-E 3 API for player ${playerId}...`);
    
    const result = await service.generateImage(
      'A wise owl perched on an ancient oak tree at sunset',
      TEST_GAME_CODE,
      TEST_ROUND,
      playerId,
      'cinematic',
      'I saw a wise owl perched on an ancient oak tree at sunset'
    );

    console.log(`   ✓ DALL-E API returned image URL`);
    
    // Verify both player images exist
    for (const pid of TEST_PLAYER_IDS) {
      const filePath = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`, `${pid}.png`);
      assertFileExists(filePath, `Image for ${pid} should exist`);
      const size = getFileSize(filePath);
      console.log(`   ✓ Player ${pid}: ${(size / 1024).toFixed(2)} KB`);
    }
  });

  // Test 3: Verify downloaded image is valid PNG
  await runTest('Downloaded image has valid PNG signature', async () => {
    const filePath = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`, `${TEST_PLAYER_IDS[0]}.png`);
    
    console.log(`   Reading image from: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    
    // PNG signature: 89 50 4E 47 (in hex)
    const pngSignature = [0x89, 0x50, 0x4E, 0x47];
    const matches = pngSignature.every((byte, i) => buffer[i] === byte);
    
    assertTrue(matches, 'File should have valid PNG magic number');
    console.log(`   ✓ PNG signature valid: ${buffer.slice(0, 4).toString('hex')}`);
    console.log(`   ✓ File size: ${buffer.length} bytes`);
  });

  // Summary
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log(`║ ✅ Tests Passed: ${passed.toString().padEnd(34)}║`);
  console.log(`║ ❌ Tests Failed: ${failed.toString().padEnd(34)}║`);
  console.log(`║ Total Tests: ${testNumber.toString().padEnd(37)}║`);
  console.log('╚════════════════════════════════════════════════════╝\n');

  if (failed === 0) {
    console.log('💚 All tests passed! DALL-E 3 integration is working correctly.\n');
    console.log('Generated images saved to:');
    console.log(`  ${TEST_GAME_DIR}\n`);
  }

  cleanupTestDirectory();
  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================================
// Run Tests
// ============================================================================

runAllTests().catch(error => {
  console.error('❌ Test suite crashed:', error);
  process.exit(1);
});
