---
name: feature-flag-strategy
description: Use feature flags to decouple deploy from release, then clean them up. Invoke when shipping any risky change, a gradual rollout, or a kill-switch.
category: delivery
group: workflow
tags: [feature-flags, rollout, safety]
risk: medium
---

# Feature flag strategy

A feature flag is debt. Its purpose is to *temporarily* decouple "code ships" from "users see it." Like any debt, unpaid flags compound.

## Reasons to flag

1. **Progressive rollout** — ship to 1% → 10% → 50% → 100%, watch metrics between each step.
2. **Kill switch** — the ability to turn off a feature in seconds if it breaks.
3. **Trunk-based development** — merge unfinished work safely behind a flag.
4. **A/B experiment** — separate code path for measured comparisons.

**Not** a reason:

- "We might want to disable this someday." Flags are not futureproofing.
- "Just in case." Add it when there's a concrete case.

## Four types of flags

| Type | Lifetime | Who reads it |
|---|---|---|
| **Release flag** | Days to weeks (until 100%, then delete) | No one after removal |
| **Kill switch** | Forever (until the feature itself is removed) | Ops during an incident |
| **Experiment flag** | Duration of the A/B test | Analytics pipeline |
| **Permissioning flag** | Forever (this is how you gate beta features) | Product & eng |

Release flags have the highest rot rate and cause the most harm if left behind. Kill switches should be boring and stable.

## Setup

- **Named clearly.** `checkout_v2_enabled`, not `flag_42`.
- **Owned.** Every flag has a human owner. No owner = delete.
- **Dated.** Every release flag has a scheduled removal date at creation time.
- **Default-safe.** If the flag provider fails, the default must be "off" for new features and "on" for kill switches of shipped features.
- **Scoped.** User, tenant, percentage, environment — decide and document.

## Rollout protocol

1. **Ship the code with the flag off.** Nothing changes for users. Verify deploy didn't break anything.
2. **Turn on for internal users.** Dogfood. Catch obvious bugs.
3. **1% of production.** Watch metrics: error rate, latency, conversion. Compare flagged vs unflagged.
4. **10%, 50%, 100%.** Each step, wait long enough to see a problem. Don't marathon.
5. **Remove the flag code.** Schedule this in the same sprint you hit 100%. Don't drift.

Between steps, if metrics regress: **flip the flag back**. Don't debug live with a flag half-on. Stabilize first.

## Code hygiene

### The good version

```
if (flags.checkoutV2(userId)) {
  return newCheckout(...)
}
return oldCheckout(...)
```

Two code paths, one flag, clearly isolated.

### The bad version

```
function checkout(userId) {
  const isV2 = flags.checkoutV2(userId)
  const user = fetchUser(userId)
  if (isV2) user.version = 2
  const cart = fetchCart(userId, isV2 ? 'v2' : 'v1')
  // ... 200 more lines with `isV2` sprinkled throughout
}
```

Branching on a flag inside every helper makes the code unmaintainable. Duplicate the path at the top level; keep the internals pure.

## Cleanup

Set a **rule** in the team:

- **Release flags live ≤ 30 days** past 100% rollout. Longer = debt.
- **Cleanup is part of the feature, not a separate follow-up.** The story isn't done until the flag is out of the code.
- **A quarterly audit.** List all flags, filter to release-type, flag anything older than the rule.

## Anti-patterns

- **Permanent release flags.** If you're at 100% for six months, delete it.
- **Flags inside flags.** Nested flag conditions become unprovable. Refactor.
- **Flags read in hot loops.** A flag lookup per row of a 1M-row query is a latency problem.
- **Silent flag default changes.** "We quietly flipped the default to on" is a prod change. Treat it like a deploy.
- **Kill switches nobody tests.** A kill switch you've never flipped is a kill switch you don't know works. Test it during drills.
- **Flags as configuration.** If it's not about rolling out a new *feature*, it's config, not a flag. Different tooling.
