# Commit conventions

## Format

Conventional Commits, but lightweight:

```
<type>(<scope>): <subject>

<body — why, not what>

<footer — refs, breaking change notes>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`.

Scope is optional. Subject is imperative, lowercase, no period, <=72 chars.

## Body: the "why"

Code diff already shows *what* changed. The body is for *why*:

- What constraint forced this change?
- What was wrong with the previous approach?
- What alternative did you consider and reject?

If the diff is self-explanatory (typo fix, dep bump), skip the body.

## One logical change per commit

- Feature + unrelated refactor = two commits.
- Fix + test for the fix = one commit (they prove each other).
- Multi-file rename driven by one decision = one commit.

## What never goes in a commit

- **Secrets.** Check `git diff --staged` for tokens before committing.
- **Generated files that a build produces.** Build artifacts, minified output, autogen docs.
- **Large binaries.** Use LFS or a separate bucket.
- **`console.log`, `print`, debug statements** left over from debugging.
- **Commented-out code.** Delete it.

## Squash vs merge

- **Feature branches:** squash on merge to main. Clean history, one commit per logical feature.
- **Long-running refactors:** consider merge (not squash) to preserve the step-by-step story.
- **Hotfixes:** fast-forward. No merge commit.

## When not to commit

- Don't commit broken code to main, even with "WIP."
- Don't commit failing tests hoping to fix them in the next commit. Fix first, commit green.
- Don't commit during active debugging. Let state settle.
