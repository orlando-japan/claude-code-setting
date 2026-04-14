---
name: brainstorming
description: Diverge then converge on design options before committing. Invoke when the problem has multiple plausible solutions and the choice isn't obvious.
category: architecture
tags: [planning, design, decision-making]
risk: low
---

# Brainstorming

The goal isn't "a list of ideas" — it's "enough options to know the current favorite is actually the best."

## When

- Non-obvious design decisions (storage model, API shape, async strategy).
- Before a spec or ADR.
- When the first idea feels right (that's when to look hardest for alternatives).

## Protocol

**Phase 1 — Diverge (timebox: 10–20 min).**

Generate at least **three** distinct approaches. Not three variants of the same idea — three approaches that would lead to *different* code and *different* trade-offs.

For each approach, write:

- The one-sentence idea.
- What it optimizes for (speed, simplicity, consistency, cost…).
- The most obvious failure mode.

If you can only think of one, you haven't thought about it. Forcing three alternatives is the point.

**Phase 2 — Converge.**

Compare on:

- **Correctness** — can this actually solve the problem, or does it punt on an important case?
- **Simplicity** — how much code? How many new concepts for future readers?
- **Reversibility** — if we're wrong, how painful is it to change?
- **Operability** — how does this fail in production, and how do we notice?
- **Time to first value** — how long before a user sees anything?

**Phase 3 — Pick and record rejected options.**

Write: "We chose A because X. We rejected B because Y. We rejected C because Z."

Rejected options are the most valuable output of brainstorming — future maintainers will otherwise re-derive them.

## Forcing functions

- **Pre-mortem.** "Imagine this is 6 months old and broken. What went wrong?" Do this for each option.
- **Reverse the prior.** If you're leaning toward building, ask: "what if we bought it / didn't build it at all?"
- **The extreme cases.** What does this approach do at 10x scale? At 1/10x? At 0 users?

## Anti-patterns

- **Rubber-stamping.** "I brainstormed and the first idea won" — suspicious, always.
- **Straw-man alternatives.** If your "rejected" options are all obviously bad, you stacked the deck. Steelman them.
- **Analysis paralysis.** Timebox the diverge phase. The goal is decision quality, not list length.
- **Skipping the record of rejections.** Without them, the decision looks arbitrary in six months.
