# Data access

## Migrations

- All schema changes go through versioned migration files. Never `ALTER` in production directly.
- Every migration must be **backwards-compatible with the previous app version** during rolling deploys.
- Column rename pattern: add new → dual-write → migrate reads → remove old. Never rename in one step.
- Migrations that lock tables (e.g. adding a NOT NULL column without a default) require a maintenance window or a shadow-copy strategy.
- Every migration is reversible. Write both `up` and `down`.

## Queries

- Always include a `WHERE` clause on user-owned data. Never `SELECT * FROM orders` without a filter.
- Paginate large result sets. Default limit ≤ 100 rows. Never return unbounded results.
- **N+1 queries:** if you're calling a query inside a loop, stop. Use joins, batch loads, or eager loading.
- For any new query on a table with > 10k rows, check the query plan (`EXPLAIN ANALYZE`) before shipping.

## Indexes

- Add the index before writing the query that needs it, not after you see slow query logs.
- Unique constraints belong in the database schema, not only in application code.
- Don't index every column. Each index slows writes. Index what the slowest reads need.
- Composite index column order matters: put the highest-selectivity or equality-filtered column first.

## Transactions

- Keep transactions short. Long-held locks cause cascading timeouts.
- One logical operation per transaction. Don't batch unrelated writes "for efficiency."
- No network calls, no email sending, no external side effects inside a transaction — they can't be rolled back.

## Safety

- Parameterized queries always. No string interpolation into SQL — no exceptions.
- Soft-delete over hard-delete for user content: add a `deleted_at` column; filter in queries.
- Before running any bulk `DELETE` or `UPDATE` in production: run the equivalent `SELECT` with the same `WHERE` clause first, check the row count, then execute.
