# Project instructions

> This file is the **project-level layer** for Claude Code. It should stay short and specific.
>
> Purpose:
> - give Claude the minimum repo context it needs to work safely
> - make every project answer the same critical questions
> - avoid dumping long design docs or generic rules here
>
> Do **not** copy the global user rules into this file. Only write things that are unique to this repo.

## 1. What this project is

> Fill this in with 3-6 lines, not a giant intro.
>
> Answer:
> - what the project does
> - who uses it
> - main stack / runtime
> - whether this is production code, internal tooling, experiment, or legacy system

## 2. How to run and verify

> Replace this with the real commands. If a command does not exist, say so explicitly.

```bash
# install
# run dev
# run tests
# lint / format
# build / package (if applicable)
```

## 3. Important paths

> List only the paths Claude should care about first.
>
> Good examples:
> - `src/...` core app logic
> - `api/...` request handlers
> - `docs/...` active design docs
> - `scripts/...` operational helpers
> - `tests/...` or colocated test pattern

## 4. Current priorities

> What matters right now?
>
> Examples:
> - stabilize onboarding flow
> - refactor auth without changing behavior
> - ship v0.3 admin import
> - reduce flaky tests in payments

## 5. Repo-specific conventions

> Only write deviations from the global rules.
>
> Examples:
> - tests are colocated with source
> - this repo uses tabs
> - do not introduce barrel exports
> - prefer feature folders over layer folders

## 6. Guardrails / do-not-touch

> Name files, directories, or boundaries that require extra caution.
>
> Examples:
> - generated code
> - migration history
> - billing / auth boundaries
> - legacy compatibility shims
> - infrastructure files that should only change with review

## 7. Known pitfalls

> Short bullets only. Use this for traps that waste time or cause damage.
>
> Examples:
> - a misleading environment variable name
> - a cache layer that masks stale reads
> - tests that require a local service
> - a script that looks safe but mutates production data

## Writing standard

>- Keep this file short: target ~40-80 lines.
>- Prefer bullets over essays.
>- If something becomes long-lived reference material, move it to `docs/` and link it.
>- If a section is unknown, write `TODO` rather than fake detail.
>- A sparse but honest file is better than a polished lie.
