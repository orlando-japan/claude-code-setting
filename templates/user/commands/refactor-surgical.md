---
description: Refactor code while preserving observable behavior — tests must pass before and after
argument-hint: [file or symbol to refactor]
allowed-tools: Read, Edit, Grep, Glob, Bash(npm test:*), Bash(pnpm test:*), Bash(pytest:*), Bash(go test:*), Bash(cargo test:*)
---

Refactor: **$ARGUMENTS**

**The contract:** behavior before == behavior after. Only internal structure changes.

**Protocol:**

1. **Run the existing tests first.** Green baseline. If they're not green, stop and fix them first — a refactor on red is a rewrite.
2. **List the refactor in ≤5 bullets** before touching code: what's moving, what's renaming, what's extracting. If the list grows beyond 5, you're doing too much — split it.
3. **One step at a time.** Make one refactor, run tests, commit. Make the next, run tests, commit. Don't batch.
4. **Don't change public interfaces.** If you must, it's not a refactor — it's a migration, and it needs a spec.
5. **Don't rename things "while you're in there."** Renames are cheap with tooling and expensive with ad-hoc edits. If they're worth doing, they're worth doing in their own commit.
6. **Don't introduce new abstractions.** The purpose is to clean up what exists, not to speculate about the future.

**Stop conditions:**

- Tests go red → stop, revert, diagnose.
- Scope creep detected → stop, surface to user, ask.
- You discover the original code was wrong (not just ugly) → stop, surface the bug, don't silently fix it in the refactor.

**Done looks like:** same tests green, diff is smaller and clearer than before, no new public API.
