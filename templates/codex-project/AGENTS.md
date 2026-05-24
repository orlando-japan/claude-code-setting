# Project instructions

> This file is the project-level layer for Codex. Keep it short and specific.
>
> Purpose:
> - give Codex the minimum repo context it needs to work safely
> - make every project answer the same critical questions
> - avoid dumping long design docs or generic rules here
>
> Do not copy the global user rules into this file. Only write things unique to this repo.

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
> This section is required for Codex target completeness checks.

```bash
# install
# run dev
# run tests
# lint / format
# build / package (if applicable)
```

## 3. Important paths

> List only the paths Codex should care about first.
> This section is required so Codex can quickly anchor on the repo's real working surface.

## 4. Current priorities

> What matters right now?
> This section is required so Codex does not optimize for stale or generic priorities.

## 5. Repo-specific conventions

> Only write deviations from the global rules.

## 6. Guardrails / do-not-touch

> Name files, directories, or boundaries that require extra caution.
> This section is required for Codex target completeness checks.

## 7. Known pitfalls

> Short bullets only. Use this for traps that waste time or cause damage.

## Writing standard

- Keep this file short: target ~40-80 lines.
- Prefer bullets over essays.
- If something becomes long-lived reference material, move it to `docs/` and link it.
- If a section is unknown, write `TODO` rather than fake detail.
- A sparse but honest file is better than a polished lie.
