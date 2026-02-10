/**
 * ---
 * title: Image Generator Service
 * purpose: Handles AI image generation via DALL-E 3 API with queue management,
 *          retry logic, and timeout handling.
 * exports: ImageGeneratorService - Class for generating images from prompts
 * dependencies: axios, fs, path, logger, PromptFormatter
 * ---
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const PromptFormatter = require('../utils/promptFormatter');

class ImageGeneratorService {
  /**
   * Creates a new image generator service
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - OpenAI API key
   * @param {string} config.serviceType - Service type (dalle3 or stability-ai)
   * @param {number} config.timeout - Request timeout in milliseconds (default: 60000)
   * @param {number} config.maxConcurrent - Max concurrent requests (default: 2)
   */
  constructor(config = {}) {
    this.serviceType = config.serviceType || 'dalle3';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.timeout = config.timeout || parseInt(process.env.IMAGE_GENERATION_TIMEOUT || '60000', 10);
    this.maxConcurrent = config.maxConcurrent || parseInt(process.env.IMAGE_GENERATION_MAX_CONCURRENT || '2', 10);
    
    if (!this.apiKey) {
      throw new Error('API key is required for ImageGeneratorService');
    }
    
    // Queue for managing concurrent requests
    this.queue = [];
    this.activeRequests = 0;
    
    // Placeholder image path
    this.placeholderPath = '/images/placeholder-image-error.png';
    
    logger.info('ImageGeneratorService initialized', {
      serviceType: this.serviceType,
      timeout: this.timeout,
      maxConcurrent: this.maxConcurrent
    });
  }

  /**
   * Generates an image from a prompt
   * @param {string} prompt - Formatted prompt for image generation
   * @param {string} gameCode - Game session code
   * @param {number} roundId - Round number
   * @param {string} playerId - Player ID
   * @param {string} artStyle - Art style used
   * @param {string} completedSentence - Completed sentence with cards
   * @returns {Promise<Object>} { imageUrl, imagePath, completedSentence, artStyle, generatedAt }
   */
  async generateImage(prompt, gameCode, roundId, playerId, artStyle, completedSentence) {
    logger.info('Queueing image generation request', {
      gameCode,
      roundId,
      playerId,
      promptLength: prompt.length,
      artStyle
    });

    return new Promise((resolve, reject) => {
      this.queue.push({
        prompt,
        gameCode,
        roundId,
        playerId,
        artStyle,
        completedSentence,
        resolve,
        reject
      });
      
      this._processQueue();
    });
  }

  /**
   * Processes the request queue
   * @private
   */
  async _processQueue() {
    // Check if we can process more requests
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      if (this.queue.length > 0 && this.activeRequests >= this.maxConcurrent) {
        logger.debug('Queue throttled', {
          queueLength: this.queue.length,
          activeRequests: this.activeRequests,
          maxConcurrent: this.maxConcurrent
        });
      }
      return;
    }

    const request = this.queue.shift();
    this.activeRequests++;
    
    logger.debug('Processing queued image request', {
      gameCode: request.gameCode,
      playerId: request.playerId,
      queueRemaining: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent
    });

    try {
      const result = await this._executeGeneration(request);
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      logger.debug('Completed image generation request', {
        gameCode: request.gameCode,
        playerId: request.playerId,
        activeRequests: this.activeRequests,
        queueRemaining: this.queue.length
      });
      this._processQueue(); // Process next item in queue
    }
  }

  /**
   * Executes image generation with retry logic
   * @param {Object} request - Request object
   * @returns {Promise<Object>} Generation result
   * @private
   */
  async _executeGeneration(request) {
    const { prompt, gameCode, roundId, playerId, artStyle, completedSentence } = request;
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Attempting image generation', {
          gameCode,
          playerId,
          attempt,
          maxRetries
        });

        const result = await this._callImageAPI(prompt, gameCode, roundId, playerId);
        
        logger.info('Image generation successful', {
          gameCode,
          playerId,
          attempt,
          imagePath: result.imagePath
        });

        return {
          ...result,
          completedSentence,
          artStyle,
          generatedAt: new Date().toISOString()
        };

      } catch (error) {
        lastError = error;
        logger.warn('Image generation attempt failed', {
          gameCode,
          playerId,
          attempt,
          maxRetries,
          error: error.message
        });

        // Don't retry on authentication or validation errors
        if (error.response && [400, 401, 403].includes(error.response.status)) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          logger.info('Backing off before retry', {
            gameCode,
            playerId,
            backoffMs,
            nextAttempt: attempt + 1
          });
          await this._sleep(backoffMs);
        }
      }
    }

    // All retries failed, use placeholder
    logger.error('Image generation failed after all retries', {
      gameCode,
      playerId,
      error: lastError?.message
    });

    return {
      imageUrl: this.placeholderPath,
      imagePath: this.placeholderPath,
      completedSentence,
      artStyle,
      generatedAt: new Date().toISOString(),
      error: 'Failed to generate image',
      isPlaceholder: true
    };
  }

  /**
   * Calls the image generation API
   * @param {string} prompt - Image prompt
   * @param {string} gameCode - Game code
   * @param {number} roundId - Round ID
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} { imageUrl, imagePath }
   * @private
   */
  async _callImageAPI(prompt, gameCode, roundId, playerId) {
    if (this.serviceType === 'dalle3') {
      return await this._callDallE3(prompt, gameCode, roundId, playerId);
    } else {
      throw new Error(`Unsupported service type: ${this.serviceType}`);
    }
  }

  /**
   * Calls DALL-E 3 API
   * @param {string} prompt - Image prompt
   * @param {string} gameCode - Game code
   * @param {number} roundId - Round ID
   * @param {string} playerId - Player ID
   * @returns {Promise<Object>} { imageUrl, imagePath }
   * @private
   */
  async _callDallE3(prompt, gameCode, roundId, playerId) {
    const apiUrl = 'https://api.openai.com/v1/images/generations';
    
    const requestBody = {
      model: 'dall-e-2',  // Using DALL-E 2 for cost savings ($0.020 vs $0.040 per image)
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url' // Get URL instead of base64 for efficiency
    };

    logger.debug('Calling DALL-E 2 API', {
      gameCode,
      playerId,
      promptLength: prompt.length,
      prompt: prompt  // Log the actual prompt being sent
    });

    try {
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      if (!response.data || !response.data.data || !response.data.data[0]) {
        throw new Error('Invalid response from DALL-E 2 API');
      }

      const imageUrl = response.data.data[0].url;
      
      // Download and save the image
      const imagePath = await this._downloadAndSaveImage(imageUrl, gameCode, roundId, playerId);

      return {
        imageUrl: imagePath, // Return local path for serving
        imagePath: imagePath
      };

    } catch (error) {
      if (error.response) {
        logger.error('DALL-E 2 API error', {
          gameCode,
          playerId,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.code === 'ECONNABORTED') {
        logger.error('DALL-E 2 API timeout', {
          gameCode,
          playerId,
          timeout: this.timeout
        });
      } else {
        logger.error('DALL-E 2 request failed', {
          gameCode,
          playerId,
          error: error.message
        });
      }
      throw error;
    }
  }

  /**
   * Downloads and saves an image to local storage
   * @param {string} imageUrl - URL of the image to download
   * @param {string} gameCode - Game code
   * @param {number} roundId - Round ID
   * @param {string} playerId - Player ID
   * @returns {Promise<string>} Local file path (web-accessible)
   * @private
   */
  async _downloadAndSaveImage(imageUrl, gameCode, roundId, playerId) {
    try {
      // Create directory structure: public/generated-images/{gameCode}/{roundId}/
      const baseDir = path.join(__dirname, '../../public/generated-images');
      const gameDir = path.join(baseDir, gameCode);
      const roundDir = path.join(gameDir, `round-${roundId}`);

      // Ensure directories exist
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }
      if (!fs.existsSync(gameDir)) {
        fs.mkdirSync(gameDir, { recursive: true });
      }
      if (!fs.existsSync(roundDir)) {
        fs.mkdirSync(roundDir, { recursive: true });
      }

      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout for download
      });

      // Save to file
      const filename = `${playerId}.png`;
      const filePath = path.join(roundDir, filename);
      fs.writeFileSync(filePath, response.data);

      // Return web-accessible path
      const webPath = `/generated-images/${gameCode}/round-${roundId}/${filename}`;
      
      logger.info('Image downloaded and saved', {
        gameCode,
        roundId,
        playerId,
        filePath,
        webPath,
        sizeBytes: response.data.length
      });

      return webPath;

    } catch (error) {
      logger.error('Failed to download/save image', {
        gameCode,
        roundId,
        playerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generates images for all players in a round
   * @param {Object} gameState - Current game state
   * @returns {Promise<Array>} Array of generation results
   */
  async generateImagesForRound(gameState) {
    const { gameId, code, currentRound, playerSelections, sentenceTemplate, judgeId } = gameState;
    const startTime = Date.now();

    logger.info('generateImagesForRound started', {
      gameId,
      code,
      round: currentRound,
      playerCount: Object.keys(playerSelections).length,
      judgeId,
      sentenceTemplate: sentenceTemplate.substring(0, 50) + '...'
    });

    const promises = [];
    let queuedCount = 0;
    let skippedCount = 0;

    for (const [playerId, selection] of Object.entries(playerSelections)) {
      // Skip judge
      if (playerId === judgeId) {
        logger.debug('Skipping judge for image generation', { code, playerId, judgeId });
        skippedCount++;
        continue;
      }

      try {
        // Format the prompt using PromptFormatter
        const { prompt, completedSentence, artStyle } = PromptFormatter.formatImagePrompt(
          sentenceTemplate,
          selection.selectedCards || selection,
          selection.artStyle // Pass art style if provided in selection
        );

        logger.debug('Queuing image generation', {
          code,
          round: currentRound,
          playerId,
          promptLength: prompt.length,
          artStyle
        });

        // Queue image generation
        const promise = this.generateImage(
          prompt,
          code,
          currentRound,
          playerId,
          artStyle,
          completedSentence
        ).catch(error => {
          logger.error('Image generation failed for player', {
            gameId,
            code,
            playerId,
            error: error.message
          });
          // Return placeholder on error
          return {
            imageUrl: this.placeholderPath,
            imagePath: this.placeholderPath,
            completedSentence,
            artStyle,
            generatedAt: new Date().toISOString(),
            error: error.message,
            isPlaceholder: true
          };
        });

        promises.push({
          playerId,
          promise
        });
        queuedCount++;

      } catch (error) {
        logger.error('Failed to format prompt for player', {
          gameId,
          code,
          playerId,
          error: error.message
        });
        skippedCount++;
      }
    }

    logger.info('Image generation queued', {
      gameId,
      code,
      round: currentRound,
      queuedCount,
      skippedCount,
      totalPromises: promises.length,
      currentQueueLength: this.queue.length,
      activeRequests: this.activeRequests
    });

    // Wait for all images to generate (with timeout)
    const results = [];
    let completedCount = 0;
    let failedCount = 0;

    for (const { playerId, promise } of promises) {
      try {
        const result = await promise;
        results.push({
          playerId,
          ...result
        });
        completedCount++;

        logger.debug('Image generation completed for player', {
          gameId,
          code,
          playerId,
          completedCount,
          totalQueued: queuedCount,
          isPlaceholder: result.isPlaceholder
        });

      } catch (error) {
        logger.error('Image generation promise rejected for player', {
          gameId,
          code,
          playerId,
          error: error.message
        });
        results.push({
          playerId,
          imageUrl: this.placeholderPath,
          imagePath: this.placeholderPath,
          error: error.message,
          isPlaceholder: true
        });
        failedCount++;
      }
    }

    const elapsedMs = Date.now() - startTime;

    logger.info('Round image generation batch complete', {
      gameId,
      code,
      round: currentRound,
      totalGenerated: results.length,
      successCount: completedCount,
      failedCount,
      placeholders: results.filter(r => r.isPlaceholder).length,
      elapsedMs,
      averagePerImage: results.length > 0 ? Math.round(elapsedMs / results.length) + 'ms' : 'N/A'
    });

    return results;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ImageGeneratorService;
