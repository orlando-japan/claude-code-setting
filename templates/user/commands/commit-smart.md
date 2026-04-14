---
description: Stage the right files and write a conventional commit from the diff
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Read
---

Produce a commit from the current working state.

**Step 1 — inspect:**

- Run `git status` (no `-uall`).
- Run `git diff` for unstaged and `git diff --staged` for staged.
- Run `git log -5 --oneline` to match the repo's message style.

**Step 2 — classify changes:**

Group the diff into logical units. If the diff contains multiple logical changes, **ask the user whether to split into multiple commits** rather than bundling.

**Step 3 — stage:**

- Stage files by name, never `git add .` or `git add -A`.
- Never stage `.env`, credentials, lockfile-unrelated-to-dep-changes, or build artifacts. Warn if the user asks you to.

**Step 4 — write the message:**

Format:

```
<type>(<scope>): <subject>

<body: why, not what>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`. Subject imperative, lowercase, no period, ≤72 chars.

Skip the body for obvious changes (typo, dep bump). Include it when the *why* isn't in the diff.

**Step 5 — commit:**

Pass the message via heredoc. Do not use `--no-verify`. If a hook fails, fix the underlying issue and create a **new** commit — don't amend.

Do not push.
