/**
 * Card Deck Management
 * Story 1.2: Game State Management & Round Orchestration
 * Handles card shuffling, dealing, and hand management
 */

class CardDeck {
  /**
   * Creates a new card deck
   * @param {Array<string>} cards - Array of card text/nouns
   */
  constructor(cards = []) {
    this.originalCards = [...cards];
    this.drawPile = [];
    this.discardPile = [];
    this.shuffle();
  }

  /**
   * Shuffles the draw pile using Fisher-Yates algorithm
   */
  shuffle() {
    this.drawPile = [...this.originalCards];
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  /**
   * Deals initial hands to all players
   * @param {number} playerCount - Number of players
   * @param {number} cardsPerPlayer - Cards to deal per player (default 8)
   * @returns {Array<Array<string>>} Array of hands, one per player
   */
  deal(playerCount, cardsPerPlayer = 8) {
    const hands = [];
    for (let i = 0; i < playerCount; i++) {
      const hand = this.draw(cardsPerPlayer);
      hands.push(hand);
    }
    return hands;
  }

  /**
   * Draws cards from the deck
   * @param {number} count - Number of cards to draw
   * @returns {Array<string>} Array of drawn cards
   */
  draw(count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        this.reshuffleDiscardPile();
      }
      if (this.drawPile.length > 0) {
        drawn.push(this.drawPile.pop());
      }
    }
    return drawn;
  }

  /**
   * Refills a player's hand to target size
   * @param {Array<string>} currentHand - Player's current hand
   * @param {number} targetSize - Target hand size (default 8)
   * @returns {Array<string>} Refilled hand
   */
  refill(currentHand, targetSize = 8) {
    const cardsNeeded = targetSize - currentHand.length;
    if (cardsNeeded <= 0) {
      return currentHand;
    }
    const newCards = this.draw(cardsNeeded);
    return [...currentHand, ...newCards];
  }

  /**
   * Discards cards to the discard pile
   * @param {Array<string>} cards - Cards to discard
   */
  discard(cards) {
    this.discardPile.push(...cards);
  }

  /**
   * Reshuffles the discard pile into the draw pile
   */
  reshuffleDiscardPile() {
    if (this.discardPile.length === 0) {
      return;
    }
    this.drawPile = [...this.discardPile];
    this.discardPile = [];
    // Shuffle the newly added cards
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]];
    }
  }

  /**
   * Checks if all cards have been dealt
   * @returns {boolean} True if no more cards available
   */
  allCardsDealt() {
    return this.drawPile.length === 0 && this.discardPile.length === 0;
  }

  /**
   * Gets the number of remaining cards
   * @returns {number} Total cards available (draw + discard)
   */
  getRemainingCount() {
    return this.drawPile.length + this.discardPile.length;
  }

  /**
   * Resets the deck to initial state
   */
  reset() {
    this.drawPile = [];
    this.discardPile = [];
    this.shuffle();
  }
}

module.exports = CardDeck;
