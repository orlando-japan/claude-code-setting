---
name: goal-driven-execution
description: Define a verifiable success criterion before starting, then loop until it passes. Invoke for any task where "done" isn't trivially obvious.
category: coding
group: core
tags: [discipline, verification, tdd]
risk: low
---

# Goal-driven execution

Most "done" declarations are premature because the definition of done was vague. This skill forces a concrete check up front.

## Protocol

**Step 1 — Write the verification before the code.**

Phrase it as: "I will know this is done when `<command>` produces `<output>`."

Examples:

- "…when `pnpm test path/to/user.test.ts` exits 0 and shows 'handles empty input' passing."
- "…when visiting http://localhost:3000/settings as a logged-out user redirects to /login with `?return_to=/settings`."
- "…when `curl -X POST /api/user` with a missing name returns 400 with `{error: 'name required'}`."
- "…when `git log --oneline -5` shows 5 commits all tagged with `[auth-v2]`."

If you can't state a verification, the task isn't clear enough — ask the user before coding.

**Step 2 — Code.**

**Step 3 — Run the exact verification you wrote.**

Not a proxy, not "the type checker is happy," not "it compiled." The literal command from step 1.

**Step 4 — If it fails, iterate.** Diagnose the gap, fix, re-run. Don't declare done with "it should work now."

**Step 5 — If it passes, state it explicitly** with the command and its output in the message back to the user. This gives the user evidence, not a claim.

## For UI work

The verification must include actually opening a browser and exercising the feature:

- Golden path: the main user flow, click-through.
- At least one edge case: empty state, error state, or boundary input.

If you can't run a browser in the current environment, **say so explicitly**. Claiming success on unverified UI is the worst outcome.

## For bug fixes

1. Verification = the reproduction command fails before the fix and passes after.
2. No reproduction = no fix, it's a guess.
3. Reproduce first, fix second, confirm third.

## Anti-patterns

- **"Tests should pass now."** Run them.
- **"Based on my analysis it works."** Evidence over analysis.
- **Type check as verification.** Type check is necessary, not sufficient.
- **Declaring done when you hit the first green.** Run the full verification list, not just the one test you touched.
