/**
 * PromptFormatter - Story 5.1: Sentence Formatting & Prompt Engineering
 * 
 * Formats completed sentences from noun card selections into AI-ready image prompts.
 * Handles art style variations and ensures grammatically correct prompt construction.
 */

const logger = require('../config/logger');

/**
 * Art style templates for image generation
 */
const ART_STYLES = {
  realistic: 'realistic photography, natural lighting, candid moment',
  cartoon: 'colorful cartoon illustration, exaggerated expressions',
  cinematic: 'wide shot, dramatic lighting, frozen motion',
  whimsical: "children's book illustration, soft colors"
};

/**
 * Base prompt template for image generation
 */
const PROMPT_TEMPLATE = `Create a clear, detailed image that literally depicts the following scene as a single moment in time:

"{sentence}"

The scene should be visually understandable without text, showing all key subjects, actions, and surroundings implied by the sentence. Use expressive body language, clear facial expressions, and a strong sense of environment. The image should be family-friendly, humorous, and slightly exaggerated for clarity.`;

/**
 * PromptFormatter class
 */
class PromptFormatter {
  /**
   * Format a completed sentence into an AI-ready image prompt
   * 
   * @param {string} sentenceTemplate - Sentence with _______ placeholders (7 underscores)
   * @param {Array<string>} selectedCards - Array of noun card texts to fill blanks
   * @param {string} artStyle - Art style: realistic, cartoon, cinematic, or whimsical
   * @returns {Object} { prompt, completedSentence, artStyle }
   */
  static formatImagePrompt(sentenceTemplate, selectedCards, artStyle = 'realistic') {
    try {
      // Validate inputs
      if (!sentenceTemplate || typeof sentenceTemplate !== 'string') {
        throw new Error('sentenceTemplate must be a non-empty string');
      }

      if (!Array.isArray(selectedCards) || selectedCards.length === 0) {
        throw new Error('selectedCards must be a non-empty array');
      }

      if (!ART_STYLES[artStyle]) {
        logger.warn(`Unknown art style: ${artStyle}, defaulting to realistic`);
        artStyle = 'realistic';
      }

      // Count blanks in sentence (blanks are 7 underscores: _______)
      const blankCount = (sentenceTemplate.match(/_______/g) || []).length;
      
      if (blankCount === 0) {
        throw new Error('sentenceTemplate must contain at least one _______ blank');
      }

      if (selectedCards.length < blankCount) {
        throw new Error(`sentenceTemplate has ${blankCount} blanks but only ${selectedCards.length} cards provided`);
      }

      // Fill blanks with selected cards (left to right)
      let completedSentence = sentenceTemplate;
      for (let i = 0; i < blankCount; i++) {
        const card = selectedCards[i];
        completedSentence = completedSentence.replace('_______', card);
      }

      // Sanitize special characters
      completedSentence = this._sanitizeText(completedSentence);

      // Build final prompt with template and art style
      const basePrompt = PROMPT_TEMPLATE.replace('{sentence}', completedSentence);
      const artStyleDescription = ART_STYLES[artStyle];
      const fullPrompt = `${basePrompt}\n\nStyle: ${artStyleDescription}`;

      logger.info('Formatted image prompt', {
        blanks: blankCount,
        artStyle,
        sentenceLength: completedSentence.length,
        promptLength: fullPrompt.length
      });

      return {
        prompt: fullPrompt,
        completedSentence,
        artStyle
      };

    } catch (error) {
      logger.error('Error formatting image prompt', { error: error.message });
      throw error;
    }
  }

  /**
   * Get a random art style
   * 
   * @returns {string} Random art style name
   */
  static getRandomArtStyle() {
    const styles = Object.keys(ART_STYLES);
    return styles[Math.floor(Math.random() * styles.length)];
  }

  /**
   * Get all available art styles
   * 
   * @returns {Array<string>} Array of art style names
   */
  static getAvailableArtStyles() {
    return Object.keys(ART_STYLES);
  }

  /**
   * Sanitize text for safe prompt generation
   * 
   * @private
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  static _sanitizeText(text) {
    // Replace problematic characters that might confuse AI models
    return text
      .replace(/["""]/g, '"')  // Normalize quotes
      .replace(/['']/g, "'")   // Normalize apostrophes
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Count blanks in a sentence template
   * 
   * @param {string} sentenceTemplate - Sentence with _______ placeholders (7 underscores)
   * @returns {number} Number of blanks
   */
  static countBlanks(sentenceTemplate) {
    if (!sentenceTemplate || typeof sentenceTemplate !== 'string') {
      return 0;
    }
    return (sentenceTemplate.match(/_______/g) || []).length;
  }
}

module.exports = PromptFormatter;
