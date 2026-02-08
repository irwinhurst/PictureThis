# Google OAuth Authentication - Implementation Guide

## Overview

This document describes the Google OAuth 2.0 authentication implementation for the PictureThis game server (Story 1.5).

## Features Implemented

### Authentication Routes

1. **Login Initiation** - `GET /auth/google`
   - Redirects users to Google OAuth login page
   - Requests scopes: `openid`, `profile`, `email`

2. **OAuth Callback** - `GET /auth/google/callback`
   - Handles the redirect from Google after authentication
   - Creates or updates user profile
   - Establishes session
   - Redirects to `/dashboard` on success or `/login-failed` on failure

3. **Logout** - `POST /auth/logout`
   - Terminates user session
   - Returns JSON confirmation

4. **Profile Endpoint** - `GET /api/auth/profile` (Protected)
   - Returns current user's profile information
   - Requires authentication

5. **Auth Status** - `GET /api/auth/status`
   - Returns authentication status and user info if logged in
   - Public endpoint

### Protected Endpoints

The following endpoints now require authentication:

- `POST /api/game/create` - Create new game (requires authenticated host)

### User Data Storage

Currently using in-memory storage (Map) for user profiles. Will be migrated to PostgreSQL database in Story 2.1.

User profile structure:
```javascript
{
  id: "user-{timestamp}-{random}",
  google_id: "Google profile ID",
  email: "user@example.com",
  name: "User Name",
  profile_picture_url: "https://...",
  created_at: "ISO timestamp",
  last_login_at: "ISO timestamp"
}
```

### Session Management

- Uses `express-session` for session handling
- Session cookie configuration:
  - `secure`: true in production (HTTPS only)
  - `httpOnly`: true (prevents XSS attacks)
  - `maxAge`: 24 hours (86400000 ms)
- Session secret configurable via `SESSION_SECRET` environment variable

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
SESSION_SECRET=your-session-secret-change-in-production
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable "Google+ API" or "Google Identity Services"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

## Testing

### Unit Tests

Run unit tests with:
```bash
npm run test:unit
```

Tests cover:
- Authentication middleware (`ensureAuthenticated`, `checkAuthenticated`)
- Passport configuration
- User management functions

**Test Results:** ✅ All 10 unit tests passing

### E2E Tests

Run E2E tests with:
```bash
npm run test:e2e
```

E2E tests verify:
- Google OAuth endpoint availability
- Authentication status for unauthenticated users
- Protected endpoint access control
- Logout functionality
- Error handling

**Test Results:** ✅ 7/8 authentication E2E tests passing (1 requires browser for OAuth flow)

### Manual Testing

1. Start the server:
```bash
npm start
```

2. Test authentication flow:
```bash
# Check auth status (should be false)
curl http://localhost:3000/api/auth/status

# Try to access protected endpoint (should return 401)
curl -X POST http://localhost:3000/api/game/create

# Initiate Google login (will redirect to Google)
# Open in browser: http://localhost:3000/auth/google
```

3. Complete login flow:
   - Visit `http://localhost:3000/auth/google`
   - Authenticate with Google account
   - You'll be redirected to `/dashboard`
   - Dashboard shows your profile and allows game creation

## Security Considerations

### Implemented

✅ Session cookies are `httpOnly` (prevents XSS)
✅ Cookies marked `secure` in production (HTTPS only)
✅ Session secret configurable via environment variable
✅ Protected endpoints reject unauthenticated requests
✅ User passwords not stored (OAuth delegation)

## Acceptance Criteria Status

From Story 1.5:

- [x] Google OAuth 2.0 login integration on host landing page
- [x] Redirect to Google login, then back to Picture This after authentication
- [x] Store host user profile: google_id, email, name, profile_picture_url
- [x] Session token issued to authenticated host (session cookie)
- [x] Host remains logged in across browser sessions (persistent login)
- [x] Logout endpoint available to end session
- [x] Error handling for failed authentication (network errors, user cancellation)
- [x] Unauthenticated users cannot create games (redirected to login)
- [x] Host can see their profile info (email, name, picture) on dashboard

## Dependencies

New packages added:
- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth 2.0 strategy
- `express-session` - Session management
- `jsonwebtoken` - JWT token support (future use)
- `bcrypt` - Password hashing (future use)
- `jest` - Unit testing framework

## Next Steps

1. Migrate user storage from in-memory to PostgreSQL (Story 2.1)
2. Add session persistence with database-backed store
3. Implement CSRF protection
4. Add rate limiting for auth endpoints
5. Set up proper Google OAuth app for production
