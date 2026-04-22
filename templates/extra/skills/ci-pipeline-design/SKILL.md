---
name: ci-pipeline-design
description: Build a CI pipeline that's fast, reliable, and actually catches regressions. Invoke when setting up or auditing build/test/deploy automation.
category: ops
group: workflow
tags: [ci, automation, build, devx]
risk: medium
---

# CI pipeline design

Two failure modes dominate bad CI:

1. **Slow.** Devs wait 30 min for feedback and lose flow.
2. **Flaky.** Devs learn to "just rerun" and stop trusting results.

Fix both or fix neither — a reliable slow pipeline is ignored; a fast unreliable one is worse.

## Stages, in order

1. **Lint + type check.** Fastest, cheapest, catches the most trivial mistakes. Run first, fail fast.
2. **Unit tests.** Fast, deterministic, no I/O.
3. **Integration tests.** Hit real DBs, real HTTP. Slower, but catch wiring bugs unit tests miss.
4. **Build artifacts.** Compile, bundle, produce the deployable.
5. **E2E tests.** Full stack. Slow and brittle; reserve for critical flows.
6. **Security / lint deep passes.** `npm audit`, `pip-audit`, secret scanning, license check.
7. **Deploy** (if the branch is deploy-able).

Later stages depend on earlier stages passing. Fail fast at the earliest stage possible.

## Parallelism and caching

### Cache aggressively

- **Dependency cache** (`node_modules`, `~/.cache/pip`, `~/.cargo`). Keyed by lockfile hash.
- **Build cache.** If nothing changed in a subsystem, don't rebuild it.
- **Test result cache.** If the tests' inputs (code + deps) haven't changed, the results haven't either. Some test runners support this natively (Bazel, Turborepo, Nx).
- **Docker layer cache.** Order Dockerfile commands from "rarely changes" to "often changes."

### Parallelize independent work

- Lint and unit tests don't depend on each other — run in parallel.
- Integration tests by service shard — multiple runners in parallel.
- E2E scenarios split across machines — fan out.

### Know the critical path

The CI pipeline's wall-clock duration = the longest chain of sequential steps. Reducing a non-critical-path step doesn't help. Profile the pipeline itself: where is time actually spent?

## Reliability

- **No network calls to the internet** from tests unless explicitly mocked. Network flakes destroy trust.
- **No retries on test failure.** Retries hide real bugs. Fix flaky tests.
- **Isolated environments per run.** No shared DB, no shared temp files, no shared caches that could interfere.
- **Deterministic order.** No tests that depend on the previous test's state.
- **Bounded timeouts.** Per-step timeouts so a hung process doesn't burn an hour.

## What the pipeline MUST check

- Code compiles / type-checks.
- All tests pass.
- Lock files are committed and consistent.
- No secrets in the diff.
- License compatibility.
- Build artifact is produced successfully.

## What the pipeline should NOT check on every commit

- **Heavy security scans** (SAST, DAST) — scheduled nightly instead.
- **Full E2E matrix** — PR gets one browser; nightly gets all.
- **Performance benchmarks** — scheduled, not blocking.
- **Dependency freshness** — weekly Dependabot PR, not per-commit.

Not everything belongs in the critical path.

## Branch vs main pipelines

- **PR / feature branch:** fast, focused on correctness of the change. Skip heavy scans.
- **Main branch:** full suite including integration and E2E. Gates deploy.
- **Scheduled / nightly:** expensive scans, long-running tests, license audit, dep updates.

## Deploy gates

- Manual approval for prod (optional, depending on risk).
- Automated rollback if post-deploy health check fails.
- Staging deploy is not optional; it's the pre-prod gate.
- Feature-flagged rollouts for risky changes.

## Observability of CI itself

- Track build duration over time. If it's creeping up, fix it.
- Track test failure rate. Rising flake rate = trust erosion in progress.
- Track queue time. Underprovisioned runners cost more than new runners.
- Track what fails most often. That's where to invest.

## Anti-patterns

- **"Just rerun."** Normalize retries and trust dies.
- **`allow_failure: true`** for tests that are supposed to be real gates.
- **A single monolithic job.** Loses parallelism, blurs failure attribution.
- **Tests in one job, build in another, no dependency.** You can ship code that doesn't compile if the tests happened to pass.
- **Secrets in CI config as plain text.** Use the platform's secret store.
- **Running the full CI for docs-only changes.** Path-based skip, with care.
- **No timeouts.** One hung test burns a runner for hours.
