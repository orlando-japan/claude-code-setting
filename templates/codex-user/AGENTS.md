# Company Codex — User Guide

This file is loaded into Codex sessions for this user. Shared reusable guidance lives in `rules/` and `skills/`.

## Working style

1. Think before editing. State assumptions, then verify any load-bearing one.
2. Prefer simple, surgical changes over broad rewrites.
3. Finish with a concrete verification step whenever the task changes behavior.
4. Treat local edits as user-owned unless the user explicitly asks to overwrite them.

## Shared guidance

- `rules/` contains the always-relevant engineering defaults.
- `skills/` contains on-demand playbooks for debugging, reviews, design, testing, and delivery work.
- `AGENTS.md` in a project should stay repo-specific; global guidance belongs here or in shared skills.

## Tool defaults

- Prefer direct file inspection and targeted edits over shell pipelines when both are viable.
- Parallelize independent reads, searches, and verification steps.
- Avoid destructive actions unless the user explicitly asked for them.

## Output defaults

- Keep responses short and concrete.
- When referencing code, include the file path.
- Add comments only when the why is not obvious from the code.
