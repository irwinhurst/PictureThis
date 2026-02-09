/**
 * Tests for PromptFormatter - Story 5.1
 * 
 * Tests sentence formatting, prompt engineering, art styles, and error handling
 */

const PromptFormatter = require('../src/utils/promptFormatter');

// Test counter
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual: ${actual}`);
  }
}

function assertContains(text, substring, message) {
  if (text.includes(substring)) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
    console.error(`  Text does not contain: ${substring}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    failed++;
    console.error(`✗ ${message} - Expected to throw but did not`);
  } catch (error) {
    passed++;
    console.log(`✓ ${message}`);
  }
}

console.log('\n=== PromptFormatter Tests ===\n');

// Test 1: Single blank sentence
console.log('Test 1: Single blank sentence');
const result1 = PromptFormatter.formatImagePrompt(
  'The _______ was wearing sunglasses at a beach party',
  ['Disco-Dancing Llama']
);
assert(result1.completedSentence === 'The Disco-Dancing Llama was wearing sunglasses at a beach party', 
  'Single blank fills correctly');
assertContains(result1.prompt, 'Disco-Dancing Llama', 'Prompt contains completed sentence');
assertContains(result1.prompt, 'Create a clear, detailed image', 'Prompt contains template text');

// Test 2: Two blanks sentence
console.log('\nTest 2: Two blanks sentence');
const result2 = PromptFormatter.formatImagePrompt(
  'A _______ fell in love with a _______',
  ['Dragon Cooking Dinner', 'Sentient Rubber Duck']
);
assertEquals(result2.completedSentence, 
  'A Dragon Cooking Dinner fell in love with a Sentient Rubber Duck',
  'Two blanks fill in order');

// Test 3: Three blanks sentence
console.log('\nTest 3: Three blanks sentence');
const result3 = PromptFormatter.formatImagePrompt(
  'I saw a _______ trying to rob a bank while wearing a _______',
  ['elephant', 'tutu', 'cowboy hat']
);
assertEquals(result3.completedSentence,
  'I saw a elephant trying to rob a bank while wearing a tutu',
  'Only fills matching number of blanks');

// Test 4: Realistic art style
console.log('\nTest 4: Realistic art style');
const result4 = PromptFormatter.formatImagePrompt(
  'The _______ was dancing',
  ['penguin'],
  'realistic'
);
assertContains(result4.prompt, 'realistic photography, natural lighting', 
  'Realistic style included in prompt');
assertEquals(result4.artStyle, 'realistic', 'Art style returned correctly');

// Test 5: Cartoon art style
console.log('\nTest 5: Cartoon art style');
const result5 = PromptFormatter.formatImagePrompt(
  'The _______ exploded',
  ['watermelon'],
  'cartoon'
);
assertContains(result5.prompt, 'colorful cartoon illustration, exaggerated expressions',
  'Cartoon style included in prompt');

// Test 6: Cinematic art style
console.log('\nTest 6: Cinematic art style');
const result6 = PromptFormatter.formatImagePrompt(
  'A _______ saved the world',
  ['hamster'],
  'cinematic'
);
assertContains(result6.prompt, 'wide shot, dramatic lighting, frozen motion',
  'Cinematic style included in prompt');

// Test 7: Whimsical art style
console.log('\nTest 7: Whimsical art style');
const result7 = PromptFormatter.formatImagePrompt(
  'The _______ granted wishes',
  ['talking tree'],
  'whimsical'
);
assertContains(result7.prompt, "children's book illustration, soft colors",
  'Whimsical style included in prompt');

// Test 8: Complex sentence with punctuation
console.log('\nTest 8: Complex sentence with punctuation');
const result8 = PromptFormatter.formatImagePrompt(
  "My _______'s _______ was absolutely ridiculous!",
  ["grandmother", "hat collection"]
);
assertContains(result8.completedSentence, "grandmother's",
  'Apostrophes preserved');
assertContains(result8.completedSentence, 'ridiculous!',
  'Exclamation marks preserved');

// Test 9: Sentence with "and" connector
console.log('\nTest 9: Sentence with "and" connector');
const result9 = PromptFormatter.formatImagePrompt(
  'A _______, _______, and _______ walked into a bar',
  ['robot', 'unicorn', 'accountant']
);
assertEquals(result9.completedSentence,
  'A robot, unicorn, and accountant walked into a bar',
  'Multiple blanks with commas work correctly');

