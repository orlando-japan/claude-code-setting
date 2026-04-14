---
name: root-cause-analysis
description: Find the real cause of a problem, not just the symptom. Invoke when debugging, after an incident, or when "we fixed it but I don't know why."
category: debugging
tags: [5-whys, diagnosis, postmortem]
risk: low
---

# Root cause analysis

A symptom is what you see. A cause is what produced it. Fixing the symptom stops the pain now; fixing the cause stops the pain forever.

## The 5 Whys

The simplest tool: ask "why" until you hit a cause you can act on *at the system level*, not the code level.

**Example:**

- **Symptom:** the checkout page returned 500 errors at 3pm.
- Why? → The `payment` service threw an unhandled exception.
- Why? → It received a null value for `user.address`.
- Why? → The `user` service returned a user with no address field.
- Why? → The migration that added `address` only ran for new users; old users had no address.
- Why? → The migration didn't include a backfill step for existing rows.

Stop condition reached: "We don't enforce backfill as part of migration review." That's actionable at the system level — write a checklist, add a lint, add the review rule. Fixing at this level prevents the next null pointer.

Going further ("why don't we have a checklist?" → "we never thought of it") doesn't help. You've hit the useful floor.

## Guardrails on 5 Whys

- **Stop at a cause you can act on.** Not "a human made a mistake." "A human made a mistake" is never a root cause — it's where to start asking why the system permitted the mistake.
- **Don't stop at "bad code."** Bad code got merged, that's a process question. Why did review not catch it? Why did tests not catch it?
- **One "why" per step.** Don't branch mid-sequence. If there are two causes, analyze them separately.
- **Follow causal chains, not correlations.** "Shipped Tuesday, broke Tuesday" is correlation. Prove causation.

## Causes come in layers

For most incidents, you'll find multiple layers of cause:

1. **Technical cause.** Null pointer, race, config mistake.
2. **Process cause.** Code review missed it, test wasn't in the suite, deploy policy let it through.
3. **Organizational cause.** No owner for this service, pressure to ship, stale on-call rotation.

A good RCA addresses at least two layers. A great one addresses all three. Fixing only the technical cause guarantees a next incident with a different technical symptom and the same process gap.

## Traps

### "Human error"

"Alice deployed the wrong version" is where you start, not where you stop. Why was deploying the wrong version possible? Why didn't the system warn her? Why was she deploying manually? **Systems, not humans, are at fault.**

### Confirmation bias

You form a theory in the first 10 minutes and spend the next hour proving it. Ask explicitly: **"What would falsify this theory?"** Then try to falsify it.

### Single cause fallacy

Most non-trivial incidents have multiple contributing causes. Fix all of them. A single-cause narrative is tidy but usually wrong.

### Stopping at the first convincing story

Convincing ≠ correct. Keep asking "could it be anything else?" until you've eliminated alternatives. If there's no evidence, build the experiment to produce evidence.

### The symptom trap

Fixing the error message, the crash, the timeout — while ignoring why they happened. Common in oncall under pressure. Document the symptom fix as a short-term patch, then circle back for the cause.

## Output format

After analysis:

```
## Incident
<one sentence>

## Timeline
- 14:52 — <event>
- 14:58 — <event>

## Causes
- Technical: <specific bug or misconfiguration>
- Process: <how it got past review / testing / deploy>
- Organizational: <resourcing, ownership, priority signal>

## Contributing factors
- <non-causal factors that made it worse>

## What we changed
- <concrete action, owner, deadline>
- ...

## What we're not changing and why
- <things considered but rejected as overreaction>
```

## Anti-patterns

- **"Just add more logging."** Useful, but not a root cause fix. What caused the bug?
- **"Add a test for this specific bug."** Start — but ask: what class of bug is this? Cover the class.
- **Blame in the postmortem.** Kills future postmortems. People stop writing them if they expect punishment.
- **Actions without owners or deadlines.** "We should improve X" is not an action item. "@alice will ship X by 2026-05-01" is.
- **Closing the loop without verification.** Six months later, did the action items ship? Audit.
