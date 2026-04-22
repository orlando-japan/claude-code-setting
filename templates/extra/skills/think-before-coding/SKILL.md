---
name: think-before-coding
description: Before writing code, surface load-bearing assumptions and verify or ask about each one. Invoke when starting any non-trivial task to avoid building on wrong guesses.
category: coding
group: core
tags: [planning, assumptions, discipline]
risk: low
---

# Think before coding

Most bad AI code comes from confidently building on a wrong assumption. This skill forces assumptions above the waterline before code hits the editor.

## When to use

- Starting any task touching more than ~3 files.
- Whenever an existing function or API is central to what you're about to do.
- After receiving a vague bug report.

## Protocol

**Step 1 — draft the assumption list.** Write out (in chat, not comments) every claim your planned change depends on. Aim for 5–15 items. Categories:

- Input shape ("the `user` object has a `permissions` array")
- API behavior ("`fetch()` throws on 4xx")
- Invariant ("this function is only called after auth")
- Edge case absence ("the list is never empty")
- Type narrowing ("`value` is `string` here, not `string | null`")

**Step 2 — classify each assumption.**

- **Obvious** (the types or local code make it unambiguous) → skip.
- **Load-bearing and uncertain** → verify by reading the relevant source, running the code, or checking docs. Spend up to ~10 minutes per assumption. If you can't resolve it, ask the user.
- **Cosmetic** (wrong guess wouldn't break correctness) → note it and continue.

**Step 3 — act on what you learned.** If verification changed the design, revise the plan before writing code. Don't patch the wrong plan after the fact.

## Anti-patterns

- **"I'll check it in the tests."** Tests find bugs after you've built on them. Check *first*.
- **"Most likely it's X."** Probabilistic reasoning is fine for priors, not load-bearing code.
- **Skipping the list because the task is "simple."** Simple tasks with one wrong assumption produce subtle bugs.

## Output

A short pre-code section labelled "Assumptions" with the list and how you verified each, before any code edits.
