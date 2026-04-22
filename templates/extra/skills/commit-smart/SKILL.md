---
name: commit-smart
description: Write commits that explain the "why". Invoke when staging and committing any change; a strong commit message pays back on every future bisect.
category: delivery
group: core
tags: [git, conventional-commits, history]
risk: low
---

# Commit smart

The commit message is the one artifact a future bisector will read. Make it earn its keep.

## Format

Conventional Commits, lightweight:

```
<type>(<scope>): <imperative subject>

<body: why, not what>

<footer: refs, breaking notes>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.

Subject rules: imperative mood, lowercase, no trailing period, ≤72 chars.

## The subject

- **Good:** `fix(auth): redirect logged-out users with return_to`
- **Good:** `refactor(db): extract connection pooling into pool.ts`
- **Bad:** `Fixed a bug` (vague, past tense)
- **Bad:** `Update auth.ts` (what file, not what change)
- **Bad:** `Fix: fix the fix for the auth issue` (noise)

## The body — why, not what

The diff shows what changed. The body answers:

- What was the problem this solves?
- What constraint forced this particular solution?
- What alternative did you consider and reject, and why?

Skip the body for obvious changes: typo, dep bump, version tag.

**Example:**

```
fix(auth): redirect logged-out users with return_to

Users who bookmarked /settings and were logged out were landing
on /login with no path back. They had to navigate manually after
logging in, and ~15% bounced.

Alternative considered: store return_to in a cookie on the 401.
Rejected because cookies persist across sessions and can leak
stale redirects.
```

## One logical change per commit

- Bug fix + its test: one commit (they prove each other).
- Feature + unrelated refactor: two commits.
- Rename + functional change: two commits (the rename comes first, makes the second reviewable).

If `git diff --staged` shows changes that don't belong together, unstage and split.

## What never goes in a commit

- Secrets. Check `git diff --staged | grep -iE '(token|secret|key|password)'` before every commit.
- Large binaries. Use LFS or a bucket.
- Generated files your build produces.
- `console.log`, `print()`, `binding.pry` left over from debugging.
- Commented-out code.

## Amending and rewriting

- **Amending:** only your latest un-pushed commit. Never amend a published commit.
- **Rebase -i to clean up:** before opening a PR, squash WIPs into meaningful commits. After review, don't rewrite — reviewers have seen the old hashes.
- **--no-verify:** never, unless the user explicitly asks. Hooks exist for reasons.

## Frequency

Commit hourly. Small, frequent, local commits save your work and make bisection tractable. Squash at PR time if the micro-commits aren't interesting.
