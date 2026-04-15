---
name: migration-planning
description: Plan a safe migration (schema, API, framework, infra) that keeps the system live throughout. Invoke before starting any non-trivial change to a running system.
category: workflow
tags: [migration, zero-downtime, planning]
risk: high
---

# Migration planning

A migration is a sequence of **reversible** steps that gets you from A to B without breaking the world in between. The hard part is not the destination — it's what runs during the transition.

## The expand / migrate / contract pattern

This is the core template. It applies to schemas, APIs, config, infra, almost everything.

1. **Expand.** Introduce the new thing alongside the old. Both exist; nothing yet depends on the new.
2. **Migrate.** Gradually shift reads, writes, and callers to the new thing. Dual-write, dual-read if needed. Verify equivalence under load.
3. **Contract.** Once nothing uses the old thing, remove it.

Rollback is possible at any step. Skipping expand or mashing expand + contract = no rollback.

## Schema migrations specifically

### Safe changes (can ship without coordination)

- Adding a nullable column.
- Adding a new table.
- Adding a non-unique index (CONCURRENTLY if Postgres).
- Widening a column (e.g., VARCHAR(50) → VARCHAR(200)).
- Adding a check constraint marked NOT VALID, then validating later.

### Breaking changes (need expand/migrate/contract)

- Renaming a column → add new, dual-write, migrate data, switch reads, drop old.
- Changing a column type → add new column, backfill, switch reads, drop old.
- Dropping a column → stop writes, wait for all deploys, then drop.
- Adding NOT NULL to an existing column → add as nullable, backfill, add NOT NULL constraint as NOT VALID, validate, enforce.
- Adding a unique constraint → add unique index concurrently, then promote.

### Dangerous patterns

- **ALTER TABLE on large tables without `CONCURRENTLY`** → locks, downtime.
- **DROP COLUMN while old code still reads it** → crashes.
- **NOT NULL + default for 50M rows in one statement** → locks for minutes.
- **Renames** → the worst. Almost always cheaper to keep the old name.

## API migrations

- **Add v2 alongside v1.** Don't touch v1.
- **Dual-call** from callers when safe, compare outputs, migrate reads.
- **Deprecate with a date.** Sunset on day N + 90, not "eventually."
- **Remove** only after zero traffic for N days (measure, don't guess).

## Framework / library upgrades

- **Minor version:** usually drop-in. Run tests. Watch changelog for deprecations.
- **Major version:** expect incompatibilities. Branch, upgrade, fix, don't rush. If the upgrade touches multiple teams, coordinate.
- **Language version:** longest lead time. Run on a branch for weeks. CI matrix with both versions.
- **Never combine a major framework upgrade with a feature change.** Isolate so you can bisect regressions.

## Rollback plan

For every migration step, answer: "if this step is wrong, how do I undo it in <5 minutes?"

- Schema: kept the old column → revert reads, that's it.
- API: kept v1 → route traffic back to v1.
- Config: old value in source → redeploy old value.

**If your rollback is "run this DDL and hope,"** the plan isn't safe. Make the rollback cheaper.

## Pre-flight checklist

- [ ] Expand / migrate / contract phases identified
- [ ] Each phase is independently deployable
- [ ] Rollback plan for each phase, tested in staging
- [ ] Dual-read / dual-write verification for data migrations
- [ ] Feature flag to gate the new path
- [ ] Monitoring in place for error rate and latency during the migration
- [ ] Communication plan: when, who, how

## Anti-patterns

- **"Drop the old column in the same PR that adds the new one."** You just lost your rollback.
- **Big-bang migrations over a maintenance window.** Works until it doesn't. Zero-downtime is safer and cheaper over time.
- **No verification that dual-write matches.** Data drifts silently. Diff it.
- **Skipping monitoring during migration.** If you can't see the transition, you can't abort it.
