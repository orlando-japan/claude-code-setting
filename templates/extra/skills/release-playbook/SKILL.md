---
name: release-playbook
description: Ship a release gradually with rollback ready. Invoke when cutting any production release beyond a trivial patch.
category: delivery
tags: [release, rollout, rollback]
risk: high
---

# Release playbook

Every release is two bets: that the new code works, and that if it doesn't, you can get back to the old code fast. Bet the first honestly; make sure the second always wins.

## The ideal release

1. **Staging deploy** — new code lands in staging, runs against staging-like data. Smoke test passes.
2. **Canary deploy** — a small fraction of production traffic (1%, or one pod, or one region) runs the new code. Metrics watched.
3. **Progressive rollout** — 10%, 50%, 100% with pauses. Each step has a go/no-go check.
4. **Observation window** — even at 100%, watch for an hour before declaring done.
5. **Release closed** — document what shipped.

Any shortcut to this is a trade-off. Be explicit about which tradeoffs you're making.

## Pre-flight checklist

- [ ] Code merged to main via a reviewed PR.
- [ ] CI green on main after the merge.
- [ ] Staging deploy complete and passed smoke tests.
- [ ] Feature flags set to safe defaults.
- [ ] Database migrations (if any) backward compatible.
- [ ] Rollback plan written and understood.
- [ ] Relevant teams notified (especially support, oncall).
- [ ] No incidents or freezes active.

## The rollback rule

**Rollback must be under 5 minutes, one command, and always available.**

If rollback is "revert the PR and redeploy" (15 min build) → not good enough. You need a faster path:

- **Blue-green deployment:** flip traffic back to the previous color.
- **Image rollback:** redeploy the previous container image (30s on k8s).
- **Feature flag off:** for flag-gated features, no redeploy needed.
- **DB rollback:** this is the hard one. Migration design must make rollback possible — see `db-migration-safety`.

Practice rollback. The first time you try it during an incident is the worst possible time.

## Canary monitoring

During canary, watch:

- **Error rate** — compare canary pods to rest of production. Higher on canary = bad sign.
- **Latency** — p95 and p99 on canary vs baseline.
- **Saturation** — CPU, memory, GC pressure.
- **Custom metrics** — anything specific to what changed.

**Stop the rollout if:**

- Error rate on canary > 2x baseline.
- Latency p99 increases significantly.
- Any alert fires on the canary.
- Something you don't understand.

Don't debug live with a partial rollout. Roll back first, debug second.

## Risk levels

Not every release is the same. Match rigor to risk:

- **Trivial:** typo fix, doc change. Full rollout, minimal watching.
- **Low:** bug fix, small feature. Canary + rollout with light monitoring.
- **Medium:** new feature, moderate refactor. Full canary, progressive rollout, active monitoring.
- **High:** big refactor, DB migration, auth change. Canary for hours, rollout over days, white-glove.
- **Extreme:** "we touched the auth / payment / data pipeline." Slow, feature-flagged, multiple reviewers, multiple sign-offs.

## Timing

- **Don't ship on Friday afternoon** unless it's a hotfix.
- **Don't ship the last day before a holiday** — nobody wants to be paged on vacation.
- **Don't ship during a launch or event** — traffic spikes and release risk combine badly.
- **Do ship early in the week, early in the day** — so there's time to respond if something goes wrong.

## After the release

- **Monitor for a full cycle** — at least an hour, often a day.
- **Document what shipped** — release notes, internal changelog, customer comms as needed.
- **Postmortem if anything broke** — even a small hiccup. Cheap to do, pays off next time.
- **Retire old code** — if the release was gated by a flag, schedule flag removal.

## Anti-patterns

- **Ship directly to 100%.** One bad deploy takes the whole thing down.
- **"CI was green, it's fine."** CI catches compile-time and test-time failures, not runtime.
- **No observation window.** You declare done and walk away; the bug manifests at scale 20 minutes later.
- **Mixing feature release and infra release.** Two risks at once, can't bisect.
- **Pressure-releasing.** "We need this out today" — ship feature-flagged, release the flag tomorrow. Separate deploy from release.
- **Rollback plan that's "we'll figure it out."** It's not a plan.
