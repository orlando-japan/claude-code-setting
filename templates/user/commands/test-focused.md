---
description: Run only the tests relevant to recently changed files
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(npm test:*), Bash(pnpm test:*), Bash(yarn test:*), Bash(pytest:*), Bash(go test:*), Bash(cargo test:*), Read, Glob
---

Run a **targeted** test pass rather than the full suite.

**Step 1 — find changed files:**

```
git diff --name-only HEAD
git status --porcelain
```

**Step 2 — map files to tests:**

- For each source file, find its co-located test (e.g., `foo.ts` → `foo.test.ts`, `foo.py` → `test_foo.py`).
- For files with no direct test, find tests that import them via grep.
- If the change is in shared/core code with many dependents, fall back to the full suite for that module — don't try to be too clever.

**Step 3 — run:**

Detect the test runner from `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`. Run it with the focused file list.

**Step 4 — report:**

- Pass/fail summary.
- For failures: copy the actual error, don't paraphrase.
- If a test failed, **stop and report** — don't try to fix it unless the user asks.

**When NOT to use this:**

- Right before merging — run the full suite then.
- After a refactor that touches shared types — the blast radius is too wide to predict.
- On a CI failure — reproduce locally with the exact same command CI used.
