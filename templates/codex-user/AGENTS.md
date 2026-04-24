# Company Codex — User Guide

This file is loaded into Codex sessions for this user. Shared reusable guidance lives in `rules/` and `skills/`.

## The four coding principles

1. **Think before coding.** Name your assumptions out loud before writing any code. If an assumption is load-bearing and unverified, verify it or ask.
2. **Simplicity first.** Solve exactly what was asked. No speculative abstractions, no "while I'm in here" refactors, no helpers for one caller.
3. **Surgical changes.** Edit the minimum lines needed. Leave unrelated code alone even if you'd write it differently.
4. **Goal-driven execution.** State what "done" looks like in verifiable terms (tests pass, command returns 0, UI shows X). Loop until the check passes, not until the code compiles.

## Imports

@rules/coding-principles.md
@rules/code-style.md
@rules/security.md
@rules/error-handling.md
@rules/observability.md
@rules/commit-conventions.md
@rules/testing.md

## Workflow defaults

- **Plan before touching more than ~3 files.** State the approach and what "done" looks like before editing.
- **One logical change at a time.** Feature + unrelated refactor = two separate tasks.
- **Reproduce before fixing.** For bugs: write a failing reproduction first, then fix, then confirm it's gone.
- **Commit frequently.** Small, frequent commits beat one giant rewrite. Squash on merge.

## Tool defaults

- Prefer direct file inspection and targeted edits over shell pipelines when both are viable.
- Parallelize independent reads, searches, and verification steps.
- Avoid destructive shell commands (`rm -rf`, `git reset --hard`, force push) unless explicitly asked.

## Output defaults

- Short responses. If one sentence answers it, use one sentence.
- When referencing code, include the file path and line number.
- Add comments only when the *why* is not obvious from the code. Never narrate the *what*.
- No trailing summaries of what you just did — the diff speaks for itself.

## What NOT to do

- Don't add error handling for conditions that can't happen.
- Don't introduce abstractions or helpers with only one caller.
- Don't silently fix unrelated bugs — mention them and ask first.
- Don't delete files, drop tables, or take hard-to-reverse actions without confirmation.
- Don't use `--no-verify` or bypass git hooks without explicit permission.