// Test 10: Long descriptive sentence
console.log('\nTest 10: Long descriptive sentence');
const result10 = PromptFormatter.formatImagePrompt(
  'The _______ discovered that the _______ had been hiding in the basement all along',
  ['detective pigeon', 'singing cactus']
);
assertContains(result10.completedSentence, 'detective pigeon',
  'Long sentence blank 1 filled');
assertContains(result10.completedSentence, 'singing cactus',
  'Long sentence blank 2 filled');

// Test 11: Default art style when invalid
console.log('\nTest 11: Default art style when invalid');
const result11 = PromptFormatter.formatImagePrompt(
  'The _______ was confused',
  ['octopus'],
  'invalid-style'
);
assertEquals(result11.artStyle, 'realistic',
  'Invalid art style defaults to realistic');

// Test 12: Special character sanitization
console.log('\nTest 12: Special character sanitization');
const result12 = PromptFormatter.formatImagePrompt(
  'The _______ said "hello"',
  ['robot']
);
assertContains(result12.completedSentence, 'said "hello"',
  'Quotes sanitized correctly');

// Error Handling Tests
console.log('\nError Handling Tests:');

// Test 13: Empty sentence template
assertThrows(() => {
  PromptFormatter.formatImagePrompt('', ['card']);
}, 'Empty sentence template throws error');

// Test 14: Null sentence template
assertThrows(() => {
  PromptFormatter.formatImagePrompt(null, ['card']);
}, 'Null sentence template throws error');

// Test 15: Empty cards array
assertThrows(() => {
  PromptFormatter.formatImagePrompt('The _______ jumped', []);
}, 'Empty cards array throws error');

// Test 16: No blanks in sentence
assertThrows(() => {
  PromptFormatter.formatImagePrompt('No blanks here', ['card']);
}, 'Sentence with no blanks throws error');

// Test 17: Not enough cards for blanks
assertThrows(() => {
  PromptFormatter.formatImagePrompt('A _______ and a _______', ['only-one']);
}, 'Not enough cards throws error');

// Utility Method Tests
console.log('\nUtility Method Tests:');

// Test 18: countBlanks
assertEquals(PromptFormatter.countBlanks('The _______ was _______'), 2,
  'countBlanks returns correct count');
assertEquals(PromptFormatter.countBlanks('No blanks'), 0,
  'countBlanks returns 0 for no blanks');
assertEquals(PromptFormatter.countBlanks(''), 0,
  'countBlanks handles empty string');

// Test 19: getAvailableArtStyles
const styles = PromptFormatter.getAvailableArtStyles();
assert(styles.includes('realistic'), 'Available styles includes realistic');
assert(styles.includes('cartoon'), 'Available styles includes cartoon');
assert(styles.includes('cinematic'), 'Available styles includes cinematic');
assert(styles.includes('whimsical'), 'Available styles includes whimsical');
assertEquals(styles.length, 4, 'Exactly 4 art styles available');

// Test 20: getRandomArtStyle
const randomStyle = PromptFormatter.getRandomArtStyle();
assert(styles.includes(randomStyle), 'Random style is valid');

// Real Game Examples (from noun/sentence cards)
console.log('\nReal Game Examples:');

// Test 21: Example from game cards
const gameExample1 = PromptFormatter.formatImagePrompt(
  'The _______ was wearing sunglasses at a beach party',
  ['Disco-Dancing Llama'],
  'cartoon'
);
assertContains(gameExample1.prompt, 'Disco-Dancing Llama was wearing sunglasses',
  'Game example 1: sentence completed correctly');

// Test 22: Example with multiple blanks
const gameExample2 = PromptFormatter.formatImagePrompt(
  'A _______ fell in love with a _______',
  ['Dragon Cooking Dinner', 'Sentient Rubber Duck'],
  'whimsical'
);
assertContains(gameExample2.prompt, 'Dragon Cooking Dinner fell in love with a Sentient Rubber Duck',
  'Game example 2: multiple blanks filled');

// Test 23: Expert level 3-blank sentence
const gameExample3 = PromptFormatter.formatImagePrompt(
  'A _______, _______, and _______ baked with ingredients that were pure joy',
  ['Penguin Doing Parkour', 'Sentient Couch Chasing Someone', 'Kraken Playing Chess'],
  'cinematic'
);
assertContains(gameExample3.completedSentence, 'Penguin Doing Parkour',
  'Game example 3: first blank filled');
assertContains(gameExample3.completedSentence, 'Sentient Couch Chasing Someone',
  'Game example 3: second blank filled');
assertContains(gameExample3.completedSentence, 'Kraken Playing Chess',
  'Game example 3: third blank filled');

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failed} test(s) failed`);
  process.exit(1);
}
