---
name: flaky-test-triage
description: Diagnose and fix non-deterministic tests. Invoke when a test passes sometimes and fails other times, or when CI has "just retry" as a culture.
category: testing
tags: [flaky, non-determinism, testing]
risk: medium
---

# Flaky test triage

A flaky test is a broken test. It teaches the team to retry until green, which trains the team to ignore failures — including real ones.

**Rule of the house: zero tolerance. Fix it or delete it. Don't retry.**

## First, confirm it's flaky

- Run it 10 times in isolation. If it fails any of those, it's flaky.
- Run it 10 times in parallel with the rest of the suite. If it only fails in the full-suite run, it has cross-test interference.
- Run it on CI 10 times. If only CI fails, the bug is environmental (clock skew, network, resource contention).

Quarantine it (`.skip` with a linked issue) while you diagnose. Don't let it poison signal for others.

## Common causes, in order of frequency

### 1. Async timing

- **Symptom:** test passes when slow, fails when fast. Or vice versa.
- **Root cause:** a promise wasn't awaited, a callback fired after the test ended, `setTimeout` was used as a synchronization primitive.
- **Fix:** await the actual thing you're waiting on (an event, a state change). Never `sleep(100)` and hope.
- **Tooling:** `waitFor(...)` helpers from your test framework.

### 2. Shared state between tests

- **Symptom:** test passes alone, fails in the suite.
- **Root cause:** global variable, module-level cache, DB row left behind, file system state.
- **Fix:** setup and teardown per-test. `beforeEach` / `afterEach`. Use transactional rollback or dedicated fixtures.
- **Dig deeper:** sometimes the global is in a library you depend on (process-wide singletons).

### 3. Non-deterministic iteration order

- **Symptom:** test asserts `[a, b, c]` but gets `[c, a, b]`.
- **Root cause:** dict/set/map ordering, filesystem listing, DB result without `ORDER BY`.
- **Fix:** sort before comparing, or assert with set semantics. Never assume order.

### 4. Real clock / real randomness

- **Symptom:** test fails based on the time or a coin flip.
- **Root cause:** `Date.now()`, `Math.random()`, `time.time()` inside the code under test.
- **Fix:** inject a clock / RNG. Freeze the clock in tests.

### 5. Real network / real services

- **Symptom:** fails when the internet is slow or the external service hiccups.
- **Root cause:** tests hit a real external API or DNS or whatever.
- **Fix:** mock at the HTTP boundary (not inside the code). Use a local stub.

### 6. Race conditions in the code under test

- **Symptom:** the flakiness is in the *production code*, not the test. The test is correctly revealing a real bug.
- **Root cause:** concurrent access to shared state without locking, event ordering assumptions.
- **Fix:** fix the production code. This is the scariest case — don't "fix the test" to silence it.

## Rules

- **Never retry flaky tests in CI.** `--retry 3` hides real failures. Outlaw it.
- **Every flake has an issue.** Even if you skip it for a week, file the ticket and link from the skip.
- **Rank by impact.** A flake in a critical test blocks everything. Fix it today. A nit flake in a rarely-touched area can wait.
- **Track the flake rate over time.** If it's rising, you have a systemic problem (probably environmental).

## When to delete

Some tests aren't worth fixing:

- **Tests of deprecated code** scheduled for removal.
- **Tests whose flakiness comes from an untestable interface** you don't control (e.g., scraping a 3rd-party site).
- **Tests that duplicate coverage** of another, non-flaky test.

If you're going to delete, check coverage first — don't delete the only test of a feature.

## Anti-patterns

- **"It's flaky, just rerun."** This normalizes retries and erodes trust in the suite.
- **Increasing timeouts.** Rarely the fix. Usually papering over a timing bug.
- **Adding `sleep(500)` in the test.** Never.
- **Blaming "CI is slow."** Sometimes true, often false. Measure before concluding.
- **Fixing the test to make it pass rather than fixing the bug the test is revealing.** Step back: is this flakiness or a real bug?
