---
name: debugging-strategies
description: Systematic bug hunting. Invoke when stuck on a bug, when symptoms don't match your mental model, or when "fixing" the same area repeatedly.
category: coding
tags: [debugging, diagnosis, root-cause]
risk: low
---

# Debugging strategies

The fastest debugger is one that doesn't guess. Every step should be driven by evidence, not hunches.

## Phase 1 — Reproduce

If you can't reproduce, you can't debug. Before any hypothesis:

- Minimal reproduction: smallest input / sequence / env that triggers the bug.
- Deterministic: same inputs, same bug, every time. If it's intermittent, find the hidden non-determinism first (timing, order, state).
- Isolated: no other noise. Strip the scenario down.

If you can't make it reproduce, spend effort on reproduction tooling, not on fixing.

## Phase 2 — Bisect

Once reproducible, narrow the search:

- **Git bisect** if the bug is new — what commit introduced it?
- **Code bisect** — comment out half the code path. Does the bug remain? Which half?
- **Data bisect** — half the input. Does the bug remain with the smaller input?
- **Binary search in output** — where does good data become bad data? Log at midpoints.

Each step halves the search space. Don't skip halves out of laziness.

## Phase 3 — Hypothesis & test

State the hypothesis out loud: "I think X is happening because of Y."

Then ask: **"What experiment distinguishes this from alternatives?"**

- A test that passes if X, fails if not-X.
- A log line that proves which branch was taken.
- A breakpoint with a specific inspection.

Run the experiment. Update your belief. Repeat.

## Phase 4 — Fix at the root, not the symptom

When you find a misbehaving line, ask: "why is this line wrong?" Trace upward:

- Is the input wrong? Why?
- Is the caller wrong?
- Is the caller's caller wrong?

Stop at the first cause that, if fixed, would prevent this class of bug, not just this instance.

**Symptom patches** (null-check the crash site, catch the error, retry the request) silence the bug without fixing it. Reserve them for "ship now, fix next week" — and actually do the fix next week.

## Common traps

- **Confirmation bias.** You form a hypothesis and only look at data confirming it. Ask: "what would prove me wrong?"
- **Changing two things at once.** When multiple variables change simultaneously, you can't attribute the outcome. Change one, observe, then the next.
- **Fixing what isn't broken.** The bug is somewhere; it's probably not where you first looked. Prove the bug is where you think before patching.
- **Stopping at "it works now."** If you don't know *why* it works, you don't know why it'll break again.

## When to escalate

- Bug doesn't reproduce after ~30 minutes of effort: step back and question assumptions about the environment.
- Same area has had three bug fixes in the last week: the design is wrong, not the code. Redesign instead.
- Fix passes the repro but you can't explain the root cause: don't ship, keep digging.
