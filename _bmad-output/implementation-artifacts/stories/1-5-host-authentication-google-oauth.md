# Story 1.5: Host Authentication with Google OAuth

**Epic:** Epic 1: Core Game Infrastructure & Server  
**Status:** ready-for-dev  
**Estimated Effort:** 10 hours (1.5 days)  

---

## User Story

As a host, I want to authenticate using my Google account, so that my game sessions are tied to my identity and can be recovered if needed.

---

## Acceptance Criteria

- [ ] Google OAuth 2.0 login integration on host landing page
- [ ] Redirect to Google login, then back to Picture This after authentication
- [ ] Store host user profile: google_id, email, name, profile_picture_url
- [ ] Session token issued to authenticated host (JWT or session cookie)
- [ ] Host remains logged in across browser sessions (persistent login)
- [ ] Logout endpoint available to end session
- [ ] Error handling for failed authentication (network errors, user cancellation)
- [ ] Unauthenticated users cannot create games (redirected to login)
- [ ] Host can see their profile info (email, name, picture) on dashboard

---

## Technical Requirements

### OAuth Setup
- Google OAuth 2.0 Client ID (from Google Cloud Console)
- OAuth endpoints: `/auth/google` (login), `/auth/google/callback` (redirect)
- Scopes: openid, profile, email

### User Storage
- Table: users (hosts only, players are anonymous)
- Fields: id (UUID), google_id (unique), email, name, profile_picture_url, created_at, last_login_at

### Session Management
- JWT tokens (signed, 24-hour expiry) OR server-side session cookies (secure, httpOnly)
- Token issued after successful authentication
- Middleware to verify auth on protected endpoints (`/api/create-game`, `/api/start-game`, etc.)

### Protected Routes
- `POST /api/games` (create game) - requires authentication
- `POST /api/games/:id/start` (start game) - requires host authentication

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Google OAuth client configured
- [ ] Login flow tested (Google → callback → logged in)
- [ ] Session token issued and validated
- [ ] Logout working
- [ ] Protected endpoints reject unauthenticated requests
- [ ] User profile stored in database
- [ ] Error handling tested (network failure, user cancellation)
- [ ] Manual test: Login/logout cycle with Google account
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 1.4 (Session Management - for session creation)

**Unblocks:** Story 1.6 (Create Game - requires authenticated host)

---

## Source References

- [GAME_DESIGN.md § 1. Core Game Mechanics & Flow](../planning-artifacts/GAME_DESIGN.md#1-core-game-mechanics--flow)
- [epics.md Story 1.5](../planning-artifacts/epics.md#story-15-host-authentication-with-google-oauth)
