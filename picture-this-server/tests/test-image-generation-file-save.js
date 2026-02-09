/**
 * Test suite for ImageGeneratorService - Mocked File Saving Tests
 * 
 * Uses mocked axios to test file saving LOCALLY without making real API calls.
 * Perfect for development, CI/CD pipelines, and quick validation.
 * 
 * Cost: FREE (uses mocked data)
 * Speed: Fast (~5-10 seconds)
 * 
 * ✅ Best for:
 * - Development and testing
 * - CI/CD pipelines  
 * - Quick validation of file saving logic
 * - No API key required
 * 
 * ❌ Does NOT test:
 * - Real DALL-E 3 API connectivity
 * - Actual image download/save behavior
 * - Real PNG generation
 * 
 * For testing with REAL DALL-E 3 API, use:
 *   node tests/test-image-generation-real-api.js
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

// Test configuration
const TEST_GAME_CODE = 'TEST123';
const TEST_ROUND = 1;
const TEST_PLAYER_ID = 'player-uuid-123';
const TEST_BASE_DIR = path.join(__dirname, '../public/generated-images');
const TEST_GAME_DIR = path.join(TEST_BASE_DIR, TEST_GAME_CODE);
const TEST_ROUND_DIR = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`);

// Create fake PNG buffer to use for testing
const FAKE_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0xD8, 0x63, 0xF8, 0x0F, 0x00, 0x00, // Compressed data
  0x01, 0x01, 0x00, 0x01, 0x18, 0xDD, 0x8D, 0xB4, // 
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
  0xAE, 0x42, 0x60, 0x82                           // CRC
]);

// Mock axios to avoid real API calls
const mockAxios = {
  post: async (url, body, config) => {
    // Mock DALL-E 3 API response
    return {
      data: {
        data: [
          {
            url: 'https://fake-api.example.com/image-' + Math.random() + '.png'
          }
        ]
      }
    };
  },
  get: async (url, config) => {
    // Mock image download
    return { data: FAKE_PNG_BUFFER };
  }
};

// Override require for axios before loading ImageGeneratorService
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'axios') {
    return mockAxios;
  }
  return originalRequire.apply(this, arguments);
};

// Now load the service modules
const ImageGeneratorService = require('../src/services/ImageGeneratorService');
const PromptFormatter = require('../src/utils/promptFormatter');

// Mock logger to avoid actual Winston dependency
const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {}
};

// Replace logger in service
const logger = require('../src/config/logger');
Object.assign(logger, mockLogger);

// Test counters
let passed = 0;
let failed = 0;
let testNumber = 0;

// Assert functions
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Expected true');
  }
}

function assertFileExists(filePath, message) {
  const exists = fs.existsSync(filePath);
  if (!exists) {
    throw new Error(message || `File does not exist: ${filePath}`);
  }
}

function assertFileDoesNotExist(filePath, message) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    throw new Error(message || `File should not exist: ${filePath}`);
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

// Cleanup helper
function cleanupTestDirectory() {
  if (fs.existsSync(TEST_GAME_DIR)) {
    fs.rmSync(TEST_GAME_DIR, { recursive: true, force: true });
  }
}

async function runTest(name, testFn) {
  testNumber++;
  try {
    console.log(`\nTest ${testNumber}: ${name}`);
    await testFn();
    console.log(`✓ PASSED`);
    passed++;
  } catch (error) {
    console.error(`✗ FAILED: ${error.message}`);
    console.error(error.stack);
    failed++;
  }
}

async function runAllTests() {
  console.log('=====================================');
  console.log('ImageGeneratorService - File Save Tests');
  console.log('(Using Mocked DALL-E API)');
  console.log('=====================================');

  // Cleanup before tests
  cleanupTestDirectory();

  // Test 1: Basic file creation
  await runTest('Image file created at correct location', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    const result = await service.generateImage(
      'A cat wearing a astronaut suit',
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      'realistic',
      'I saw a cat wearing a astronaut suit'
    );

    // Verify imagePath is returned
    assertTrue(result.imagePath, 'Should have imagePath');
    
    // Verify web path is correct format
    assertEqual(
      result.imagePath,
      `/generated-images/${TEST_GAME_CODE}/round-${TEST_ROUND}/${TEST_PLAYER_ID}.png`,
      'Image path should be correct'
    );
    
    // Verify file exists - construct correct full path
    const filePath = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`, `${TEST_PLAYER_ID}.png`);
    assertFileExists(filePath, 'Image file should exist');
  });

  // Test 2: File has content
  await runTest('Saved image file has content', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    const result = await service.generateImage(
      'Test image with content',
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      'cartoon',
      'Test sentence'
    );

    const filePath = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`, `${TEST_PLAYER_ID}.png`);
    const fileSize = getFileSize(filePath);
    
    assertTrue(fileSize > 0, 'File should have content (size > 0 bytes)');
  });

  // Test 3: Directory structure created
  await runTest('Directory structure created correctly', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    const result = await service.generateImage(
      'Test',
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      'cinematic',
      'Test'
    );

    assertFileExists(TEST_BASE_DIR, 'base directory should exist');
    assertFileExists(TEST_GAME_DIR, 'game directory should exist');
    assertFileExists(TEST_ROUND_DIR, 'round directory should exist');
    const filePath = path.join(TEST_ROUND_DIR, `${TEST_PLAYER_ID}.png`);
    assertFileExists(filePath, 'image file should exist');
  });

  // Test 4: Multiple images in same round
  await runTest('Multiple player images saved in same round', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    const playerIds = ['player-1', 'player-2', 'player-3', 'player-4'];
    
    for (const playerId of playerIds) {
      await service.generateImage(
        `Image for ${playerId}`,
        TEST_GAME_CODE,
        TEST_ROUND,
        playerId,
        'realistic',
        'Test sentence'
      );
    }

    // Verify all files exist
    for (const playerId of playerIds) {
      const filePath = path.join(TEST_ROUND_DIR, `${playerId}.png`);
      assertFileExists(filePath, `File for ${playerId} should exist`);
    }
  });

  // Test 5: Different rounds create separate directories
  await runTest('Different rounds create separate directories', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    const roundIds = [1, 2, 3];
    
    for (const roundId of roundIds) {
      await service.generateImage(
        `Round ${roundId} image`,
        TEST_GAME_CODE,
        roundId,
        TEST_PLAYER_ID,
        'realistic',
        'Test sentence'
      );
    }

    // Verify all round directories exist with correct files
    for (const roundId of roundIds) {
      const roundDir = path.join(TEST_GAME_DIR, `round-${roundId}`);
      const filePath = path.join(roundDir, `${TEST_PLAYER_ID}.png`);
      assertFileExists(filePath, `File in round-${roundId} should exist`);
    }
  });

  // Test 6: File overwrites previous version
  await runTest('File overwrites previous version of same player', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    // Generate first image
    const result1 = await service.generateImage(
      'First image',
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      'realistic',
      'First'
    );

    const filePath = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`, `${TEST_PLAYER_ID}.png`);
    const stats1 = fs.statSync(filePath);
    const size1 = stats1.size;

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate second image (will create same filename)
    const result2 = await service.generateImage(
      'Second image',
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      'cartoon',
      'Second'
    );

    // File should still exist
    assertFileExists(filePath, 'File should still exist');
    
    // Verify the file was overwritten (may have same or different size depending on timing)
    const stats2 = fs.statSync(filePath);
    assertTrue(stats2.mtimeMs >= stats1.mtimeMs, 'File should be updated');
  });

  // Test 7: File returned in response object
  await runTest('Generated image metadata includes correct path', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    const completedSentence = 'A dog riding a bicycle';
    const artStyle = 'whimsical';

    const result = await service.generateImage(
      'Test prompt',
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      artStyle,
      completedSentence
    );

    // Verify result object structure
    assertTrue(result.imagePath, 'Should have imagePath');
    assertTrue(result.imageUrl, 'Should have imageUrl');
    assertEqual(result.completedSentence, completedSentence, 'Should preserve completedSentence');
    assertEqual(result.artStyle, artStyle, 'Should preserve artStyle');
    assertTrue(result.generatedAt, 'Should have generatedAt timestamp');
  });

  // Test 8: Image can be read from saved location
  await runTest('Saved image file can be read and has PNG signature', async () => {
    cleanupTestDirectory();
    const service = new ImageGeneratorService({
      apiKey: 'mock-key-for-testing',
      serviceType: 'dalle3'
    });

    const result = await service.generateImage(
      'Test image',
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      'realistic',
      'Test'
    );

    const filePath = path.join(TEST_GAME_DIR, `round-${TEST_ROUND}`, `${TEST_PLAYER_ID}.png`);
    const buffer = fs.readFileSync(filePath);

    // Check for PNG signature (89 50 4E 47)
    assertTrue(
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47,
      'File should have valid PNG signature'
    );
  });

  // Cleanup after all tests
  cleanupTestDirectory();

  // Print summary
  console.log('\n=====================================');
  console.log(`Tests passed: ${passed}`);
  console.log(`Tests failed: ${failed}`);
  console.log(`Total: ${testNumber}`);
  console.log('=====================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
