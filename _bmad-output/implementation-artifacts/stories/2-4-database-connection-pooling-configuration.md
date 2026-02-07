# Story 2.4: Database Connection & Pooling Configuration

**Epic:** Epic 2: Database Design & Schema  
**Status:** ready-for-dev  
**Estimated Effort:** 4 hours (half day)  

---

## User Story

As the backend server, I want configured database connection pooling, so that I can efficiently handle concurrent player connections without exhausting database resources.

---

## Acceptance Criteria

- [ ] Connection pool with configurable size (default: min 5, max 20)
- [ ] Idle connection timeout (default: 30 minutes, configurable)
- [ ] Connection validation/health checks before use
- [ ] Connection retry on failure (exponential backoff: 1s, 2s, 4s)
- [ ] Environment-specific configs (dev: SQLite, staging: PostgreSQL, prod: PostgreSQL)
- [ ] Database URL stored in .env file (not hardcoded)
- [ ] Graceful shutdown: drain connection pool before exit
- [ ] Logging: Connection events (acquire, release, error)

---

## Environment Variables

```
DATABASE_URL=postgresql://user:password@host:5432/picture_this_dev
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=1800
NODE_ENV=development|staging|production
```

---

## Technical Requirements

### Pool Configuration
- Min connections: 5 (adjustable per environment)
- Max connections: 20 (adjustable per environment)
- Idle timeout: 30 minutes (1800 seconds)
- Connection timeout: 10 seconds
- Retry strategy: 3 attempts with exponential backoff

### Health Checks
- Light query: SELECT 1 (or equivalent)
- Run before each connection use
- Terminate unhealthy connections

### Logging
- Log: Connection acquired, released, errors
- Level: Info for acquire/release, Error for failures
- Include: Pool stats (active/idle count, queue size)

---

## Definition of Done

- [ ] Code committed to PR
- [ ] All acceptance criteria checked off
- [ ] Connection pool created with Sequelize/ORM
- [ ] Configuration from .env working
- [ ] Health checks implemented
- [ ] Retry logic tested (simulate connection failure)
- [ ] Graceful shutdown working (drain pool on exit)
- [ ] Logging configured
- [ ] Manual test: Monitor pool stats under load
- [ ] Code review completed

---

## Dependencies

**Blocked By:** Story 2.2 (Migrations - need initialized DB)

**Unblocks:** All database-dependent stories (3+)

---

## Source References

- [epics.md Story 2.4](../planning-artifacts/epics.md#story-24-database-connection--pooling-configuration)
