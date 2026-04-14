---
description: Execute the tasks in an approved spec change folder
argument-hint: [change slug, defaults to most recent]
---

Execute the implementation tasks from the spec change folder: **$ARGUMENTS** (or the most recently modified folder under `openspec/changes/` if no argument).

**Rules:**

- Work tasks in the order listed in `tasks.md`.
- For each task: read its verification line first. Know what "done" means before you start.
- Run the verification immediately after implementing. Don't batch and verify at the end.
- Check off tasks in `tasks.md` as they complete — edit the file, don't just claim it in chat.
- If a task reveals the spec is wrong, **stop**. Don't silently fix the spec. Surface the discrepancy to the user and ask whether to update the spec before continuing.
- Follow the four coding principles (think first, simple, surgical, goal-driven). Don't expand scope beyond what tasks specify.
- Commit per logical task group, not per file. Reference the change slug in the commit message.

When all tasks are checked, run the full test suite and report. Don't run `/spec:archive` yourself — the user does that after review.
