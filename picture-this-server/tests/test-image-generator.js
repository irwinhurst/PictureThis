/**
 * Test suite for ImageGeneratorService
 * Tests image generation, queue management, retry logic, and error handling
 */

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

// Test configuration
const MOCK_API_KEY = 'sk-test-mock-key-for-testing';

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

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

async function runTest(name, testFn) {
  testNumber++;
  try {
    console.log(`\nTest ${testNumber}: ${name}`);
    await testFn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

// ==============================================================================
// TESTS
// ==============================================================================

async function test1_ServiceInitialization() {
  const service = new ImageGeneratorService({
    apiKey: MOCK_API_KEY,
    serviceType: 'dalle3',
    timeout: 30000,
    maxConcurrent: 2
  });
  
  assertEqual(service.serviceType, 'dalle3', 'Service type should be dalle3');
  assertEqual(service.apiKey, MOCK_API_KEY, 'API key should match');
  assertEqual(service.timeout, 30000, 'Timeout should be 30000');
  assertEqual(service.maxConcurrent, 2, 'Max concurrent should be 2');
  assertEqual(service.activeRequests, 0, 'Should start with 0 active requests');
  assertEqual(service.queue.length, 0, 'Queue should be empty');
}

async function test2_ServiceInitializationWithoutAPIKey() {
  try {
    const service = new ImageGeneratorService({
      apiKey: null,
      serviceType: 'dalle3'
    });
    assert(false, 'Should have thrown error for missing API key');
  } catch (error) {
    assert(error.message.includes('API key is required'), 'Should throw API key error');
  }
}

async function test3_ServiceInitializationFromEnv() {
  // Set environment variables
  process.env.OPENAI_API_KEY = 'sk-env-test-key';
  process.env.IMAGE_GENERATION_SERVICE = 'dalle3';
  process.env.IMAGE_GENERATION_TIMEOUT = '45000';
  process.env.IMAGE_GENERATION_MAX_CONCURRENT = '3';
  
  const service = new ImageGeneratorService();
  
  assertEqual(service.apiKey, 'sk-env-test-key', 'Should load API key from env');
  assertEqual(service.serviceType, 'dalle3', 'Should load service type from env');
  assertEqual(service.timeout, 45000, 'Should load timeout from env');
  assertEqual(service.maxConcurrent, 3, 'Should load maxConcurrent from env');
}

async function test4_PromptFormatterIntegration() {
  const sentenceTemplate = 'The _______ was eating a _______ at the beach';
  const selectedCards = ['Disco-Dancing Llama', 'Giant Pizza'];
  const artStyle = 'cartoon';
  
  const { prompt, completedSentence, artStyle: returnedStyle } = 
    PromptFormatter.formatImagePrompt(sentenceTemplate, selectedCards, artStyle);
  
  assertNotNull(prompt, 'Prompt should not be null');
  assertEqual(completedSentence, 'The Disco-Dancing Llama was eating a Giant Pizza at the beach', 
    'Completed sentence should match');
  assertEqual(returnedStyle, 'cartoon', 'Art style should match');
  assert(prompt.includes(completedSentence), 'Prompt should contain completed sentence');
}

async function test5_GenerateImagesForRoundStructure() {
  const service = new ImageGeneratorService({
    apiKey: MOCK_API_KEY,
    serviceType: 'dalle3'
  });
  
  // Mock the generateImage method to return placeholder without making API calls
  service.generateImage = async (prompt, gameCode, roundId, playerId, artStyle, completedSentence) => {
    return {
      imageUrl: `/generated-images/${gameCode}/round-${roundId}/${playerId}.png`,
      imagePath: `/generated-images/${gameCode}/round-${roundId}/${playerId}.png`,
      completedSentence,
      artStyle,
      generatedAt: new Date().toISOString(),
      isPlaceholder: false
    };
  };
  
  const mockGameState = {
    gameId: 'test-game-123',
    code: 'ABCD',
    currentRound: 1,
    sentenceTemplate: 'The _______ met a _______',
    judgeId: 'player-1',
    playerSelections: {
      'player-2': ['Dragon', 'Unicorn'],
      'player-3': ['Pizza', 'Robot'],
      'player-4': ['Wizard', 'Ninja']
    }
  };
  
  const results = await service.generateImagesForRound(mockGameState);
  
  assertEqual(results.length, 3, 'Should generate 3 images (excluding judge)');
  assert(results.every(r => r.playerId), 'All results should have playerId');
  assert(results.every(r => r.imagePath), 'All results should have imagePath');
  assert(results.every(r => r.completedSentence), 'All results should have completedSentence');
}

async function test6_QueueManagement() {
  const service = new ImageGeneratorService({
    apiKey: MOCK_API_KEY,
    serviceType: 'dalle3',
    maxConcurrent: 1 // Only 1 concurrent request
  });
  
  // Mock the _executeGeneration to simulate work
  let executionCount = 0;
  service._executeGeneration = async (request) => {
    executionCount++;
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms "work"
    return {
      imageUrl: '/test.png',
      imagePath: '/test.png',
      completedSentence: request.completedSentence,
      artStyle: request.artStyle,
      generatedAt: new Date().toISOString()
    };
  };
  
  // Queue 3 requests
  const promises = [
    service.generateImage('prompt1', 'GAME', 1, 'p1', 'realistic', 'Sentence 1'),
    service.generateImage('prompt2', 'GAME', 1, 'p2', 'cartoon', 'Sentence 2'),
    service.generateImage('prompt3', 'GAME', 1, 'p3', 'cinematic', 'Sentence 3')
  ];
  
  // All should complete eventually
  const results = await Promise.all(promises);
  
  assertEqual(results.length, 3, 'All 3 requests should complete');
  assertEqual(executionCount, 3, 'All 3 requests should execute');
  assert(results.every(r => r.imagePath), 'All results should have paths');
}

async function test7_ErrorHandlingReturnsPlaceholder() {
  const service = new ImageGeneratorService({
    apiKey: MOCK_API_KEY,
    serviceType: 'dalle3'
  });
  
  // Mock _callImageAPI to always fail
  service._callImageAPI = async () => {
    throw new Error('API Error');
  };
  
  const result = await service._executeGeneration({
    prompt: 'test prompt',
    gameCode: 'TEST',
    roundId: 1,
    playerId: 'p1',
    artStyle: 'realistic',
    completedSentence: 'Test sentence'
  });
  
  assertEqual(result.isPlaceholder, true, 'Should return placeholder on error');
  assertEqual(result.imageUrl, service.placeholderPath, 'Should use placeholder path');
  assertNotNull(result.error, 'Should include error message');
}

async function test8_SleepUtility() {
  const service = new ImageGeneratorService({
    apiKey: MOCK_API_KEY,
    serviceType: 'dalle3'
  });
  
  const startTime = Date.now();
  await service._sleep(100);
  const elapsed = Date.now() - startTime;
  
  assert(elapsed >= 95 && elapsed <= 150, `Sleep should be ~100ms, was ${elapsed}ms`);
}

async function test9_PlaceholderPathConfiguration() {
  const service = new ImageGeneratorService({
    apiKey: MOCK_API_KEY,
    serviceType: 'dalle3'
  });
  
  assertEqual(service.placeholderPath, '/images/placeholder-image-error.png', 
    'Placeholder path should be correct');
}

async function test10_ServiceTypeValidation() {
  const service = new ImageGeneratorService({
    apiKey: MOCK_API_KEY,
    serviceType: 'invalid-service'
  });
  
  try {
    await service._callImageAPI('test', 'GAME', 1, 'p1');
    assert(false, 'Should throw error for unsupported service');
  } catch (error) {
    assert(error.message.includes('Unsupported service type'), 'Should throw service type error');
  }
}

// ==============================================================================
// RUN ALL TESTS
// ==============================================================================

async function runAllTests() {
  console.log('=== ImageGeneratorService Tests ===\n');
  
  await runTest('Service initialization with config', test1_ServiceInitialization);
  await runTest('Service initialization without API key', test2_ServiceInitializationWithoutAPIKey);
  await runTest('Service initialization from environment', test3_ServiceInitializationFromEnv);
  await runTest('PromptFormatter integration', test4_PromptFormatterIntegration);
  await runTest('Generate images for round structure', test5_GenerateImagesForRoundStructure);
  await runTest('Queue management with concurrency limit', test6_QueueManagement);
  await runTest('Error handling returns placeholder', test7_ErrorHandlingReturnsPlaceholder);
  await runTest('Sleep utility timing', test8_SleepUtility);
  await runTest('Placeholder path configuration', test9_PlaceholderPathConfiguration);
  await runTest('Service type validation', test10_ServiceTypeValidation);
  
  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.log(`✗ ${failed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
