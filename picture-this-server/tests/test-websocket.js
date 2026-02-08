/**
 * ---
 * title: WebSocket Integration Tests
 * purpose: Verifies WebSocket connectivity, event handling, and real-time
 *          communication between client and server via Socket.io.
 * exports: None (test script)
 * dependencies: socket.io-client
 * ---
 */

// Simple test script to verify WebSocket functionality
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const REQUIRED_STATE_UPDATES = 10; // Number of state updates to receive before testing disconnect

console.log('🧪 Testing PictureThis WebSocket Server...\n');

// Test 1: Connection
console.log('Test 1: Connecting to server...');
const socket = io(SERVER_URL);

let connected = false;
let receivedConnectedEvent = false;
let receivedStateUpdates = 0;
let testsPassed = 0;
let testsFailed = 0;

// Set timeout for all tests
const testTimeout = setTimeout(() => {
    console.log('\n❌ Tests timed out!');
    cleanup();
    process.exit(1);
}, 10000);

socket.on('connect', () => {
    connected = true;
    testsPassed++;
    console.log('✅ Test 1 PASSED: Connected to server');
    console.log(`   Socket ID: ${socket.id}\n`);
});

socket.on('connected', (message) => {
    receivedConnectedEvent = true;
    testsPassed++;
    console.log('✅ Test 2 PASSED: Received "connected" event');
    console.log(`   Message: ${JSON.stringify(message)}\n`);
    
    // Test 3: Join game
    setTimeout(() => {
        console.log('Test 3: Joining game...');
        socket.emit('join-game', {
            code: 'TEST01',
            name: 'TestPlayer1',
            avatar: '🧪'
        });
    }, 500);
});

socket.on('player-joined', (message) => {
    testsPassed++;
    console.log('✅ Test 3 PASSED: Received "player-joined" event');
    console.log(`   Player: ${message.data.player.name}`);
    console.log(`   Total players: ${message.data.player_count}\n`);
});

socket.on('state-update', (message) => {
    receivedStateUpdates++;
    
    if (receivedStateUpdates === 1) {
        console.log('Test 4: State updates...');
        console.log('✅ Test 4 PASSED: Receiving state updates');
        console.log(`   State: ${JSON.stringify(message.data.game_state)}`);
        testsPassed++;
    }
    
    // After receiving required state updates, run disconnect test
    if (receivedStateUpdates === REQUIRED_STATE_UPDATES) {
        console.log(`   Received ${receivedStateUpdates} state updates total\n`);
        
        // Test 5: Disconnect
        setTimeout(() => {
            console.log('Test 5: Disconnecting...');
            socket.disconnect();
        }, 500);
    }
});

socket.on('disconnect', (reason) => {
    testsPassed++;
    console.log('✅ Test 5 PASSED: Disconnected successfully');
    console.log(`   Reason: ${reason}\n`);
    
    // Summary
    setTimeout(() => {
        console.log('='.repeat(50));
        console.log('📊 Test Summary:');
        console.log(`   Total tests: 5`);
        console.log(`   Passed: ${testsPassed}`);
        console.log(`   Failed: ${testsFailed}`);
        console.log('='.repeat(50));
        
        if (testsPassed === 5) {
            console.log('\n🎉 All tests passed!\n');
            cleanup();
            process.exit(0);
        } else {
            console.log('\n❌ Some tests failed!\n');
            cleanup();
            process.exit(1);
        }
    }, 1000);
});

socket.on('error', (error) => {
    testsFailed++;
    console.log(`❌ Socket error: ${error}`);
});

socket.on('connect_error', (error) => {
    testsFailed++;
    console.log('❌ Test 1 FAILED: Could not connect to server');
    console.log(`   Error: ${error.message}`);
    console.log('\n⚠️  Make sure the server is running on port 3000');
    cleanup();
    process.exit(1);
});

function cleanup() {
    clearTimeout(testTimeout);
    if (socket && socket.connected) {
        socket.disconnect();
    }
}
