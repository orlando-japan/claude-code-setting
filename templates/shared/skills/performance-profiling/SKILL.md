---
name: performance-profiling
description: Find real performance problems with measurement, not guesses. Invoke when something is slow, or you're tempted to "optimize" without data.
category: performance
tags: [profiling, measurement, optimization]
risk: medium
---

# Performance profiling

Optimization without measurement is just adding complexity. Measure first, always.

## Step 0 — Define "slow"

What does the user experience? What's the actual number, and what's the target?

- "Page takes 4 seconds to load" → specific.
- "Feels slow" → useless. Get numbers.

Without a target, you won't know when to stop optimizing.

## Step 1 — Measure the baseline

Use the simplest tool that gives real numbers:

- **Request latency:** `curl -w '%{time_total}\n' -o /dev/null -s URL`
- **Frontend:** browser DevTools Network + Performance panels
- **Backend:** language-native profiler (cProfile, pprof, async_hooks, perf)
- **DB:** `EXPLAIN ANALYZE`, slow query log

Measure:

- Steady state, not first request (JIT, cache warm-up).
- Multiple samples (p50, p95, p99). Average alone hides tail latency.
- Realistic inputs, not empty fixtures.

**Write the number down.** You'll need it for the "did it help" check.

## Step 2 — Find the biggest contributor

Profilers lie by default when used wrong. Sanity-check:

- **Flame graphs** for CPU — look for the widest bar at the bottom.
- **Trace spans** for distributed systems — the long spans are the real cost.
- **Allocation profile** for memory / GC pressure.
- **Query log** for DBs — most wall time is usually one or two queries.

**80/20 rule.** The slowest 20% of your code consumes 80% of the time. Find that 20% and ignore the rest.

## Step 3 — Form a hypothesis

State out loud: "I think `X` is slow because `Y`." If you can't articulate *why*, you're guessing.

Common hypotheses:

- **N+1 queries.** Loop that hits the DB per iteration.
- **Missing index.** Full table scan.
- **Sync I/O in async code.** Blocking the event loop.
- **Over-serialization.** Converting a 10MB blob that gets thrown away.
- **Bad cache policy.** Cache thrash, miss on hot keys, TTL too short.
- **Chatty protocols.** Ten round trips where one would do.

## Step 4 — Change one thing, measure again

- **Change one thing.** Multiple changes simultaneously = can't attribute.
- **Re-measure with the exact same method.** Different method, different numbers.
- **Compute the delta.** p99 before vs p99 after. Not "it feels faster."
- **If no improvement, revert.** Don't leave speculative optimizations in the code.

## When optimization is premature

- No user has complained.
- No SLO is at risk.
- Code is called rarely or with small inputs.
- You don't have a baseline measurement.

In those cases, stop. Revisit only if one of them changes.

## When optimization is late

- Endpoint p99 is 10x the target.
- A user-facing page times out.
- Database CPU is pegged.
- Memory keeps climbing.

Don't "schedule" optimization in these cases. Fix now.

## Anti-patterns

- **Micro-optimizing hot loops you haven't profiled.** `++i` vs `i++` doesn't matter until you prove it matters.
- **Caching to hide a slow query.** Fix the query. Cache *after* it's already fast.
- **Adding a cache without an invalidation strategy.** A stale cache is a correctness bug, not a performance fix.
- **Refactoring for speed.** Refactors should be behavior-preserving. Speed changes are different, with different verification.
- **Reading benchmarks on the internet.** Measure *your* code on *your* hardware with *your* data.
