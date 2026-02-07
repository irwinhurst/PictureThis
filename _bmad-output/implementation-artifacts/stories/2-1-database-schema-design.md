# Story 2.1: Database Schema Design

**Epic:** Epic 2: Database Design & Schema  
**Status:** ready-for-dev  
**Estimated Effort:** 6 hours (half day)  

---

## User Story

As a backend engineer, I want to design a complete database schema, so that we have a clear structure for storing game data persistently.

---

## Acceptance Criteria

- [ ] Define 9 tables: users, players, game_sessions, cards, game_participants, game_rounds, player_selections, round_results, generated_images
- [ ] Specify primary keys and relationships (foreign keys) for all tables
- [ ] Define indexes for frequently queried columns (game_code, player_id, session_id)
- [ ] Schema documentation with column descriptions and data types
- [ ] Support for 1000+ concurrent players and 100+ simultaneous games
- [ ] All required fields identified and typed (UUID, VARCHAR, INT, ENUM, TIMESTAMP, JSON, LONGTEXT)
- [ ] Nullable vs NOT NULL constraints specified
- [ ] soft delete support on players and users (deleted_at timestamp)

---

## Table Specifications

| Table | Purpose | Key Columns |
|-------|---------|-----------|
| **users** | Host authentication | id, google_id (unique), email, name, profile_picture_url, created_at, last_login_at, deleted_at |
| **players** | Anonymous game participants | id, username, avatar |
| **game_sessions** | Game instances | id, code (unique, indexed), host_id (FK), status, max_rounds, max_players, created_at, started_at, ended_at |
| **cards** | Noun and sentence templates | id, text (indexed), type (noun/sentence), blank_count, pack, difficulty, created_at |
| **game_participants** | Player-game join table | id, session_id (FK, indexed), player_id (FK, indexed), score, judge_count |
| **game_rounds** | Round tracking | id, session_id (FK, indexed), round_number, judge_id (FK), sentence_template, status |
| **player_selections** | Card selections per round | id, round_id (FK, indexed), player_id (FK, indexed), blank_number, card_id (FK) |
| **round_results** | Scoring outcomes | id, round_id (FK, indexed), winner_id (FK), judge_id (FK), points_awarded, created_at |
| **generated_images** | Image cache | id, round_id (FK, indexed), prompt, image_url, provider, created_at |

---

## Technical Requirements

### Database Type
- PostgreSQL 14+ (primary)
- SQLite for dev/testing

### Design Principles
- Foreign key constraints enabled
- Checkpoints for enum fields (status IN [lobby, in_progress, completed])
- Unique constraints on: users.google_id, game_sessions.code, cards.text
- Version control for migrations

---

## Definition of Done

- [ ] Code committed to PR
- [ ] Schema design document created (SQL DDL or Markdown)
- [ ] All 9 tables defined with columns and constraints
- [ ] Foreign key relationships mapped
- [ ] Indexes defined for performance-critical columns
- [ ] Data types specified for all columns
- [ ] NULL/NOT NULL constraints specified
- [ ] Soft delete fields included (where applicable)
- [ ] Relationship diagram or ERD created
- [ ] Code review completed

---

## Dependencies

**Unblocks:**
- Story 2.2 (Database Migrations)
- Story 2.3 (Card Seed Data)
- Story 2.4 (Connection Pooling - knows schema)

---

## Source References

- [epics.md Story 2.1 - Table Schemas](../planning-artifacts/epics.md#story-21-database-schema-design)
