---
name: git-clean-commit-guard
description: Clean a repo into a commit-ready state before writing or approving a commit. Invoke when preparing a commit and you need to remove staging noise, split scope, and catch unsafe files.
category: workflow
group: workflow
tags: [git, commit, hygiene, staging]
risk: medium
---

# Git clean commit guard

A good commit starts before the message. This skill is the pre-commit hygiene pass: reduce staging noise, isolate one logical change, and catch the files that should never ride along.

## What this skill does

It does **not** write the final commit message. It prepares the diff so a later commit or review step can succeed.

## Guard workflow

1. **Inspect the repo state**
   - `git status`
   - `git diff`
   - `git diff --staged`
2. **Split logical changes**
   - If the diff mixes unrelated work, stop and split it before committing
3. **Remove accidental files**
   - local config
   - generated artifacts
   - debug output
   - unrelated lockfile churn
   - credentials / secrets
4. **Check commit scope integrity**
   - Bug fix + test together is fine
   - Feature + refactor + docs usually needs separation
5. **Propose explicit staging**
   - Prefer file-by-file `git add <path>`
   - Avoid blanket staging commands

## Things that should trigger a block

- `.env`, credentials, tokens, keys, passwords
- build output or generated snapshots with no clear reason
- staged files unrelated to the stated task
- opportunistic refactors bundled into a fix commit
- a lockfile change without a matching dependency reason

## Preferred output

```text
Commit hygiene result: Pass | Pass with nits | Block

Keep staged:
- <paths>

Unstage / remove:
- <paths>

Reason:
- <scope contamination or safety risk>

Suggested next command set:
- git restore --staged ...
- git add ...
```

## Anti-patterns

- **Starting with the commit message** — first clean the diff, then name it.
- **Using `git add .` out of laziness** — that is how local junk enters history.
- **Treating "mostly related" as good enough** — future bisect and review quality collapse fast.
- **Letting secrets rely on luck** — always perform an intentional safety scan.
