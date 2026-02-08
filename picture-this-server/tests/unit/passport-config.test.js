const { 
  configurePassport, 
  getUserById, 
  getAllUsers, 
  clearUsers 
} = require('../../src/auth/passport-config');

describe('Passport Configuration', () => {
  let mockLogger;

  beforeEach(() => {
    // Clear users before each test
    clearUsers();
    
    // Mock logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  });

  afterEach(() => {
    clearUsers();
  });

  describe('User Management', () => {
    test('should start with no users', () => {
      const users = getAllUsers();
      expect(users).toEqual([]);
    });

    test('should clear all users', () => {
      // This test verifies the clearUsers function used in beforeEach
      expect(getAllUsers()).toEqual([]);
      clearUsers();
      expect(getAllUsers()).toEqual([]);
    });

    test('getUserById should return undefined for non-existent user', () => {
      const user = getUserById('non-existent-id');
      expect(user).toBeUndefined();
    });
  });

  describe('Configuration', () => {
    test('should configure passport without errors', () => {
      expect(() => {
        configurePassport(mockLogger);
      }).not.toThrow();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Passport configured with Google OAuth strategy'
      );
    });
  });
});
