---
description: Archive a completed spec change and merge its specs into the canonical specs directory
argument-hint: [change slug]
---

Archive the completed change folder **$ARGUMENTS** from `openspec/changes/` into `openspec/archive/`, and merge its final `spec.md` into the canonical `openspec/specs/` tree.

**Pre-archive checklist (block archive if any fails):**

1. All tasks in `tasks.md` are checked.
2. The change has been merged into main (or is on a green PR).
3. The full test suite passes.
4. The spec's scenarios have corresponding tests (verify by cross-referencing).
5. Any TODO / FIXME introduced by this change has a linked follow-up.

**Merge rules for `openspec/specs/`:**

- New capabilities go in a new file named after the capability.
- Amendments to existing capabilities append a `## Changes` section at the bottom of the existing spec file, dated and linked to the change folder.
- If the new spec contradicts an existing one, **stop** and surface the conflict to the user — don't silently resolve.

After archive, update the project changelog if one exists.
