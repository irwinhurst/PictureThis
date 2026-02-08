const { ensureAuthenticated, checkAuthenticated } = require('../../src/auth/middleware');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('ensureAuthenticated', () => {
    test('should call next() when user is authenticated', () => {
      req.isAuthenticated.mockReturnValue(true);
      
      ensureAuthenticated(req, res, next);
      
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should return 401 when user is not authenticated', () => {
      req.isAuthenticated.mockReturnValue(false);
      
      ensureAuthenticated(req, res, next);
      
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'ERR_AUTH_REQUIRED'
      });
    });

    test('should include proper error code', () => {
      req.isAuthenticated.mockReturnValue(false);
      
      ensureAuthenticated(req, res, next);
      
      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.code).toBe('ERR_AUTH_REQUIRED');
    });
  });

  describe('checkAuthenticated', () => {
    test('should add user to request when authenticated', () => {
      const mockUser = { id: 'user-123', name: 'Test User' };
      req.isAuthenticated.mockReturnValue(true);
      req.user = mockUser;
      
      checkAuthenticated(req, res, next);
      
      expect(req.user).toBe(mockUser);
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should set user to null when not authenticated', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.user = { id: 'user-123' }; // Should be overwritten
      
      checkAuthenticated(req, res, next);
      
      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should always call next() regardless of auth status', () => {
      req.isAuthenticated.mockReturnValue(false);
      
      checkAuthenticated(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      
      next.mockClear();
      req.isAuthenticated.mockReturnValue(true);
      
      checkAuthenticated(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
