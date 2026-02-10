/**
 * Simple test script to generate a DALL-E image and save it permanently
 * 
 * This script generates a single image using DALL-E 3 API and saves it to disk.
 * The image is NOT deleted after generation - it remains for inspection.
 * 
 * Usage:
 *   OPENAI_API_KEY=your-key node tests/test-generate-and-keep-image.js
 * 
 * Cost: ~$0.04 per run (DALL-E 3 standard quality 1024x1024)
 * 
 * Generated images are saved to:
 *   public/generated-images/TEST_PERSIST/round-1/{timestamp}.png
 */

const fs = require('fs');
const path = require('path');

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable not set');
  console.error('Run with: OPENAI_API_KEY=your-key-here node tests/test-generate-and-keep-image.js');
  process.exit(1);
}

// Mock logger to avoid actual Winston dependency
const mockLogger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ''),
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data ? JSON.stringify(data) : ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data ? JSON.stringify(data) : '')
};

// Replace logger before requiring service
const logger = require('../src/config/logger');
Object.assign(logger, mockLogger);

// Now load the service
const ImageGeneratorService = require('../src/services/ImageGeneratorService');

// Test configuration
const TEST_GAME_CODE = 'TEST_PERSIST';
const TEST_ROUND = 1;
const TEST_PLAYER_ID = `player-${Date.now()}`;

async function generateAndKeepImage() {
  console.log('=====================================');
  console.log('DALL-E 3 Image Generator Test');
  console.log('Persistent Image Generation');
  console.log('=====================================\n');

  console.log('⚠️  COST WARNING: This will charge ~$0.04 to your OpenAI account\n');

  const service = new ImageGeneratorService({
    apiKey: process.env.OPENAI_API_KEY,
    serviceType: 'dalle3'
  });

  try {
    console.log('🎨 Generating image with DALL-E 3...');
    console.log(`   Game Code: ${TEST_GAME_CODE}`);
    console.log(`   Round: ${TEST_ROUND}`);
    console.log(`   Player ID: ${TEST_PLAYER_ID}\n`);

    const prompt = 'A whimsical scene of a cat wearing a wizard hat, casting magical sparkles, digital art style';
    const completedSentence = 'The wizard cat cast a spell of infinite curiosity';
    const artStyle = 'whimsical';

    const startTime = Date.now();
    
    const result = await service.generateImage(
      prompt,
      TEST_GAME_CODE,
      TEST_ROUND,
      TEST_PLAYER_ID,
      artStyle,
      completedSentence
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Image generated successfully!\n');
    console.log('📊 Result Details:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Image Path: ${result.imagePath}`);
    console.log(`   Image URL: ${result.imageUrl}`);
    console.log(`   Art Style: ${result.artStyle}`);
    console.log(`   Sentence: ${result.completedSentence}`);
    console.log(`   Generated At: ${result.generatedAt}\n`);

    // Verify the file exists
    const fullPath = path.join(__dirname, '..', 'public', result.imagePath);
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log('📁 File Information:');
      console.log(`   Full Path: ${fullPath}`);
      console.log(`   File Size: ${sizeKB} KB`);
      console.log(`   Modified: ${stats.mtime.toISOString()}\n`);

      // Read first few bytes to verify PNG signature
      const buffer = fs.readFileSync(fullPath);
      const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      
      console.log('✓ File Format Validation:');
      console.log(`   PNG Signature: ${isPNG ? '✅ Valid' : '❌ Invalid'}\n`);

      console.log('=====================================');
      console.log('🎉 SUCCESS - Image saved and ready!');
      console.log('=====================================');
      console.log(`\nImage Location: ${fullPath}`);
      console.log('\n💡 TIP: Open this file to view the generated image');
      console.log('The image will remain on disk until manually deleted.\n');

    } else {
      console.error('❌ ERROR: File was not created at expected location');
      console.error(`   Expected: ${fullPath}\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR: Image generation failed');
    console.error(`   Message: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.error('\n📋 Common Issues:');
    console.error('   • Insufficient API credits or billing not enabled');
    console.error('   • Invalid API key');
    console.error('   • Rate limit exceeded');
    console.error('   • Network connectivity issues\n');
    
    process.exit(1);
  }
}

// Run the generator
generateAndKeepImage().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
