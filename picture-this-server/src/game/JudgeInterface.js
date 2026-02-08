/**
 * ---
 * title: Judge Interface Manager
 * purpose: Manages the judge's image selection flow - tracking loaded images, handling judge
 *          selections for 1st and 2nd place winners, and managing selection state.
 * exports: JudgeInterface class
 * dependencies: None
 * ---
 */

class JudgeInterface {
  constructor(session) {
    this.session = session;
    this.images = []; // Array of { playerId, imageUrl, playerNumber }
    this.loadedImages = new Set(); // Track which images have loaded
    this.selections = {
      firstPlace: null,      // playerId of first place
      secondPlace: null,     // playerId of second place
      selectOrder: []        // Order of selections for tracking
    };
    this.isReady = false; // All images loaded
  }

  /**
   * Initialize judge interface with submitted images
   * @param {Array<Object>} submissions - Array of { playerId, imageUrl }
   * @returns {Object} - Judge interface state
   */
  initializeWithImages(submissions) {
    this.images = submissions.map((submission, index) => ({
      playerId: submission.playerId,
      imageUrl: submission.imageUrl,
      playerNumber: index + 1, // 1-indexed player number
      isLoaded: false
    }));
    
    this.selections = {
      firstPlace: null,
      secondPlace: null,
      selectOrder: []
    };
    
    this.loadedImages.clear();
    this.isReady = false;
    
    return {
      images: this.images,
      totalImages: this.images.length,
      isReady: false
    };
  }

  /**
   * Mark an image as loaded
   * @param {string} playerId - UUID of player whose image loaded
   * @returns {boolean} - True if all images are now loaded
   */
  markImageLoaded(playerId) {
    this.loadedImages.add(playerId);
    
    // Find and mark the image as loaded
    const image = this.images.find(img => img.playerId === playerId);
    if (image) {
      image.isLoaded = true;
    }
    
    // Check if all images are loaded
    if (this.loadedImages.size === this.images.length) {
      this.isReady = true;
    }
    
    return this.isReady;
  }

  /**
   * Check if all images are loaded
   * @returns {boolean}
   */
  areAllImagesLoaded() {
    return this.isReady;
  }

  /**
   * Select a player image for first place
   * @param {string} playerId - UUID of player
   * @returns {Object} - Updated selections
   * @throws {Error} - If not ready or invalid player
   */
  selectFirstPlace(playerId) {
    if (!this.isReady) {
      throw new Error('Cannot select: Not all images loaded');
    }
    
    const image = this.images.find(img => img.playerId === playerId);
    if (!image) {
      throw new Error(`Invalid player: ${playerId}`);
    }
    
    // Allow changing selection if already selected
    const wasSelected = this.selections.firstPlace === playerId;
    
    // Can't select same player for both positions
    if (this.selections.secondPlace === playerId) {
      throw new Error('Player already selected for 2nd place');
    }
    
    this.selections.firstPlace = playerId;
    
    if (!wasSelected) {
      this.selections.selectOrder.push({ position: '1st', playerId, timestamp: Date.now() });
    }
    
    return this.getSelectionState();
  }

  /**
   * Select a player image for second place
   * @param {string} playerId - UUID of player
   * @returns {Object} - Updated selections
   * @throws {Error} - If not ready or invalid player
   */
  selectSecondPlace(playerId) {
    if (!this.isReady) {
      throw new Error('Cannot select: Not all images loaded');
    }
    
    const image = this.images.find(img => img.playerId === playerId);
    if (!image) {
      throw new Error(`Invalid player: ${playerId}`);
    }
    
    // Allow changing selection if already selected
    const wasSelected = this.selections.secondPlace === playerId;
    
    // Can't select same player for both positions
    if (this.selections.firstPlace === playerId) {
      throw new Error('Player already selected for 1st place');
    }
    
    this.selections.secondPlace = playerId;
    
    if (!wasSelected) {
      this.selections.selectOrder.push({ position: '2nd', playerId, timestamp: Date.now() });
    }
    
    return this.getSelectionState();
  }

  /**
   * Deselect a player from their position
   * @param {string} position - '1st' or '2nd'
   * @returns {Object} - Updated selections
   */
  deselect(position) {
    if (position === '1st') {
      this.selections.firstPlace = null;
    } else if (position === '2nd') {
      this.selections.secondPlace = null;
    }
    
    return this.getSelectionState();
  }

  /**
   * Get current selection state
   * @returns {Object} - Current selections and UI state
   */
  getSelectionState() {
    return {
      firstPlace: this.selections.firstPlace,
      secondPlace: this.selections.secondPlace,
      selectOrder: this.selections.selectOrder,
      isComplete: this.selections.firstPlace !== null && this.selections.secondPlace !== null,
      images: this.images.map(img => ({
        playerId: img.playerId,
        playerNumber: img.playerNumber,
        imageUrl: img.imageUrl,
        isLoaded: img.isLoaded,
        selectionState: this.getImageSelectionState(img.playerId)
      }))
    };
  }

  /**
   * Get selection state for a specific image
   * @param {string} playerId - UUID of player
   * @returns {string} - 'unselected', '1st-place', or '2nd-place'
   */
  getImageSelectionState(playerId) {
    if (this.selections.firstPlace === playerId) return '1st-place';
    if (this.selections.secondPlace === playerId) return '2nd-place';
    return 'unselected';
  }

  /**
   * Get the final judge selections for submission
   * @returns {Object} - { firstPlaceId, secondPlaceId }
   * @throws {Error} - If selections are incomplete
   */
  getFinalSelections() {
    if (!this.selections.firstPlace || !this.selections.secondPlace) {
      throw new Error('Both 1st and 2nd place must be selected');
    }
    
    return {
      firstPlaceId: this.selections.firstPlace,
      secondPlaceId: this.selections.secondPlace
    };
  }

  /**
   * Reset all selections
   * @returns {Object} - Reset selection state
   */
  resetSelections() {
    this.selections = {
      firstPlace: null,
      secondPlace: null,
      selectOrder: []
    };
    
    return this.getSelectionState();
  }

  /**
   * Get an image by player number (for carousel navigation)
   * @param {number} playerNumber - 1-indexed player number
   * @returns {Object|null} - Image object or null
   */
  getImageByPlayerNumber(playerNumber) {
    return this.images.find(img => img.playerNumber === playerNumber) || null;
  }

  /**
   * Get the next unreviewed image
   * @returns {Object|null} - Next image or null if all reviewed
   */
  getNextImage() {
    return this.images.find(img => this.getImageSelectionState(img.playerId) === 'unselected') || null;
  }

  /**
   * Get summary of judge selections
   * @returns {Object} - Summary with images for selected players
   */
  getSummary() {
    const firstPlaceImage = this.images.find(img => img.playerId === this.selections.firstPlace);
    const secondPlaceImage = this.images.find(img => img.playerId === this.selections.secondPlace);
    
    return {
      firstPlace: firstPlaceImage ? {
        playerId: firstPlaceImage.playerId,
        playerNumber: firstPlaceImage.playerNumber,
        imageUrl: firstPlaceImage.imageUrl
      } : null,
      secondPlace: secondPlaceImage ? {
        playerId: secondPlaceImage.playerId,
        playerNumber: secondPlaceImage.playerNumber,
        imageUrl: secondPlaceImage.imageUrl
      } : null,
      totalSelectionTime: this.selections.selectOrder.length > 0 
        ? Date.now() - this.selections.selectOrder[0].timestamp
        : 0
    };
  }
}

module.exports = JudgeInterface;
