---
name: create-pr
description: Write a PR title and description that passes review quickly. Invoke when opening a pull request for any non-trivial change.
category: delivery
tags: [git, github, review]
risk: low
---

# Create PR

A good PR has a clear title, an explained *why*, and a test plan. A bad PR has "WIP" in the title and 900 files changed.

## Before opening

- **Rebase on latest main.** Stale branches get bounced.
- **Squash WIP commits.** Your history is your problem; reviewers shouldn't see 40 "fix typo" commits.
- **Self-review the diff first.** Open it in the GitHub UI and read it like a reviewer. Remove noise, commented-out code, stray `console.log`.
- **Confirm all tests pass locally.** Don't outsource detection of obvious failures to CI.

## Title

One line, ≤70 chars. Format: `<type>: <what and for whom>`.

- Good: `fix(auth): redirect logged-out users with return_to param`
- Bad: `WIP fixes`
- Bad: `Update auth.ts`
- Bad: `Refactor everything in the middleware to be cleaner and more maintainable and also fix the bug`

## Description structure

```markdown
## Summary
<1-3 bullets. What changed and why. Not "what files changed" — the diff shows that.>

## Context
<Optional. Only if the why isn't obvious. Link to the incident / ticket / design doc that forced this.>

## Test plan
- [ ] <concrete, runnable check #1>
- [ ] <concrete, runnable check #2>
- [ ] <concrete, runnable check #3>

## Screenshots
<If UI changed. Before/after pair if possible.>

## Risks / rollout notes
<Optional. Any migration, flag, feature gate, or order-dependent deploy.>
```

## Test plan items — concrete > abstract

- **Good:** `[ ] Run pnpm test auth.test.ts — all 8 tests pass`
- **Good:** `[ ] As a logged-out user, visit /settings — redirects to /login?return_to=/settings`
- **Bad:** `[ ] Tested locally`
- **Bad:** `[ ] No regressions`

## Size

- **Target: <400 lines of diff** for a reviewable PR.
- **If larger:** is this really one change, or should it split? Multi-commit stacked PRs often beat one mega-PR.
- **Never rename + refactor + add feature in one PR.** Each deserves its own.

## After opening

- **Don't force-push** unless you rebase on main or squash at the end. Force-pushing destroys review threads.
- **Reply to every comment.** "Fixed" is fine. Unanswered comments make reviewers think you ignored them.
- **Don't merge your own PR** unless policy allows. Ask someone.

## Draft vs ready

- **Draft:** still working, want early feedback on direction.
- **Ready:** you believe this can ship as-is.

Don't mark ready when you still have `// TODO` you plan to fix in review.
