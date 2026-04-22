---
name: db-migration-safety
description: Ship schema changes with zero downtime and clean rollback. Invoke before any ALTER TABLE, new column, new index, or data backfill on a production database.
category: ops
group: ops
tags: [database, migration, schema, zero-downtime]
risk: high
---

# Database migration safety

Every production database migration follows one rule: **the old code and the new code must both work against both the old and the new schema**, at every point in the rollout.

If that's not true, you're betting on deploy atomicity. Deploy atomicity doesn't exist.

## The three-step pattern

For any non-trivial change:

1. **Expand** — add the new thing, leaving the old in place.
2. **Migrate** — shift reads and writes to the new thing. Backfill if needed.
3. **Contract** — once nothing uses the old, remove it.

Each step ships as its own deploy. Each is independently reversible. **Never combine expand and contract in one release.**

## Change cookbook

### Add a nullable column

- Safe. One step. Deploy.

### Add a NOT NULL column with a default

Dangerous on large tables — a naive `ALTER TABLE ... NOT NULL DEFAULT x` rewrites the table.

**Safe version:**

1. Add the column nullable. Deploy.
2. Backfill in batches (e.g., 1000 rows at a time with sleeps). Monitor replication lag.
3. Change code to always write the new column.
4. Add a `NOT NULL` check constraint as `NOT VALID` (Postgres) or equivalent.
5. Run `VALIDATE CONSTRAINT` in a low-traffic window.
6. In a later release, promote to a real `NOT NULL` column.

### Rename a column

Almost never worth it.

**If you must:**

1. Add the new column.
2. Code writes to both old and new (dual-write).
3. Backfill new from old.
4. Code reads from new.
5. Code stops writing to old.
6. Much later, drop old.

**Six deploys for a rename.** Usually the new name isn't worth it. Consider a view as an alias.

### Change a column type

Same as rename: add the new column, dual-write, backfill, switch reads, drop old.

For type widening (VARCHAR(50) → VARCHAR(200)), some databases support it in place. Check your specific DB.

### Add an index

- **Postgres:** `CREATE INDEX CONCURRENTLY`. Never the non-concurrent form in production.
- **MySQL:** `ALGORITHM=INPLACE, LOCK=NONE` (version-dependent — check).
- **Large indexes:** schedule off-peak, monitor replication lag.

### Add a unique constraint

- Postgres: `CREATE UNIQUE INDEX CONCURRENTLY`, then `ALTER TABLE ... ADD CONSTRAINT ... USING INDEX`.
- Verify data uniqueness *before* adding the index. A failing unique index mid-build is painful to recover from.

### Drop a column

1. Code stops reading it. Deploy.
2. Wait. How long? Until you're sure every caller, every cron job, every analytics query has been updated. Usually weeks.
3. Code stops writing it. Deploy.
4. Wait again. You might still want rollback headroom.
5. Drop the column.

**Common mistake:** steps 1 and 2 get conflated. Readers exist you didn't know about — nightly jobs, BI tools, a dashboard someone bookmarked.

### Backfill data

- Batch it. Never `UPDATE table SET x = ... WHERE 1=1` on a large table.
- Sleep between batches. Let replication catch up.
- Monitor: replication lag, lock contention, error rates.
- Idempotent. Re-running the backfill should be safe.
- Resumable. Store progress; can you pick up where you left off if you're killed?

## Rules of the game

- **Concurrent DDL only.** Non-concurrent on a prod table is a forbidden word.
- **Test migrations on realistic data.** A migration that's instant on a 1k-row dev DB takes 4 hours on a 100M-row prod DB.
- **Measure duration on staging with prod-like volume** before shipping.
- **Have a rollback plan for each step.** If step 3 of expand/migrate/contract fails, you should know exactly how to revert step 2.
- **Monitoring during the migration.** Error rate, query latency, lock wait, replication lag. Watch them live.
- **One schema change per deploy.** Don't bundle.

## Anti-patterns

- **"Just add NOT NULL DEFAULT."** Locks the table, rewrites every row, kills your database.
- **Big-bang migration during a maintenance window.** Works until the migration takes 6 hours and you're past your window.
- **Skipping the "code stops reading" wait.** You'll find the hidden reader in the rollback.
- **Dropping a column in the same PR that stops writing to it.** No rollback.
- **Relying on a deploy being atomic.** Between step 1 and step 2 of a deploy, old and new code are running *at the same time*. The schema must support both.
