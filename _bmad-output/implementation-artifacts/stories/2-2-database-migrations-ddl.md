# Story 2.2: Database Migrations & DDL

**Epic:** Epic 2: Database Design & Schema  
**Status:** ready-for-dev  
**Estimated Effort:** 4 hours (half day)  

---

## User Story

As a backend engineer, I want to manage database schema changes through migrations, so that we can safely evolve the schema across environments.

---

## Acceptance Criteria

- [ ] Create migration system (Sequelize migrations or Knex for Node.js)
- [ ] Write initial DDL migration to create all 9 tables (from Story 2.1 schema)
- [ ] Migration files are versioned and ordered (001_initial_schema.js)
- [ ] Migrations support both up (apply) and down (rollback)
- [ ] Test rollback to ensure migrations are reversible
- [ ] Lock mechanism prevents concurrent migrations
- [ ] Migration history tracked in database
- [ ] Dry-run capability to preview changes (optional)

---

## Technical Requirements

### Migration Tool
- Sequelize (if using ORM) OR native Node.js migration library
- Naming convention: `YYYYMMDD_HHmmss_description.js` or `001_description.js`
- Support: Up/down migrations with async/await

### Initial Migration
- Create all tables from Story 2.1
- Add primary keys, foreign keys, indexes
- Set constraints and defaults
- Include soft delete fields

### Rollback Testing
- For each migration: Test that `down()` successfully reverses `up()`
- No data loss on rollback
- Schema identical before/after rollback cycle

---

## Definition of Done

- [ ] Code committed to PR
- [ ] Migration framework set up
- [ ] Initial DDL migration created (all 9 tables)
- [ ] Migration history table created (tracks applied migrations)
- [ ] Rollback tested on all migrations
- [ ] Lock mechanism prevents concurrent migrations
- [ ] Migration runner script works (`npm run migrate up`, `npm run migrate down`)
- [ ] Manual test: Apply migrations, rollback, reapply on clean DB
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 2.1 (Schema Design - need schema to migrate)

**Unblocks:** 
- Story 2.3 (Seed Data - runs after migrations)
- Story 2.4 (Connection Pooling - needs DB initialized)

---

## Source References

- [epics.md Story 2.2](../planning-artifacts/epics.md#story-22-database-migrations--ddl)
