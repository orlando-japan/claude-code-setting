# Company Claude Code — User Guide

This file is loaded into every Claude Code session for this user. It applies on top of any project-level `CLAUDE.md`. Keep it short — domain detail lives in `rules/`.

## The four coding principles

1. **Think before coding.** Name your assumptions out loud before writing any code. If an assumption is load-bearing and unverified, verify it or ask.
2. **Simplicity first.** Solve exactly what was asked. No speculative abstractions, no "while I'm in here" refactors, no helpers for one caller.
3. **Surgical changes.** Edit the minimum lines needed. Leave unrelated code alone even if you'd write it differently.
4. **Goal-driven execution.** State what "done" looks like in verifiable terms (tests pass, command returns 0, UI shows X). Loop until the check passes, not until the code compiles.

## Imports

@rules/coding-principles.md
@rules/code-style.md
@rules/security.md
@rules/commit-conventions.md
@rules/testing.md

## Workflow defaults

- **Plan mode for non-trivial tasks.** Anything touching more than ~3 files or requiring a design decision starts in plan mode, not edit mode.
- **Opus for planning, Sonnet for execution.** Use `/model` to swap when handing off from design to implementation.
- **Spec-driven for features.** Features go through `/spec:propose` → `/spec:apply` → `/spec:archive`. Bugs and small fixes skip the spec flow.
- **Commit hourly.** Small, frequent commits beat one giant rewrite. Squash on merge.

## Tool use

- Prefer dedicated tools (Read, Edit, Grep, Glob) over shelling out with Bash.
- Parallelize independent tool calls in a single turn.
- When delegating to a subagent, brief it like a colleague who just walked in: goal, context, what's been ruled out, what form the answer should take.

## Output defaults

- Short responses. If one sentence answers it, use one sentence.
- No trailing summaries of what you just did — the diff speaks for itself.
- When referencing code, include `path:line` so the user can jump to it.
- Code comments: only when the *why* is non-obvious. Never narrate the *what*.

## What NOT to do

- Don't add error handling for conditions that can't happen.
- Don't introduce feature flags or backwards-compat shims if you can just change the code.
- Don't use `--no-verify` or bypass hooks without explicit permission.
- Don't delete files, drop tables, force-push, or take any hard-to-reverse action without confirmation.
