# Project instructions

> This file is project-specific. It layers on top of the user-level `~/.claude/CLAUDE.md` (shared coding principles, style, security, commit conventions, testing). Only put things here that are unique to *this* repo.

## What this project is

> One paragraph. What does this codebase do? Who uses it? What language and framework?

## How to run it

```bash
# install
# run dev
# run tests
# lint / format
```

## Architecture notes

> Non-obvious structure a new contributor would miss by reading `find . -type d`. Where does the important logic live? What's the request lifecycle? Where's the boundary between layers?

## Conventions specific to this repo

> Anything that deviates from the user-level rules. "We use tabs not spaces because X." "Tests live next to source, not in /tests, because Y." "No `any` in this codebase — turn on noImplicitAny."

## Known pitfalls

> Things that have bitten people. "Don't run migrations locally against prod DB, the staging credential is confusingly named." "The auth module has a silent global state — don't import it twice."

## Do NOT touch

> Files or directories that should only be edited with approval. Generated code, legacy compat shims, auth boundary files, anything with a "danger zone" label.
