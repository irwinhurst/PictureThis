/**
 * ---
 * title: Authentication Endpoint Tests
 * purpose: Verifies authentication endpoints including JWT validation,
 *          protected routes, and error responses for unauthorized access.
 * exports: None (test script)
 * dependencies: http (Node.js built-in)
 * ---
 */

// Simple test script to verify authentication endpoints
const http = require('http');

const SERVER_URL = 'localhost';
const SERVER_PORT = 3000;

console.log('🧪 Testing PictureThis Authentication...\n');

let testsPassed = 0;
let testsFailed = 0;

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERVER_URL,
      port: SERVER_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Run tests sequentially
async function runTests() {
  try {
    // Test 1: Health check
    console.log('Test 1: Health check endpoint...');
    const healthRes = await makeRequest('/api/health');
    if (healthRes.statusCode === 200 && healthRes.body.status === 'ok') {
      console.log('✅ Test 1 PASSED: Health check working\n');
      testsPassed++;
    } else {
      console.log('❌ Test 1 FAILED: Unexpected health check response\n');
      testsFailed++;
    }

    // Test 2: Profile endpoint without auth
    console.log('Test 2: Profile endpoint without authentication...');
    const profileRes = await makeRequest('/api/profile');
    if (profileRes.statusCode === 401 && profileRes.body.error === 'Unauthorized') {
      console.log('✅ Test 2 PASSED: Unauthorized access rejected\n');
      testsPassed++;
    } else {
      console.log('❌ Test 2 FAILED: Should reject unauthorized access\n');
      testsFailed++;
    }

    // Test 3: Create game endpoint without auth
    console.log('Test 3: Create game endpoint without authentication...');
    const createGameRes = await makeRequest('/api/games', 'POST');
    if (createGameRes.statusCode === 401 && createGameRes.body.error === 'Unauthorized') {
      console.log('✅ Test 3 PASSED: Unauthorized game creation rejected\n');
      testsPassed++;
    } else {
      console.log('❌ Test 3 FAILED: Should reject unauthorized game creation\n');
      testsFailed++;
    }

    // Test 4: Start game endpoint without auth
    console.log('Test 4: Start game endpoint without authentication...');
    const startGameRes = await makeRequest('/api/games/test-id/start', 'POST');
    if (startGameRes.statusCode === 401 && startGameRes.body.error === 'Unauthorized') {
      console.log('✅ Test 4 PASSED: Unauthorized game start rejected\n');
      testsPassed++;
    } else {
      console.log('❌ Test 4 FAILED: Should reject unauthorized game start\n');
      testsFailed++;
    }

    // Test 5: Logout endpoint
    console.log('Test 5: Logout endpoint...');
    const logoutRes = await makeRequest('/auth/logout', 'POST');
    if (logoutRes.statusCode === 200 && logoutRes.body.message === 'Logged out successfully') {
      console.log('✅ Test 5 PASSED: Logout working\n');
      testsPassed++;
    } else {
      console.log('❌ Test 5 FAILED: Logout endpoint issue\n');
      testsFailed++;
    }

    // Test 6: Profile endpoint with invalid token
    console.log('Test 6: Profile endpoint with invalid token...');
    const invalidTokenRes = await makeRequest('/api/profile', 'GET', {
      'Authorization': 'Bearer invalid-token'
    });
    if (invalidTokenRes.statusCode === 401) {
      console.log('✅ Test 6 PASSED: Invalid token rejected\n');
      testsPassed++;
    } else {
      console.log('❌ Test 6 FAILED: Should reject invalid token\n');
      testsFailed++;
    }

    // Print summary
    console.log('==================================================');
    console.log('📊 Test Summary:');
    console.log(`   Total tests: ${testsPassed + testsFailed}`);
    console.log(`   Passed: ${testsPassed}`);
    console.log(`   Failed: ${testsFailed}`);
    console.log('==================================================\n');

    if (testsFailed === 0) {
      console.log('🎉 All authentication tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

// Wait a bit for server to be ready, then run tests
setTimeout(runTests, 1000);
