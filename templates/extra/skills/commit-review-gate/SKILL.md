---
name: commit-review-gate
description: Review a cleaned staged diff as the final gate before committing. Invoke after commit hygiene is done and you need a clear Pass, Pass with nits, or Block decision.
category: review
group: review
tags: [git, commit, review, gate]
risk: medium
---

# Commit review gate

This is the last reviewer pass before a commit is created or blessed. The diff should already be clean; now the question is whether the history entry is actually worth keeping.

## Review goal

Decide whether the proposed commit is:

- **Pass** — safe, scoped, and history-worthy
- **Pass with nits** — acceptable now, but a few improvements are still worth noting
- **Block** — should not be committed in its current form

## Gate checklist

1. **Scope clarity**
   - Does the staged diff represent one logical change?
2. **Risk clarity**
   - Are migration, config, auth, or data risks clearly surfaced?
3. **Evidence level**
   - Is there a matching test, validation step, or obvious reason why one is unnecessary?
4. **History quality**
   - Will a future reviewer understand why this commit exists?
5. **Message readiness**
   - Is the intended commit type/scope obvious from the diff?

## Default decision rules

### Pass
- single logical change
- no hidden safety risk
- evidence level is appropriate
- commit message shape is obvious

### Pass with nits
- basically sound, but naming / test / body rationale could be sharper

### Block
- mixed scope
- hidden risky files
- no evidence for a risky change
- commit intent is unclear
- should be split into multiple commits first

## Preferred output

```text
Decision: Pass | Pass with nits | Block

Why:
- <scope assessment>
- <risk assessment>
- <evidence assessment>

If blocked, do this next:
- <split / test / unstaging action>
```

## Anti-patterns

- **Re-running hygiene instead of reviewing** — this skill assumes the diff is already cleaned.
- **Approving because the code "looks fine"** — commit quality is about scope and history, not only correctness.
- **Blocking on tiny style nits** — reserve Block for issues that harm safety, scope, or history quality.
